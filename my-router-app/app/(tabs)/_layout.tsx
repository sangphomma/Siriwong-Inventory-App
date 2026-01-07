import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// นำเข้า useAuth จาก Path ที่ถูกต้องตามโครงสร้างของคุณ
import { useAuth } from '../../contexts/AuthContext'; 

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // ตรวจสอบสถานะการล็อกอิน
  useEffect(() => {
    if (!isLoading && !user) {
      // ถ้าโหลดเสร็จแล้วพบว่าไม่มีข้อมูลผู้ใช้ ให้ดีดไปหน้า login
      router.replace('/login');
    }
  }, [user, isLoading]);

  // ขณะที่กำลังเช็กสถานะ (Loading) ให้แสดงวงกลมหมุนๆ แทนหน้าจอว่างเปล่า
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </View>
    );
  }

  // ถ้าไม่มี user ไม่ต้อง render tabs (เพื่อความปลอดภัย)
  if (!user) return null;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        // ปรับแต่งสไตล์ Tab Bar เล็กน้อยสำหรับ iOS/Android
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'หน้าหลัก',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'รายการสินค้า',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}