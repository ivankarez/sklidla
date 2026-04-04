import { useState, useRef } from 'react';
import { Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, Pressable } from '@/src/tw';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { processFoodImage } from '../utils/ai';
import { addFood } from '../db/dao';

export default function CameraScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: 'meal' | 'label' }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

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
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (!photo?.base64) throw new Error('No image data');

      const result = await processFoodImage(photo.base64, mode);
      
      if (!result) {
        setIsProcessing(false);
        return;
      }

      if (mode === 'meal') {
        const tempName = result.name || 'AI LOG (TEMP)';
        const foodId = await addFood({
          name: tempName,
          brand: 'AI VISION',
          calories_per_100g: parseFloat(result.calories_per_100g) || 0,
          protein_per_100g: parseFloat(result.protein_per_100g) || 0,
          carbs_per_100g: parseFloat(result.carbs_per_100g) || 0,
          fats_per_100g: parseFloat(result.fats_per_100g) || 0,
        });

        router.replace({ 
          pathname: '/verification', 
          params: { 
            foodId, 
            foodName: tempName, 
            cals: result.calories_per_100g, 
            pro: result.protein_per_100g, 
            car: result.carbs_per_100g, 
            fat: result.fats_per_100g,
            initialWeight: result.estimated_weight_g || 100
          } 
        });
      } else {
        // Label Mode
        router.replace({
          pathname: '/manual-entry',
          params: {
            name: result.name || '',
            cals: result.calories_per_100g,
            pro: result.protein_per_100g,
            car: result.carbs_per_100g,
            fat: result.fats_per_100g,
          }
        });
      }

    } catch (e) {
      console.error(e);
      Alert.alert('CAPTURE ERROR', 'FAILED TO ACQUIRE TARGET.');
      setIsProcessing(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView className="flex-1" facing="back" ref={cameraRef}>
        <SafeAreaView className="flex-1 bg-transparent justify-between p-5" edges={['top', 'bottom']}>
          
          <View className="flex-row justify-between items-center">
            <Pressable onPress={() => router.back()} className="bg-white px-2.5 py-1.5">
              <Text className="font-mono text-sm font-black text-black">ABORT</Text>
            </Pressable>
            <Text className="font-mono text-base font-black text-white bg-black px-2.5 py-1.5">
              {mode === 'meal' ? 'MEAL SCANNER' : 'LABEL SCANNER'}
            </Text>
            <View className="w-15" />
          </View>

          <View className="self-center w-60 h-60 relative">
            <View className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white" />
            <View className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white" />
            <View className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white" />
            <View className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white" />
          </View>

          {isProcessing ? (
            <View className="self-center bg-white p-5 mb-7.5">
              <Text className="font-mono text-xl font-black text-black">AI IS THINKING...</Text>
            </View>
          ) : (
            <Pressable className="self-center w-20 h-20 rounded-full bg-white justify-center items-center mb-7.5" onPress={handleCapture}>
              <View className="w-17.5 h-17.5 rounded-full border-4 border-black" />
            </Pressable>
          )}

        </SafeAreaView>
      </CameraView>
    </View>
  );
}
