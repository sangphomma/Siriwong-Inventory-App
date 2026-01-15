import React, { useState } from 'react'; // ✅ เพิ่ม useState
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ReportMenuScreen() {
  const router = useRouter();
  
  // ✅ State สำหรับควบคุม Modal การเลือก
  const [showInventoryOptions, setShowInventoryOptions] = useState(false);

  // ✅ ฟังก์ชันเมื่อกดเลือกเมนูย่อย
  const handleSelectOption = (type: 'history' | 'stock') => {
      setShowInventoryOptions(false);
      if (type === 'history') {
          router.push('/report/inventory_report' as any); // ไปหน้าเดิม
      } else {
          router.push('/report/stock_custom_report' as any); // ไปหน้าใหม่
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 ศูนย์รวมรายงาน</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>เลือกประเภทรายงานที่ต้องการ</Text>

        {/* เมนู 1: ปรับแก้ onPress เพื่อเปิด Modal */}
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => setShowInventoryOptions(true)} // ✅ เปลี่ยนตรงนี้
        >
          <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="cube" size={30} color="#3b82f6" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>รายงานสินค้าและอุปกรณ์</Text>
            <Text style={styles.menuDesc}>ประวัติการเบิกจ่าย และ สต็อกคงเหลือ</Text> 
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>

        {/* ... เมนูอื่นๆ (Petty Cash, Stock Audit) เหมือนเดิม ... */}
        {/* ... (Copy โค้ดส่วน Petty Cash และ Audit อันเดิมมาวางต่อตรงนี้) ... */}
        
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/report/petty_cash_report' as any)}
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

        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/report/stock_balance_report' as any)}
        >
          <View style={[styles.iconBox, { backgroundColor: '#fdf2f8' }]}>
            <Ionicons name="scale" size={30} color="#db2777" />
          </View>
          <View style={styles.menuInfo}>
            <Text style={styles.menuTitle}>รายงานความผิดพลาดสต็อก</Text>
            <Text style={styles.menuDesc}>ตรวจสอบประวัติการปรับยอด (Audit)</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>

      </ScrollView>

      {/* ✅ Modal เลือกประเภทรายงาน (วางไว้ก่อนปิด SafeAreaView) */}
      <Modal visible={showInventoryOptions} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => setShowInventoryOptions(false)}>
              <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                      <Text style={styles.modalHeader}>เลือกรูปแบบรายงาน</Text>
                      
                      <TouchableOpacity style={styles.optionBtn} onPress={() => handleSelectOption('history')}>
                          <View style={[styles.miniIcon, {backgroundColor:'#eff6ff'}]}>
                              <Ionicons name="time" size={24} color="#3b82f6" />
                          </View>
                          <View>
                              <Text style={styles.optionTitle}>ประวัติการเบิก-จ่าย</Text>
                              <Text style={styles.optionSub}>ดูไทม์ไลน์การเบิก ของเข้า/ออก (แบบเดิม)</Text>
                          </View>
                      </TouchableOpacity>

                      <View style={styles.divider} />

                      <TouchableOpacity style={styles.optionBtn} onPress={() => handleSelectOption('stock')}>
                          <View style={[styles.miniIcon, {backgroundColor:'#f0fdf4'}]}>
                              <Ionicons name="list" size={24} color="#16a34a" />
                          </View>
                          <View>
                              <Text style={styles.optionTitle}>รายงานยอดสต็อก (Custom)</Text>
                              <Text style={styles.optionSub}>ดูยอดคงเหลือ เลือกหมวดหมู่ พิมพ์ PDF</Text>
                          </View>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInventoryOptions(false)}>
                          <Text style={{color:'#64748b'}}>ยกเลิก</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

// ✅ เพิ่ม Styles ใหม่สำหรับ Modal
const styles = StyleSheet.create({
  // ... styles เดิม ...
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 14, color: '#64748b', marginBottom: 20, fontWeight: '600' },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  iconBox: { width: 56, height: 56, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  menuInfo: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  menuDesc: { fontSize: 13, color: '#64748b' },

  // Styles ใหม่
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', borderRadius: 20, padding: 20, elevation: 5 },
  modalHeader: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#1e293b' },
  optionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  miniIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  optionSub: { fontSize: 12, color: '#888' },
  divider: { height: 1, backgroundColor: '#f1f5f9' },
  cancelBtn: { marginTop: 15, alignItems: 'center', padding: 10 }
});