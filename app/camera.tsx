import { Pressable, SafeAreaView, Text, View } from '@/src/tw';
import { Image } from '@/src/tw/image';
import { CameraType, CameraView, FlashMode, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, type LayoutChangeEvent, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addFood } from '../db/dao';
import { processFoodImage, processMealImage } from '../utils/ai';
import { setPendingScannedLogMealItems } from '@/src/log-food-session';

const CAMERA_DEBUG_PREFIX = '[Camera]';
const AI_UPLOAD_MAX_DIMENSION = 1600;
const PROCESSING_MESSAGES = [
  'ASKING THE ROBOT WHAT YOU ATE...',
  'DOING EXTREMELY SERIOUS SNACK SCIENCE...',
  'INTERROGATING THE PIXELS...',
  'COUNTING CHAOS CALORIES...',
];
const PROCESSING_MESSAGE_ROTATION_MS = 3200;
const PROCESSING_TYPEWRITER_STEP_MS = 40;

export default function CameraScreen() {
  const router = useRouter();
  const { mode, source, nameHint, brandHint, returnParams } = useLocalSearchParams<{
    mode: 'meal' | 'label' | 'auto';
    source?: 'manual-entry' | 'log-meal';
    nameHint?: string;
    brandHint?: string;
    returnParams?: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessageIndex, setProcessingMessageIndex] = useState(0);
  const [displayedProcessingMessage, setDisplayedProcessingMessage] = useState('');
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [headerSideWidth, setHeaderSideWidth] = useState(96);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scannerTitle = mode === 'label' ? 'LABEL SCANNER' : mode === 'auto' ? 'AUTO SCANNER' : 'MEAL SCANNER';
  const shellBackground = isDark ? '#000000' : '#FFFFFF';
  const shellBorder = isDark ? '#FFFFFF' : '#000000';
  const shellText = isDark ? '#FFFFFF' : '#000000';
  const controlBackground = isDark ? '#FFFFFF' : '#000000';
  const controlText = isDark ? '#000000' : '#FFFFFF';

  useEffect(() => {
    if (!isProcessing) {
      setProcessingMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setProcessingMessageIndex((current) => (current + 1) % PROCESSING_MESSAGES.length);
    }, PROCESSING_MESSAGE_ROTATION_MS);

    return () => clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) {
      setDisplayedProcessingMessage('');
      return;
    }

    const nextMessage = PROCESSING_MESSAGES[processingMessageIndex];
    let characterIndex = 0;
    setDisplayedProcessingMessage('');

    const interval = setInterval(() => {
      characterIndex += 1;
      setDisplayedProcessingMessage(nextMessage.slice(0, characterIndex));

      if (characterIndex >= nextMessage.length) {
        clearInterval(interval);
      }
    }, PROCESSING_TYPEWRITER_STEP_MS);

    return () => clearInterval(interval);
  }, [isProcessing, processingMessageIndex]);

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

  const manualEntryReturnParams = (() => {
    if (typeof returnParams !== 'string' || !returnParams.trim()) return {};

    try {
      const parsed = JSON.parse(returnParams);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch (error) {
      console.warn(`${CAMERA_DEBUG_PREFIX} failed to parse manual entry return params`, error);
      return {};
    }
  })();

  const pushToManualEntry = (result: any) => {
    const servingSuggestions = asServingSuggestions(result);
    router.replace({
      pathname: '/manual-entry',
      params: {
        ...manualEntryReturnParams,
        name: result?.name || '',
        cals: asMetricString(result?.calories_per_100g),
        pro: asMetricString(result?.protein_per_100g),
        car: asMetricString(result?.carbs_per_100g),
        fat: asMetricString(result?.fats_per_100g),
        aiServings: JSON.stringify(servingSuggestions),
      },
    });
  };

  const handleCancel = () => {
    if (source === 'manual-entry') {
      router.replace({
        pathname: '/manual-entry',
        params: manualEntryReturnParams,
      });
      return;
    }

    router.back();
  };

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 justify-center" style={{ backgroundColor: shellBackground }}>
        <Text className="font-mono text-center mb-4" style={{ color: shellText }}>WE NEED CAMERA ACCESS TO SCAN FOOD AND LABELS.</Text>
        <Text className="font-mono text-center mb-5 mx-8" style={{ color: shellText }}>
          IF YOU USE AI SCANS, THE CAPTURED IMAGE CAN GO STRAIGHT TO YOUR SELECTED AI PROVIDER.
        </Text>
        <Pressable className="p-4 mx-10 items-center" onPress={requestPermission} style={{ backgroundColor: controlBackground }}>
          <Text className="font-mono font-black" style={{ color: controlText }}>GRANT ACCESS</Text>
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
      setProcessingMessageIndex(Math.floor(Math.random() * PROCESSING_MESSAGES.length));
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
      const result =
        mode === 'meal'
          ? await processMealImage({
              base64Image: normalizedPhoto.base64,
              nameHint: typeof nameHint === 'string' ? nameHint : undefined,
              brandHint: typeof brandHint === 'string' ? brandHint : undefined,
            })
          : await processFoodImage({
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

      if (mode === 'meal') {
        console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} AI returned meal result`, {
          itemCount: result.items.length,
          itemNames: result.items.map((item) => item.name),
        });

        if (result.items.length === 0) {
          Alert.alert('SCAN FAILED', "COULDN'T SEPARATE THAT MEAL. TRY ANOTHER SHOT.");
          setCapturedImageUri(null);
          setIsProcessing(false);
          return;
        }

        setPendingScannedLogMealItems(result.items);
        setCapturedImageUri(null);
        setIsProcessing(false);

        if (source === 'log-meal') {
          console.log(`${CAMERA_DEBUG_PREFIX} ${captureId} returning scanned meal items to log flow`);
          router.back();
          return;
        }

        router.replace('/log-food');
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
    <View className="flex-1" style={{ backgroundColor: shellBackground }}>
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
        className="flex-1 bg-transparent"
        edges={['top']}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      >
        <View className="px-5 pt-4">
          <View className="px-4 py-3 flex-row items-center" style={{ backgroundColor: shellBackground, borderColor: shellBorder, borderWidth: 2 }}>
            <Pressable
              onPress={handleCancel}
              onLayout={(event: LayoutChangeEvent) => setHeaderSideWidth(Math.ceil(event.nativeEvent.layout.width))}
              disabled={isProcessing}
              className={isProcessing ? 'opacity-50' : ''}
            >
              <Text className="font-mono text-sm font-bold" style={{ color: shellText }}>[ CANCEL ]</Text>
            </Pressable>

            <View className="flex-1 items-center justify-center px-2">
              <Text className="font-mono text-base font-black text-center" style={{ color: shellText }} numberOfLines={1}>
                {scannerTitle}
              </Text>
            </View>

            <View style={{ width: headerSideWidth }} />
          </View>
        </View>

        <View className="flex-1 justify-center px-5">
          <View className="self-center w-60 h-60 relative">
            <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4" style={{ borderColor: shellBorder }} />
            <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4" style={{ borderColor: shellBorder }} />
            <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4" style={{ borderColor: shellBorder }} />
            <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4" style={{ borderColor: shellBorder }} />
          </View>
        </View>

        <View className="border-t-4" style={{ backgroundColor: shellBackground, borderColor: shellBorder, paddingBottom: Math.max(insets.bottom, 16) }}>
          <View className="px-5 pt-5">
            {isProcessing ? (
              <View testID="camera-processing-state" className="items-center pt-5 pb-3 min-h-36">
                <ActivityIndicator testID="camera-processing-spinner" size="small" color={shellText} />
                <View className="mt-4 h-16 justify-start items-center px-2">
                  <Text className="font-mono text-lg font-black text-center leading-6" style={{ color: shellText }}>
                    {displayedProcessingMessage}
                    {displayedProcessingMessage.length < PROCESSING_MESSAGES[processingMessageIndex].length ? '|' : ''}
                  </Text>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => setFlashMode((current) => (current === 'off' ? 'on' : 'off'))}
                  className="px-4 py-3 min-w-24"
                  style={{ backgroundColor: controlBackground }}
                  disabled={isProcessing}
                >
                  <Text className="font-mono text-xs font-black text-center" style={{ color: controlText }}>FLASH</Text>
                  <Text className="font-mono text-sm font-black text-center mt-1" style={{ color: controlText }}>
                    {flashMode === 'on' ? 'ON' : 'OFF'}
                  </Text>
                </Pressable>

                <Pressable
                  testID="capture-photo-cta"
                  className="w-22 h-22 rounded-full border-4 justify-center items-center"
                  style={{ borderColor: shellBorder, backgroundColor: shellBackground }}
                  onPress={handleCapture}
                >
                  <View className="w-14 h-14 rounded-full" style={{ backgroundColor: controlBackground }} />
                </Pressable>

                <Pressable
                  onPress={() => setCameraFacing((current) => (current === 'back' ? 'front' : 'back'))}
                  className="px-4 py-3 min-w-24"
                  style={{ backgroundColor: controlBackground }}
                  disabled={isProcessing}
                >
                  <Text className="font-mono text-xs font-black text-center" style={{ color: controlText }}>CAMERA</Text>
                  <Text className="font-mono text-sm font-black text-center mt-1" style={{ color: controlText }}>FLIP</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
