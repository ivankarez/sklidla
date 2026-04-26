import { Pressable, SafeAreaView, Text, View } from '@/src/tw';
import { Image } from '@/src/tw/image';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { addFood } from '../db/dao';
import { processFoodImage } from '../utils/ai';

const CAMERA_DEBUG_PREFIX = '[Camera]';
const AI_UPLOAD_MAX_DIMENSION = 1600;

export default function CameraScreen() {
  const router = useRouter();
  const processingMessages = ['THINKING...', 'ONE SEC...', 'READING THAT NOW...'];
  const { mode, source, nameHint, brandHint } = useLocalSearchParams<{
    mode: 'meal' | 'label' | 'auto';
    source?: string;
    nameHint?: string;
    brandHint?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState(processingMessages[0]);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const toPositiveNumber = (value: unknown): number | null => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  };

  const asMetricString = (value: unknown): string => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return '0';
    return numeric.toString();
  };

  const asMetricNumber = (value: unknown): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return numeric;
  };

  const asServingSuggestions = (result: any): { name: string; weight: number }[] => {
    const explicit = Array.isArray(result?.serving_sizes)
      ? result.serving_sizes
          .map((item: any) => {
            const name = typeof item?.name === 'string' ? item.name.trim() : '';
            const weight = toPositiveNumber(item?.weight_g);
            if (!name || !weight) return null;
            return { name, weight };
          })
          .filter((item: { name: string; weight: number } | null): item is { name: string; weight: number } => item !== null)
      : [];
    if (explicit.length > 0) return explicit.slice(0, 3);

    const suggestions: { name: string; weight: number }[] = [];
    const servingSizeGrams = toPositiveNumber(result?.serving_size_g);
    if (servingSizeGrams) {
      suggestions.push({ name: 'serving', weight: servingSizeGrams });
    }

    const estimatedWeight = toPositiveNumber(result?.estimated_weight_g);
    if (estimatedWeight && !suggestions.some((item) => item.weight === estimatedWeight)) {
      suggestions.push({ name: 'portion', weight: estimatedWeight });
    }
    return suggestions;
  };

  const pushToManualEntry = (result: any) => {
    const servingSuggestions = asServingSuggestions(result);
    router.replace({
      pathname: '/manual-entry',
      params: {
        name: result?.name || '',
        cals: asMetricString(result?.calories_per_100g),
        pro: asMetricString(result?.protein_per_100g),
        car: asMetricString(result?.carbs_per_100g),
        fat: asMetricString(result?.fats_per_100g),
        aiServings: JSON.stringify(servingSuggestions),
      },
    });
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-center">
        <Text className="font-mono text-center mb-4 text-white">WE NEED CAMERA ACCESS TO SCAN FOOD AND LABELS.</Text>
        <Text className="font-mono text-center mb-5 mx-8 text-white">
          IF YOU USE AI SCANS, THE CAPTURED IMAGE CAN GO STRAIGHT TO YOUR SELECTED AI PROVIDER.
        </Text>
        <Pressable className="bg-white p-4 mx-10 items-center" onPress={requestPermission}>
          <Text className="font-mono font-black text-black">GRANT ACCESS</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const captureId = `capture-${Date.now()}`;
    try {
      console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} capture started`, {
        mode,
        source,
        hasNameHint: typeof nameHint === 'string' && nameHint.trim().length > 0,
        hasBrandHint: typeof brandHint === 'string' && brandHint.trim().length > 0,
      });
      setProcessingMessage(processingMessages[Math.floor(Math.random() * processingMessages.length)]);
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 1, shutterSound: false });
      if (!photo?.uri) throw new Error('No image data');
      console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} photo captured`, {
        hasUri: Boolean(photo.uri),
        width: photo.width,
        height: photo.height,
      });
      setCapturedImageUri(photo.uri);

      const longestSide = Math.max(photo.width ?? 0, photo.height ?? 0);
      const resizeAction =
        longestSide > AI_UPLOAD_MAX_DIMENSION
          ? photo.width && photo.height
            ? photo.width >= photo.height
              ? [{ resize: { width: AI_UPLOAD_MAX_DIMENSION } }]
              : [{ resize: { height: AI_UPLOAD_MAX_DIMENSION } }]
            : [{ resize: { width: AI_UPLOAD_MAX_DIMENSION } }]
          : [];

      console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} preparing resized upload`, {
        longestSide,
        targetMaxDimension: AI_UPLOAD_MAX_DIMENSION,
        willResize: resizeAction.length > 0,
      });

      const normalizedPhoto = await manipulateAsync(photo.uri, resizeAction, {
        base64: true,
        compress: 0.8,
        format: SaveFormat.JPEG,
      });
      if (!normalizedPhoto.base64) throw new Error('No resized image data');

      console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} resized image ready`, {
        width: normalizedPhoto.width,
        height: normalizedPhoto.height,
        imageBase64Length: normalizedPhoto.base64.length,
      });

      console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} sending image to AI`);
      const result = await processFoodImage({
        base64Image: normalizedPhoto.base64,
        nameHint: typeof nameHint === 'string' ? nameHint : undefined,
        brandHint: typeof brandHint === 'string' ? brandHint : undefined,
      });
      
      if (!result) {
        console.warn(`${CAMERA_DEBUG_PREFIX} ${captureId} AI returned no result`);
        setCapturedImageUri(null);
        setIsProcessing(false);
        return;
      }

      console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} AI returned result`, {
        detectionType: result.detection_type,
        name: result.name,
        estimatedWeight: result.estimated_weight_g,
        servingCount: Array.isArray(result.serving_sizes) ? result.serving_sizes.length : 0,
      });

      if (source === 'manual-entry') {
        console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} navigating back to manual entry`);
        pushToManualEntry(result);
        return;
      }

      if (mode !== 'label') {
        const tempName = result.name || 'SCANNED MEAL';
        const foodId = await addFood({
          name: tempName,
          brand: 'AI VISION',
          calories_per_100g: asMetricNumber(result.calories_per_100g),
          protein_per_100g: asMetricNumber(result.protein_per_100g),
          carbs_per_100g: asMetricNumber(result.carbs_per_100g),
          fats_per_100g: asMetricNumber(result.fats_per_100g),
        });

        console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} navigating to verification`, {
          foodId,
          foodName: tempName,
        });
        router.replace({ 
          pathname: '/verification', 
          params: { 
            foodId: foodId.toString(), 
            foodName: tempName, 
            cals: asMetricString(result.calories_per_100g), 
            pro: asMetricString(result.protein_per_100g), 
            car: asMetricString(result.carbs_per_100g), 
            fat: asMetricString(result.fats_per_100g),
            initialWeight: asMetricString(result.estimated_weight_g || 100)
          } 
        });
      } else {
        // Label Mode
        console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} navigating to manual entry for label result`);
        router.replace({
          pathname: '/manual-entry',
          params: {
            name: result.name || '',
            cals: asMetricString(result.calories_per_100g),
            pro: asMetricString(result.protein_per_100g),
            car: asMetricString(result.carbs_per_100g),
            fat: asMetricString(result.fats_per_100g),
            aiServingName: 'serving',
            aiServingWeight: asMetricString(result.serving_size_g || 100),
          }
        });
      }

    } catch (e) {
      console.error(`${CAMERA_DEBUG_PREFIX} ${captureId} capture failed`, e);
      Alert.alert('CAPTURE ERROR', "COULDN'T READ THAT. TRY AGAIN.");
      setCapturedImageUri(null);
      setIsProcessing(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        facing={cameraFacing}
        flash={flashMode}
        enableTorch={flashMode === 'on'}
        ref={cameraRef}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      {capturedImageUri && (
        <Image
          source={capturedImageUri}
          className="absolute top-0 right-0 bottom-0 left-0"
          contentFit="cover"
        />
      )}

      <SafeAreaView
        className="flex-1 bg-transparent justify-between p-5"
        edges={['top', 'bottom']}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <View className="flex-row justify-between items-center">
          <Pressable onPress={() => router.back()} className="bg-white px-2.5 py-1.5">
            <Text className="font-mono text-sm font-black text-black">ABORT</Text>
          </Pressable>
          <Text className="font-mono text-base font-black text-white bg-black px-2.5 py-1.5">
            {mode === 'label' ? 'LABEL SCANNER' : mode === 'auto' ? 'AUTO SCANNER' : 'MEAL SCANNER'}
          </Text>
          <Pressable
            onPress={() => setCameraFacing((current) => (current === 'back' ? 'front' : 'back'))}
            className="bg-white px-2.5 py-1.5"
            disabled={isProcessing}
          >
            <Text className="font-mono text-sm font-black text-black">FLIP</Text>
          </Pressable>
        </View>

        <View className="self-center w-60 h-60 relative">
          <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white" />
          <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white" />
          <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white" />
          <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white" />
        </View>

        <View className="self-center flex-row gap-2.5 mb-4">
          <Pressable
            onPress={() => setFlashMode((current) => (current === 'off' ? 'on' : 'off'))}
            className="bg-white px-3 py-2"
            disabled={isProcessing}
          >
            <Text className="font-mono text-sm font-black text-black">
              FLASH {flashMode === 'on' ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
        </View>

        {isProcessing ? (
          <View className="self-center bg-white p-5 mb-6">
            <Text className="font-mono text-xl font-black text-black">{processingMessage}</Text>
          </View>
        ) : (
          <Pressable
            testID="capture-photo-cta"
            className="self-center w-20 h-20 rounded-full bg-white justify-center items-center mb-6"
            onPress={handleCapture}
          >
            <View className="w-17.5 h-17.5 rounded-full border-4 border-black" />
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}
