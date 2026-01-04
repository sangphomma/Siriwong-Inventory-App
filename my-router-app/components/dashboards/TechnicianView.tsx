import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// รับ props 'user' มาจากหน้า index
export default function TechnicianView({ user }: { user: any }) {
  const router = useRouter();

  return (
    <ScrollView style={styles.content}>
        
        {/* Banner ต้อนรับช่าง */}
        <View style={styles.welcomeCard}>
            <View>
                <Text style={styles.welcomeText}>สวัสดี, ช่าง {user?.username} 👋</Text>
                <Text style={styles.subText}>วันนี้ต้องการเบิกอุปกรณ์อะไรไหมครับ?</Text>
            </View>
            {/* ไอคอนตกแต่ง */}
            <Ionicons name="construct-outline" size={40} color="rgba(255,255,255,0.8)" />
        </View>

        {/* เมนูหลัก */}
        <Text style={styles.sectionTitle}>เมนูการใช้งาน</Text>
        <View style={styles.menuContainer}>
            
            {/* 🛒 ปุ่ม 1: ขอเบิกสินค้า (ลิงก์ไปหน้าใหม่ create_request) */}
            <TouchableOpacity 
                style={[styles.menuBtn, { backgroundColor: '#4f46e5' }]} 
                onPress={() => router.push('/product/create_request' as any)}
            >
                <Ionicons name="cart" size={40} color="white" />
                <Text style={styles.menuBtnText}>ขอเบิกสินค้า</Text>
                <Text style={styles.menuBtnSub}>สร้างใบคำขอ</Text>
            </TouchableOpacity>

            {/* 🔍 ปุ่ม 2: เช็คสต็อก */}
            <TouchableOpacity 
                style={[styles.menuBtn, { backgroundColor: '#f59e0b' }]} 
                onPress={() => router.push('/product/list' as any)}
            >
                <Ionicons name="search" size={40} color="white" />
                <Text style={styles.menuBtnText}>เช็คสต็อก</Text>
                <Text style={styles.menuBtnSub}>ค้นหาอุปกรณ์</Text>
            </TouchableOpacity>

            {/* 🕒 ปุ่ม 3: ประวัติการเบิก (เพิ่มใหม่) */}
            <TouchableOpacity 
                style={[styles.menuBtn, { backgroundColor: '#0ea5e9' }]} // สีฟ้า
                onPress={() => router.push('/product/my_requests')}
            >
                <Ionicons name="time" size={40} color="white" />
                <Text style={styles.menuBtnText}>ประวัติการเบิก</Text>
                <Text style={styles.menuBtnSub}>ติดตามสถานะ</Text>
            </TouchableOpacity>
        </View>

        {/* กล่องข้อความช่วยเหลือ */}
        <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color="#00796B" />
            <Text style={styles.infoText}>
                หากหาของไม่เจอ กรุณาติดต่อ Store หรือ Foreman
            </Text>
        </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 20 },
  welcomeCard: { 
    backgroundColor: '#00796B', padding: 25, borderRadius: 16, marginBottom: 25,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#00796B', shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
  },
  welcomeText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  subText: { color: 'rgba(255,255,255,0.9)', marginTop: 5, fontSize: 14 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  
  menuContainer: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  menuBtn: { 
    flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', height: 140, 
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 
  },
  menuBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginTop: 10 },
  menuBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', padding: 15, borderRadius: 12 },
  infoText: { marginLeft: 10, color: '#00695C', fontSize: 13, flex: 1 }
});