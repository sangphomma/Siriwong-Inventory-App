import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface TechnicianProps {
  token: string | null;
}

export default function TechnicianView({ token }: TechnicianProps) {
  const router = useRouter();
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>เมนูสำหรับช่าง 🛠️</Text>
      
      {/* --- แถวที่ 1: เมนูเดิม --- */}
      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/product/create_request')}>
          <Ionicons name="add-circle" size={32} color="#6366f1" />
          <Text style={styles.menuTitle}>สร้างใบเบิก</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/product/my_requests' as any)}
        >
          <Ionicons name="time" size={32} color="#0ea5e9" />
          <Text style={styles.menuTitle}>ประวัติของฉัน</Text>
        </TouchableOpacity>
      </View>

      {/* --- แถวที่ 2: เมนูใหม่ (คืนของ) --- */}
      {/* เพิ่ม marginTop 15 ให้ห่างจากแถวบนนิดหน่อย */}
      <View style={[styles.menuGrid, { marginTop: 15 }]}>
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/product/create_return' as any)}
        >
          {/* ใช้ไอคอนสีส้ม ให้ดูแตกต่างว่าเป็นของเข้า */}
          <Ionicons name="return-down-back" size={32} color="#f59e0b" />
          <Text style={styles.menuTitle}>คืนของเข้า Store</Text>
        </TouchableOpacity>

        {/* ⭐ กล่องเปล่า (Dummy Box) เพื่อรักษาทรงให้ปุ่มซ้ายขนาดเท่าเดิม */}
        <View style={[styles.menuCard, { backgroundColor: 'transparent', elevation: 0 }]} />
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 20 },
  menuGrid: { flexDirection: 'row', gap: 15 },
  menuCard: { 
    flex: 1, 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 15, 
    alignItems: 'center',
    elevation: 2
  },
  menuTitle: { marginTop: 10, fontWeight: 'bold', color: '#475569' }
});