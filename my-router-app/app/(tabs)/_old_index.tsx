import React, { useState, useCallback, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../constants/Config';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth(); // ดึง isLoading มาด้วย
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // 🛡️ ระบบป้องกัน: ถ้าไม่ได้ล็อกอิน ให้ดีดไปหน้า Login ทันที
  useEffect(() => {
    if (!isLoading && !user) {
      // ใช้ replace เพื่อไม่ให้กด Back กลับมาหน้านี้ได้
      router.replace('/login');
    }
  }, [user, isLoading]);

  useFocusEffect(
    useCallback(() => {
      // โหลดข้อมูลเฉพาะตอนที่มี User แล้วเท่านั้น
      if (user) {
        loadDashboardData();
      }
    }, [user])
  );

  const loadDashboardData = async () => {
    try {
      const resProducts = await fetch(`${API_URL}/products?pagination[pageSize]=1000`);
      const jsonProducts = await resProducts.json();
      const products = jsonProducts.data || [];

      const totalStock = products.reduce((sum: number, item: any) => sum + (item.stock || 0), 0);
      const lowStockCount = products.filter((item: any) => item.stock <= 5).length;

      setStats({
        totalProducts: products.length,
        totalStock: totalStock,
        lowStockCount: lowStockCount
      });

      const resOrders = await fetch(`${API_URL}/withdrawal-orders?sort=createdAt:desc&pagination[limit]=5&populate[withdrawal_items][populate]=product`);
      const jsonOrders = await resOrders.json();
      setRecentOrders(jsonOrders.data || []);

    } catch (error) {
      console.log("Dashboard Error:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // 👋 ฟังก์ชันออกจากระบบ (ปรับปรุงใหม่)
  const handleLogout = () => {
    Alert.alert("ออกจากระบบ", "คุณต้องการออกจากระบบใช่หรือไม่?", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ออก", style: "destructive", onPress: async () => {
            await logout(); // 1. ล้างข้อมูล
            router.replace('/login'); // 2. สั่งย้ายหน้าไป Login
        }}
    ]);
  };

  // ถ้ากำลังโหลด หรือยังไม่มี User (กำลังจะถูกดีดไปหน้า Login) ให้โชว์จอว่างๆ หรือหมุนๆ ไปก่อน
  if (isLoading || !user) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#00796B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>สวัสดี, {user?.username} 👋</Text>
            <Text style={styles.headerSubtitle}>
                ตำแหน่ง: <Text style={{fontWeight: 'bold', color: '#00796B'}}>{user?.position}</Text>
            </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        
        {/* Stats */}
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

        {/* Menu */}
        <Text style={styles.sectionTitle}>เมนูหลัก</Text>
        <View style={styles.menuContainer}>
            
            <TouchableOpacity 
                style={[styles.menuBtn, { backgroundColor: '#4f46e5' }]}
                onPress={() => router.push('/product/withdraw' as any)}
            >
                <Ionicons name="cart" size={32} color="white" />
                <Text style={styles.menuBtnText}>เบิกสินค้า</Text>
                <Text style={styles.menuBtnSub}>ตัดสต็อก</Text>
            </TouchableOpacity>

            {/* 💣 ซ่อนปุ่มเพิ่มสินค้า ถ้าไม่ใช่ Owner/Store */}
            { (user?.position === 'owner' || user?.position === 'store_keeper') && (
                <TouchableOpacity 
                    style={[styles.menuBtn, { backgroundColor: '#0ea5e9' }]}
                    onPress={() => router.push('/product/add' as any)}
                >
                    <Ionicons name="add-circle" size={32} color="white" />
                    <Text style={styles.menuBtnText}>เพิ่มสินค้า</Text>
                    <Text style={styles.menuBtnSub}>รับของเข้า</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity 
                style={[styles.menuBtn, { backgroundColor: '#f59e0b' }]}
                onPress={() => router.push('/product/list' as any)}
            >
                <Ionicons name="list" size={32} color="white" />
                <Text style={styles.menuBtnText}>เช็คสต็อก</Text>
                <Text style={styles.menuBtnSub}>ดูรายการ</Text>
            </TouchableOpacity>
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>การเคลื่อนไหวล่าสุด</Text>
        {recentOrders.map((order) => (
            <View key={order.documentId || order.id} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                    <Ionicons name="time-outline" size={20} color="#666" />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.historyUser}>{order.user_name} เบิกสินค้า</Text>
                    <Text style={styles.historyDate}>{new Date(order.createdAt).toLocaleString('th-TH')}</Text>
                    <View style={{flexDirection:'row', flexWrap:'wrap', marginTop: 4}}>
                        {order.withdrawal_items?.map((item: any, index: number) => (
                            <Text key={index} style={styles.historyProductTag}>
                                {item.product?.name} x{item.amount}
                            </Text>
                        ))}
                    </View>
                </View>
            </View>
        ))}
        
        <View style={{height: 40}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { color: '#64748b', fontSize: 14, marginTop: 2 },
  logoutBtn: { padding: 10, backgroundColor: '#fee2e2', borderRadius: 50 },
  
  content: { flex: 1, padding: 20 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { width: '31%', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', marginVertical: 5, color: '#333' },
  statLabel: { fontSize: 12, color: '#666' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },

  menuContainer: { flexDirection: 'row', gap: 15, marginBottom: 30, flexWrap: 'wrap' },
  menuBtn: { minWidth: '30%', flex: 1, padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', height: 120, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  menuBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginTop: 10 },
  menuBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },

  historyItem: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'flex-start' },
  historyIcon: { width: 40, height: 40, backgroundColor: '#f1f5f9', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  historyUser: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  historyDate: { color: '#94a3b8', fontSize: 12 },
  historyProductTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 11, color: '#475569', marginRight: 5, marginTop: 2 }
});