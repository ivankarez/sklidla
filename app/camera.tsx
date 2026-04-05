import { Pressable, SafeAreaView, Text, View } from '@/src/tw';
import { Image } from '@/src/tw/image';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { addFood } from '../db/dao';
import { processFoodImage } from '../utils/ai';

export default function CameraScreen() {
  const router = useRouter();
  const processingMessages = ["I'M THINKING...", 'PROCESSING, BEEP-BOOP...', 'ON IT, FAM'];
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
        <Text className="font-mono text-center mb-5 text-white">We need your permission to show the camera</Text>
        <Pressable className="bg-white p-4 mx-10 items-center" onPress={requestPermission}>
          <Text className="font-mono font-black text-black">GRANT ACCESS</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      setProcessingMessage(processingMessages[Math.floor(Math.random() * processingMessages.length)]);
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 1, shutterSound: false });
      if (!photo?.base64) throw new Error('No image data');
      setCapturedImageUri(photo.uri);
      await cameraRef.current.pausePreview();

      const result = await processFoodImage({
        base64Image: photo.base64,
        nameHint: typeof nameHint === 'string' ? nameHint : undefined,
        brandHint: typeof brandHint === 'string' ? brandHint : undefined,
      });
      
      if (!result) {
        await cameraRef.current.resumePreview();
        setCapturedImageUri(null);
        setIsProcessing(false);
        return;
      }

      if (source === 'manual-entry') {
        pushToManualEntry(result);
        return;
      }

      if (mode !== 'label') {
        const tempName = result.name || 'AI LOG (TEMP)';
        const foodId = await addFood({
          name: tempName,
          brand: 'AI VISION',
          calories_per_100g: asMetricNumber(result.calories_per_100g),
          protein_per_100g: asMetricNumber(result.protein_per_100g),
          carbs_per_100g: asMetricNumber(result.carbs_per_100g),
          fats_per_100g: asMetricNumber(result.fats_per_100g),
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
      console.error(e);
      Alert.alert('CAPTURE ERROR', 'FAILED TO ACQUIRE TARGET.');
      if (cameraRef.current) {
        await cameraRef.current.resumePreview();
      }
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
          <Pressable className="self-center w-20 h-20 rounded-full bg-white justify-center items-center mb-6" onPress={handleCapture}>
            <View className="w-17.5 h-17.5 rounded-full border-4 border-black" />
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}
