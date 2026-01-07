import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router'; // เพิ่ม useRouter, useSegments
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '../hooks/use-color-scheme';
import { AuthProvider, useAuth } from '../contexts/AuthContext'; // เพิ่ม useAuth

SplashScreen.preventAutoHideAsync();

// สร้าง Component แยกออกมาเพื่อใช้ Hook useAuth ได้
function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (isLoading) return;

    // ตรวจสอบว่าผู้ใช้อยู่ในกลุ่มหน้า (tabs) หรือไม่
    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      // ถ้าไม่มี User และพยายามเข้าหน้า Tabs ให้ส่งไปหน้า Login
      router.replace('/login');
    } else if (user && segments[0] === 'login') {
      // ถ้ามี User แล้วแต่ยังอยู่ที่หน้า Login ให้ส่งไปหน้าหลัก
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}