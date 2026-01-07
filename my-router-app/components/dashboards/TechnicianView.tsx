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
      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/product/create_request')}>
          <Ionicons name="add-circle" size={32} color="#6366f1" />
          <Text style={styles.menuTitle}>สร้างใบเบิก</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuCard} 
          // ⭐ แก้ไขจาก my_request เป็น my_requests (เติม s)
          onPress={() => router.push('/product/my_requests' as any)}
        >
          <Ionicons name="time" size={32} color="#0ea5e9" />
          <Text style={styles.menuTitle}>ประวัติของฉัน</Text>
        </TouchableOpacity>
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