import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TechnicianView({ user }: { user: any }) {
  const router = useRouter();

  return (
    <ScrollView style={styles.content}>
        
        {/* Banner ต้อนรับช่าง */}
        <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>สวัสดี, ช่าง {user?.username}</Text>
            <Text style={styles.subText}>วันนี้ต้องการเบิกอุปกรณ์อะไรไหมครับ?</Text>
        </View>

        {/* เมนูหลัก (ของช่าง มีแค่ 2 ปุ่มใหญ่ๆ) */}
        <Text style={styles.sectionTitle}>เมนูการใช้งาน</Text>
        <View style={styles.menuContainer}>
            <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#4f46e5' }]} onPress={() => router.push('/product/withdraw' as any)}>
                <Ionicons name="cart" size={40} color="white" />
                <Text style={styles.menuBtnText}>ขอเบิกสินค้า</Text>
                <Text style={styles.menuBtnSub}>สร้างใบคำขอ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#f59e0b' }]} onPress={() => router.push('/product/list' as any)}>
                <Ionicons name="search" size={40} color="white" />
                <Text style={styles.menuBtnText}>เช็คสต็อก</Text>
                <Text style={styles.menuBtnSub}>ค้นหาอุปกรณ์</Text>
            </TouchableOpacity>
        </View>

        {/* อาจจะเพิ่มรายการ "คำขอเบิกของฉัน" ในอนาคตตรงนี้ */}
        <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={24} color="#00796B" />
            <Text style={{marginLeft: 10, color: '#00796B'}}>
                หากหาของไม่เจอ กรุณาติดต่อ Store หรือ Foreman
            </Text>
        </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 20 },
  welcomeCard: { backgroundColor: '#00796B', padding: 20, borderRadius: 15, marginBottom: 20 },
  welcomeText: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  subText: { color: 'rgba(255,255,255,0.9)', marginTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  menuContainer: { flexDirection: 'row', gap: 15, marginBottom: 30 },
  menuBtn: { flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', height: 140, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  menuBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginTop: 10 },
  menuBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2F1', padding: 15, borderRadius: 10 }
});