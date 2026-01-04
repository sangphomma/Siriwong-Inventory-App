import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Import hooks และ AuthContext (ใช้ path แบบนี้ถูกต้องแล้วครับ)
import { useColorScheme } from '../hooks/use-color-scheme';
import { AuthProvider } from './contexts/AuthContext'; 

// สั่งให้ Splash Screen ค้างไว้ก่อน จนกว่าเราจะสั่งปิด
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // *** จุดที่แก้: ลบโค้ด useFonts ออกไปเลย เพราะเราไม่มีไฟล์ฟอนต์ ***

  useEffect(() => {
    // สั่งปิดหน้าจอโหลด (Splash Screen) ทันทีที่เปิดแอป
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
          {/* หน้า Login */}
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}