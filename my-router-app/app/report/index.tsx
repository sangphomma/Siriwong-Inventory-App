import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ReportMenuScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 ศูนย์รวมรายงาน</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>เลือกประเภทรายงานที่ต้องการ</Text>

        {/* เมนู 1: รายการเบิกจ่ายอุปกรณ์ */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/report/inventory_report')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="cube" size={30} color="#3b82f6" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>รายการเบิกจ่ายอุปกรณ์</Text>
            <Text style={styles.menuDesc}>ประวัติการเบิกด่วน, ใบเบิก และรับคืนสินค้า</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        {/* เมนู 2: รายการเบิกจ่ายเงินสดย่อย */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/report/petty_cash_report')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#f5f3ff' }]}>
            <Ionicons name="cash" size={30} color="#8b5cf6" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>รายการเบิกจ่ายเงินสดย่อย</Text>
            <Text style={styles.menuDesc}>ประวัติการเบิกเงินสด และตรวจสอบหลักฐานบิล</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 14, color: '#64748b', marginBottom: 20, fontWeight: '600' },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  iconBox: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  menuDesc: { fontSize: 13, color: '#64748b' }
});