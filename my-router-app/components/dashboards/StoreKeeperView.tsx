import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/contexts/AuthContext';
import { API_URL } from '../../constants/Config';

interface StoreKeeperProps {
  token?: string | null;
}

export default function StoreKeeperView({ token: propToken }: StoreKeeperProps) {
  const router = useRouter();
  const { token: authToken } = useAuth();
  const token = propToken || authToken;
  
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (token) fetchPendingRequests();
    }, [token])
  );

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      // ✅ ใช้ Query แบบเน้น populate ทุกอย่าง (เลิกใช้เครื่องหมาย * เพราะบางที Strapi งง)
      const query = `filters[request_status][$eq]=pending&populate=items.product&populate=request_by&populate=project_site&sort=createdAt:desc`;
      
      const res = await fetch(`${API_URL}/withdrawal-requests?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      
      // ลอง Log ดูใน Terminal ว่ามีข้อมูลมาไหม
      console.log("Found Data Count:", json.data?.length);
      setRequests(json.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (item: any, status: 'approved' | 'rejected') => {
    const confirmMsg = status === 'approved' ? 'ยืนยันอนุมัติและตัดสต็อกสินค้า?' : 'ยืนยันการปฏิเสธใบเบิกนี้?';
    
    Alert.alert("ยืนยันรายการ", confirmMsg, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ตกลง", onPress: async () => {
          try {
            const res = await fetch(`${API_URL}/withdrawal-requests/${item.documentId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ data: { request_status: status } })
            });

            if (res.ok) {
              Alert.alert("สำเร็จ", status === 'approved' ? "อนุมัติและตัดสต็อกแล้ว" : "ปฏิเสธรายการแล้ว");
              fetchPendingRequests();
            }
          } catch (e) {
            Alert.alert("ผิดพลาด", "ไม่สามารถบันทึกได้");
          }
      }}
    ]);
  };

  // ✅ ฟังก์ชันช่วยดึงชื่อที่ "ขุด" เก่งที่สุด
  const getDisplayName = (obj: any) => {
    if (!obj) return null;
    // ขุดจากทุกที่: ชั้นนอก, ชั้น attributes หรือชั้นย่อยๆ
    return obj.username || obj.name || obj.attributes?.username || obj.attributes?.name || null;
  };

  const renderHeader = () => (
    <View style={styles.menuSection}>
      <Text style={styles.sectionTitle}>เมนูจัดการคลัง 🏗️</Text>
      <View style={styles.menuGrid}>
        <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#6366f1' }]} onPress={() => router.push('/product/withdraw')}>
          <Ionicons name="cart" size={24} color="white" />
          <Text style={styles.menuBtnText}>เบิกสินค้า</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => router.push('/product/add')}>
          <Ionicons name="add-circle" size={24} color="white" />
          <Text style={styles.menuBtnText}>เพิ่มสินค้า</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#f59e0b' }]} onPress={() => router.push('/product/list')}>
          <Ionicons name="list" size={24} color="white" />
          <Text style={styles.menuBtnText}>เช็คสต็อก</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionTitle, { marginTop: 25 }]}>รายการรออนุมัติ 📦</Text>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const requester = getDisplayName(item.request_by) || 'ช่าง (ไม่ระบุชื่อ)';
    const site = getDisplayName(item.project_site) || 'ไม่ระบุไซท์';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.jobNo}>{item.job_no}</Text>
          <Text style={styles.userName}>โดย: {requester}</Text>
        </View>
        <View style={styles.siteInfo}>
          <Ionicons name="location" size={16} color="#475569" />
          <Text style={styles.siteText}>ไซท์: {site}</Text>
        </View>
        <View style={styles.itemContainer}>
          {item.items?.map((li: any, i: number) => (
            <Text key={i} style={styles.itemText}>
              • {getDisplayName(li.product) || 'สินค้า'} x{li.qty_request}
            </Text>
          ))}
        </View>
        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleAction(item, 'rejected')}>
            <Text style={styles.btnTextRed}>❌ ปฏิเสธ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={() => handleAction(item, 'approved')}>
            <Text style={styles.btnTextGreen}>✅ อนุมัติ</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => (item.documentId || item.id).toString()}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPendingRequests} />}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>ไม่มีรายการค้างส่งครับ</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  menuSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  menuGrid: { flexDirection: 'row', gap: 10 },
  menuBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  menuBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginTop: 5 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jobNo: { fontWeight: 'bold', color: '#00796B', fontSize: 15 },
  userName: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  siteInfo: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  siteText: { fontSize: 14, color: '#475569' },
  itemContainer: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 12 },
  itemText: { fontSize: 14, color: '#334155' },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnReject: { backgroundColor: '#fee2e2' },
  btnApprove: { backgroundColor: '#dcfce7' },
  btnTextRed: { color: '#991b1b', fontWeight: 'bold' },
  btnTextGreen: { color: '#166534', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});