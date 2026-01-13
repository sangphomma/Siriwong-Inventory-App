import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StockLocationMenuScreen() {
  const router = useRouter();

  const menus = [
    {
        title: "1. จัดการ Master จุดจัดเก็บ",
        sub: "สร้าง/ลบ ชื่อชั้นวาง หรือชื่อโซน (เช่น Shelf A, Zone B)",
        icon: "file-tray-stacked", // เปลี่ยนไอคอนให้สื่อความหมาย
        color: "#6366f1",
        route: "/product/stock_location/master" 
    },
    {
        title: "2. ลงทะเบียนสินค้าเข้าจุดเก็บ",
        sub: "จับคู่สินค้า ว่าไปวางไว้ที่จุดไหน จำนวนเท่าไหร่",
        icon: "location",
        color: "#06b6d4",
        route: "/product/stock_location/register"
    },
    {
        title: "3. โอนย้ายสินค้า",
        sub: "ย้ายของจากจุด A -> จุด B",
        icon: "swap-horizontal",
        color: "#8b5cf6",
        route: "/product/stock_location/transfer"
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
         <Text style={styles.title}>ระบบจัดการจุดจัดเก็บ (Location)</Text>
         <View style={{width: 24}} />
      </View>

      <View style={styles.content}>
        {menus.map((menu, index) => (
            <TouchableOpacity 
                key={index} 
                style={styles.card} 
                onPress={() => router.push(menu.route as any)}
            >
                <View style={[styles.iconBox, { backgroundColor: menu.color }]}>
                    <Ionicons name={menu.icon as any} size={28} color="white" />
                </View>
                <View style={styles.info}>
                    <Text style={styles.cardTitle}>{menu.title}</Text>
                    <Text style={styles.cardSub}>{menu.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  content: { padding: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 15, elevation: 3 },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  info: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardSub: { fontSize: 12, color: '#666' }
});