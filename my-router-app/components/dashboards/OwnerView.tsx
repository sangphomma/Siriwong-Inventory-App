import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';

// รับ props 'user' เข้ามาใช้
export default function OwnerView({ user }: { user: any }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalProducts: 0, totalStock: 0, lowStockCount: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => { loadDashboardData(); }, [])
  );

  const loadDashboardData = async () => {
    try {
      // ... (Logic การดึงข้อมูล API เหมือนเดิมเป๊ะ) ...
      const resProducts = await fetch(`${API_URL}/products?pagination[pageSize]=1000`);
      const jsonProducts = await resProducts.json();
      const products = jsonProducts.data || [];
      const totalStock = products.reduce((sum: any, item: any) => sum + (item.stock || 0), 0);
      const lowStockCount = products.filter((item: any) => item.stock <= 5).length;
      setStats({ totalProducts: products.length, totalStock: totalStock, lowStockCount: lowStockCount });

      const resOrders = await fetch(`${API_URL}/withdrawal-orders?sort=createdAt:desc&pagination[limit]=5&populate[withdrawal_items][populate]=product`);
      const jsonOrders = await resOrders.json();
      setRecentOrders(jsonOrders.data || []);
    } catch (error) { console.log("Error:", error); }
  };

  const onRefresh = async () => {
    setRefreshing(true); await loadDashboardData(); setRefreshing(false);
  };

  return (
    <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* ส่วน Stats */}
        <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: '#e0f2fe' }]}>
                <Ionicons name="cube-outline" size={24} color="#0284c7" />
                <Text style={styles.statNumber}>{stats.totalProducts}</Text>
                <Text style={styles.statLabel}>รายการสินค้า</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
                <Ionicons name="layers-outline" size={24} color="#16a34a" />
                <Text style={styles.statNumber}>{stats.totalStock}</Text>
                <Text style={styles.statLabel}>ของในคลัง</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
                <Text style={[styles.statNumber, { color: '#dc2626' }]}>{stats.lowStockCount}</Text>
                <Text style={styles.statLabel}>ของใกล้หมด</Text>
            </View>
        </View>

        {/* เมนูหลัก (ของ Owner มีปุ่มครบ!) */}
        <Text style={styles.sectionTitle}>เมนูหลัก (ผู้จัดการ)</Text>
        <View style={styles.menuContainer}>
            <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#4f46e5' }]} onPress={() => router.push('/product/withdraw' as any)}>
                <Ionicons name="cart" size={32} color="white" />
                <Text style={styles.menuBtnText}>เบิกสินค้า</Text>
            </TouchableOpacity>

            {/* ปุ่มเพิ่มสินค้า (ไม่ต้องซ่อนแล้ว เพราะไฟล์นี้ให้ Owner เห็นเท่านั้น) */}
            <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => router.push('/product/add' as any)}>
                <Ionicons name="add-circle" size={32} color="white" />
                <Text style={styles.menuBtnText}>เพิ่มสินค้า</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuBtn, { backgroundColor: '#f59e0b' }]} onPress={() => router.push('/product/list' as any)}>
                <Ionicons name="list" size={32} color="white" />
                <Text style={styles.menuBtnText}>เช็คสต็อก</Text>
            </TouchableOpacity>
        </View>

        {/* ประวัติ */}
        <Text style={styles.sectionTitle}>การเคลื่อนไหวล่าสุด</Text>
        {recentOrders.map((order) => (
            <View key={order.documentId || order.id} style={styles.historyItem}>
                <View style={styles.historyIcon}><Ionicons name="time-outline" size={20} color="#666" /></View>
                <View style={{flex: 1}}>
                    <Text style={styles.historyUser}>{order.user_name} เบิกสินค้า</Text>
                    <Text style={styles.historyDate}>{new Date(order.createdAt).toLocaleString('th-TH')}</Text>
                </View>
            </View>
        ))}
        <View style={{height: 40}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 20 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { width: '31%', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', marginVertical: 5, color: '#333' },
  statLabel: { fontSize: 12, color: '#666' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  menuContainer: { flexDirection: 'row', gap: 15, marginBottom: 30, flexWrap: 'wrap' },
  menuBtn: { minWidth: '30%', flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', height: 120, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  menuBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginTop: 10 },
  historyItem: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'flex-start' },
  historyIcon: { width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  historyUser: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  historyDate: { color: '#94a3b8', fontSize: 12 },
});