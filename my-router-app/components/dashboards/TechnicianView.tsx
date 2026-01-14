import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext'; 
// 1. เพิ่ม BASE_URL ตรง import
import { API_URL, BASE_URL } from '../../constants/Config';

interface TechnicianProps {
  token: string | null;
}

export default function TechnicianView({ token }: TechnicianProps) {
  const router = useRouter();
  const { user } = useAuth(); 

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>สวัสดีครับ, {user?.username} 👋</Text>
            <Text style={styles.subText}>พร้อมสำหรับการทำงานวันนี้หรือยัง?</Text>
        </View>

        {/* รูป Avatar (กดเพื่อไปหน้า Profile) */}
        <TouchableOpacity onPress={() => router.push('/profile' as any)}>
            {user?.avatar?.url ? (
                <Image 
                    // ✅ ใหม่: ใช้ BASE_URL
    source={{ uri: `${BASE_URL}${user.avatar.url}` }} 
    style={styles.avatar}
                />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={24} color="#94a3b8" />
                </View>
            )}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>เมนูจัดการสต็อก 🛠️</Text>
      
      {/* Grid เมนูหลัก */}
      <View style={styles.menuGrid}>
        {/* ปุ่มสร้างใบเบิก */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/product/create_request' as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
            <Ionicons name="add-circle" size={32} color="#6366f1" />
          </View>
          <Text style={styles.menuTitle}>สร้างใบเบิก</Text>
          <Text style={styles.menuDesc}>เบิกวัสดุ/อุปกรณ์</Text>
        </TouchableOpacity>

        {/* ปุ่มประวัติของฉัน */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/product/my_requests' as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="time" size={32} color="#0ea5e9" />
          </View>
          <Text style={styles.menuTitle}>ประวัติของฉัน</Text>
          <Text style={styles.menuDesc}>สถานะรายการเบิก</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.menuGrid, { marginTop: 15 }]}>
        {/* ปุ่มคืนของ */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/product/create_return' as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="return-down-back" size={32} color="#f59e0b" />
          </View>
          <Text style={styles.menuTitle}>คืนของเข้า Store</Text>
          <Text style={styles.menuDesc}>วัสดุเหลือใช้</Text>
        </TouchableOpacity>

        {/* Placeholder ว่างๆ (หรือใส่ 'เร็วๆ นี้') */}
        <TouchableOpacity 
           style={[styles.menuCard, { opacity: 0.5 }]}
           disabled={true}
        >
           <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
             <Ionicons name="construct" size={32} color="#94a3b8" />
           </View>
           <Text style={[styles.menuTitle, { color: '#94a3b8' }]}>เร็วๆ นี้</Text>
           <Text style={styles.menuDesc}>Feature ใหม่</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  
  headerSection: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 25, marginTop: 10 
  },
  greetingText: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  subText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  
  avatar: { 
    width: 50, height: 50, borderRadius: 25, 
    borderWidth: 2, borderColor: 'white', backgroundColor: '#f1f5f9' 
  },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'white'
  },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 15 },
  
  menuGrid: { flexDirection: 'row', gap: 15 },
  menuCard: { 
    flex: 1, backgroundColor: 'white', padding: 20, borderRadius: 16, 
    alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }
  },
  iconBox: {
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10
  },
  menuTitle: { fontWeight: 'bold', color: '#1e293b', fontSize: 16, marginBottom: 4 },
  menuDesc: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },
});