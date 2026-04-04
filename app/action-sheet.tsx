import { View, Text, Pressable } from '@/src/tw';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ActionSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleAction = (route: string) => {
    router.back();
    // Use setTimeout to allow modal dismiss animation to start
    setTimeout(() => {
      // @ts-ignore
      router.push(route);
    }, 100);
  };

  return (
    <View className="flex-1 justify-end">
      <Pressable className="absolute inset-0 bg-black/70" onPress={() => router.back()} />
      <View 
        className="bg-white pt-5 px-5 border-t-4 border-black" 
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <Text className="font-mono text-xl font-black text-black mb-5 text-center">SELECT LOG METHOD</Text>
        
        <Pressable className="bg-white border-2 border-black py-4 mb-2.5 items-center" onPress={() => handleAction('/camera?mode=meal')}>
          <Text className="font-mono text-base font-bold text-black">SNAP MEAL (AI)</Text>
        </Pressable>
        
        <Pressable className="bg-white border-2 border-black py-4 mb-2.5 items-center" onPress={() => handleAction('/camera?mode=label')}>
          <Text className="font-mono text-base font-bold text-black">SCAN LABEL (OCR)</Text>
        </Pressable>
        
        <Pressable className="bg-white border-2 border-black py-4 mb-2.5 items-center" onPress={() => handleAction('/library')}>
          <Text className="font-mono text-base font-bold text-black">SEARCH DB</Text>
        </Pressable>
        
        <Pressable className="bg-white border-2 border-black py-4 mb-2.5 items-center" onPress={() => handleAction('/manual-entry')}>
          <Text className="font-mono text-base font-bold text-black">MANUAL ENTRY</Text>
        </Pressable>

        <Pressable className="bg-black py-4 mt-2.5 items-center" onPress={() => router.back()}>
          <Text className="font-mono text-base font-bold text-white">ABORT</Text>
        </Pressable>
      </View>
    </View>
  );
}
