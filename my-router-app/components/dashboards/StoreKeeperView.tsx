import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Modal, TouchableWithoutFeedback, Image 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { BASE_URL } from '../../constants/Config';

interface StoreKeeperProps {
  token: string | null;
}

export default function StoreKeeperView({ token }: StoreKeeperProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [showTransMenu, setShowTransMenu] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* ⭐ ส่วน Header Greeting + Avatar */}
        <View style={styles.headerSection}>
            <View style={{ flex: 1 }}>
                <Text style={styles.greetingText}>สวัสดี, {user?.username} 📦</Text>
                <Text style={styles.subText}>ดูแลคลังสินค้าให้เรียบร้อยนะครับ</Text>
            </View>

            <TouchableOpacity onPress={() => router.push('/profile' as any)}>
                {user?.avatar?.url ? (
                    <Image 
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

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>เมนูหลัก 🏠</Text>
          
          <View style={styles.menuGrid}>
            
            {/* แถวที่ 1: ปุ่มใหญ่ 2 ปุ่มหลัก */}
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.menuBtn, { backgroundColor: '#4f46e5', flex: 1.5 }]} 
                onPress={() => setShowTransMenu(true)}
              >
                <Ionicons name="swap-horizontal" size={32} color="white" />
                <Text style={styles.menuBtnTextLarge}>จัดการเบิก-จ่าย</Text>
                <Text style={styles.menuBtnSubText}>(เบิก / อนุมัติ / คืน)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuBtn, { backgroundColor: '#f59e0b', flex: 1 }]} 
                onPress={() => router.push('/product/list' as any)}
              >
                <Ionicons name="cube" size={28} color="white" />
                <Text style={styles.menuBtnText}>เช็คสต็อก</Text>
              </TouchableOpacity>
            </View>

            {/* แถวที่ 2: จัดการระบบ */}
            <View style={[styles.row, { marginTop: 10 }]}>
              <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => router.push('/product/add' as any)}>
                <Ionicons name="add-circle" size={24} color="white" />
                <Text style={styles.menuBtnText}>เพิ่มสินค้า</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#8b5cf6' }]} onPress={() => router.push('/product/stock_location' as any)}>
                <Ionicons name="business" size={24} color="white" />
                <Text style={styles.menuBtnText}>จุดจัดเก็บ (Location)</Text>
              </TouchableOpacity>
            </View>

            {/* แถวที่ 3: รายงาน */}
            <View style={[styles.row, { marginTop: 10 }]}>
              <TouchableOpacity 
                style={[styles.menuBtn, { backgroundColor: '#64748b' }]} 
                onPress={() => router.push('/report' as any)}
              >
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                    <Ionicons name="stats-chart" size={24} color="white" />
                    <Text style={[styles.menuBtnText, {marginTop:0}]}>รายงานประวัติ & สรุปยอด (Report)</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ✅ แถวที่ 4: ตรวจนับสต็อก (ปุ่มใหม่ที่คุณต้องการ) */}
            <TouchableOpacity 
              style={{
                backgroundColor: 'white', 
                padding: 20, 
                borderRadius: 16, // ปรับให้มนเท่าปุ่มอื่น (16)
                alignItems: 'center', 
                marginTop: 15, // เว้นระยะห่างด้านบน
                elevation: 3,
                shadowColor: '#000', shadowOpacity: 0.1 // เพิ่มเงาให้ดูมีมิติ
              }}
              onPress={() => router.push('/product/balance_stock' as any)}
            >
              <Ionicons name="scale-outline" size={32} color="#db2777" />
              <Text style={{marginTop: 10, fontWeight: 'bold', color: '#333', fontSize: 16}}>
                ตรวจนับสต็อก (Balance)
              </Text>
              <Text style={{fontSize: 12, color: '#64748b', marginTop: 2}}>Audit ตรวจสอบความถูกต้องของสินค้า</Text>
            </TouchableOpacity>

          </View>
        </View>

      </ScrollView>

      {/* Modal เมนูย่อย (Transaction Menu) */}
      <Modal transparent visible={showTransMenu} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowTransMenu(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>จัดการเบิก-จ่าย 🛠️</Text>
                    
                    <TouchableOpacity 
                        style={[styles.subMenuBtn, {backgroundColor: '#e0f2fe'}]}
                        onPress={() => { setShowTransMenu(false); router.push('/product/withdraw' as any); }}
                    >
                        <View style={[styles.iconBox, {backgroundColor:'#0ea5e9'}]}>
                             <Ionicons name="cart" size={24} color="white" />
                        </View>
                        <View>
                            <Text style={styles.subMenuTitle}>เบิกสินค้า (หน้า Counter)</Text>
                            <Text style={styles.subMenuDesc}>ตัดสต็อกทันที สำหรับช่างมาเบิกหน้าร้าน</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.subMenuBtn, {backgroundColor: '#dcfce7'}]}
                        onPress={() => { 
                            setShowTransMenu(false); 
                            router.push('/product/manage_requests' as any); 
                        }}
                    >
                        <View style={[styles.iconBox, {backgroundColor:'#10b981'}]}>
                             <Ionicons name="clipboard" size={24} color="white" />
                        </View>
                        <View>
                            <Text style={styles.subMenuTitle}>อนุมัติใบเบิก (Approve)</Text>
                            <Text style={styles.subMenuDesc}>ตรวจสอบรายการที่ช่างขอเบิกผ่านแอป</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.subMenuBtn, {backgroundColor: '#fee2e2'}]}
                        onPress={() => { setShowTransMenu(false); router.push('/product/manage_returns' as any); }}
                    >
                        <View style={[styles.iconBox, {backgroundColor:'#ef4444'}]}>
                             <Ionicons name="return-down-back" size={24} color="white" />
                        </View>
                        <View>
                            <Text style={styles.subMenuTitle}>รับของคืน (Return)</Text>
                            <Text style={styles.subMenuDesc}>รับวัสดุเหลือใช้คืนเข้าสต็อก</Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeBtn} onPress={() => setShowTransMenu(false)}>
                        <Text style={styles.closeText}>ปิดเมนู</Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerSection: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 20, marginTop: 10 
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
  menuSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15, marginTop: 10 },
  menuGrid: { gap: 0 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  menuBtn: { flex: 1, paddingVertical: 20, paddingHorizontal: 10, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1 },
  menuBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold', marginTop: 8, textAlign: 'center' },
  menuBtnTextLarge: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  menuBtnSubText: { color: '#e0e7ff', fontSize: 11, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', borderRadius: 20, padding: 25, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 25, color: '#333' },
  subMenuBtn: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 12, marginBottom: 15 },
  iconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  subMenuTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  subMenuDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  closeBtn: { marginTop: 10, padding: 12, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10 },
  closeText: { color: '#64748b', fontWeight: 'bold' }
});