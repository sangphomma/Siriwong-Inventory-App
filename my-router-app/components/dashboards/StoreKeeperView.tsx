import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';

interface StoreKeeperProps {
  token: string | null;
}

export default function StoreKeeperView({ token }: StoreKeeperProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันดึงรายการใบเบิกที่ค้างอนุมัติ (Pending)
  const fetchPendingRequests = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // ⭐ ปรับ Query เพื่อดึงชื่อ Username และชื่อ Site ให้ถูกต้องสำหรับ Strapi v5
      const query = [
        `filters[request_status][$eq]=pending`,
        `populate[items][populate]=product`, 
        `populate[request_by][fields][0]=username`,
        `populate[project_site][fields][0]=name`,
        `sort=createdAt:desc`
      ].join('&');
      
      const res = await fetch(`${API_URL}/withdrawal-requests?${query}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      setRequests(json.data || []);
    } catch (error) {
      console.error("Fetch Pending Error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // โหลดข้อมูลใหม่ทุกครั้งที่หน้าจอนี้ถูกโฟกัส
  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
    }, [fetchPendingRequests])
  );

  // ⭐ ฟังก์ชันช่วยดึงชื่อแสดงผล (แก้ปัญหา "ไม่ระบุ")
  const getDisplayName = (obj: any, type: 'user' | 'site') => {
    if (!obj) return "ไม่ระบุ";
    
    // ตรวจสอบทั้งโครงสร้างปกติ และโครงสร้างแบบ attributes (Strapi v5)
    if (type === 'user') {
      return obj.username || obj.attributes?.username || "ไม่ระบุชื่อ";
    }
    if (type === 'site') {
      return obj.name || obj.attributes?.name || "ไม่ระบุไซท์";
    }
    return "ไม่ระบุ";
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
          <Text style={styles.menuBtnText}>สต็อก</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#10b981' }]} onPress={() => router.push('/product/manage_requests' as any)}>
          <Ionicons name="clipboard" size={24} color="white" />
          <Text style={styles.menuBtnText}>จัดการใบเบิก</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionTitle, { marginTop: 25 }]}>รายการรออนุมัติล่าสุด 📦</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => (item.documentId || item.id).toString()}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            onPress={() => router.push(`/product/approve/${item.documentId || item.id}` as any)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.jobNo}>{item.job_no || 'No Job No.'}</Text>
              <Text style={styles.userName}>👤 {getDisplayName(item.request_by, 'user')}</Text>
            </View>
            <Text style={styles.siteText}>📍 ไซท์: {getDisplayName(item.project_site, 'site')}</Text>
            
            <View style={styles.itemSummary}>
              <Text style={styles.itemCount}>📦 {item.items?.length || 0} รายการสินค้า</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>รออนุมัติ</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPendingRequests} />}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={50} color="#cbd5e1" />
              <Text style={styles.empty}>ไม่มีรายการค้างอนุมัติในขณะนี้</Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color="#00796B" style={{ marginTop: 20 }} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  menuSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  menuBtn: { width: '23.5%', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  menuBtnText: { color: 'white', fontSize: 10, fontWeight: 'bold', marginTop: 5 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jobNo: { fontWeight: 'bold', color: '#00796B', fontSize: 15 },
  userName: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  siteText: { fontSize: 13, color: '#475569', marginBottom: 10 },
  itemSummary: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, alignItems: 'center' },
  itemCount: { fontSize: 13, color: '#64748b' },
  statusBadge: { backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#ffedd5' },
  statusText: { fontSize: 11, color: '#c2410c', fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  empty: { textAlign: 'center', marginTop: 10, color: '#94a3b8', fontSize: 14 }
});