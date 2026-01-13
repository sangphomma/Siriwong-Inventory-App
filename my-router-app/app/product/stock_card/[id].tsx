import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  TouchableOpacity, SafeAreaView 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../../constants/Config';
import { useAuth } from '../../../contexts/AuthContext';

export default function StockCardScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // นี่คือ Document ID ที่ส่งมาจากหน้า List
  const { token } = useAuth();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchStockCardData();
  }, [id]);

  const fetchStockCardData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. ดึงข้อมูลสินค้า
      const prodRes = await fetch(`${API_URL}/products/${id}`, { headers });
      const prodJson = await prodRes.json();
      setProductInfo(prodJson.data);

      // 2. ดึงประวัติ Transaction
      // ✅ แก้ไข: ใช้ filters[product][documentId] เพื่อให้ตรงกับ ID ที่รับมา
      const query = [
        `filters[product][documentId][$eq]=${id}`, 
        `populate[action_by][fields][0]=username`,
        `populate[location][fields][0]=name`,
        `sort=createdAt:desc`, 
        `pagination[limit]=100` 
      ].join('&');

      const transRes = await fetch(`${API_URL}/transactions?${query}`, { headers });
      const transJson = await transRes.json();
      setTransactions(transJson.data || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'in': return 'arrow-down-circle'; // รับเข้า
      case 'out': return 'arrow-up-circle'; // จ่ายออก
      case 'adjust': return 'construct'; // ปรับยอด
      default: return 'time';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'in': return '#10b981'; // เขียว
      case 'out': return '#ef4444'; // แดง
      case 'adjust': return '#f59e0b'; // ส้ม
      default: return '#64748b';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { 
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>ประวัติสินค้า (Stock Card)</Text>
        <View style={{width: 24}} />
      </View>

      {/* Product Info */}
      <View style={styles.infoCard}>
        <Text style={styles.prodName}>{productInfo?.name}</Text>
        <Text style={styles.prodCode}>Code: {productInfo?.documentId?.slice(0,8)}...</Text>
        <View style={styles.stockSummary}>
            <Text style={{color: '#64748b'}}>หน่วย: {productInfo?.unit || 'ชิ้น'}</Text>
        </View>
      </View>

      {/* Timeline List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => (
          <View style={styles.timelineItem}>
            {/* Left: Icon & Line */}
            <View style={styles.timelineLeft}>
               <View style={styles.line} />
               <Ionicons name={getIcon(item.type)} size={28} color={getColor(item.type)} style={styles.icon} />
            </View>

            {/* Right: Content */}
            <View style={styles.card}>
               <View style={styles.rowBetween}>
                  <Text style={[styles.typeBadge, { color: getColor(item.type) }]}>
                    {item.type === 'in' ? 'รับเข้า (+)' : item.type === 'out' ? 'จ่ายออก (-)' : 'ปรับปรุงยอด'}
                  </Text>
                  <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
               </View>
               
               <Text style={styles.docNo}>เอกสาร: {item.doc_no || '-'}</Text>
               
               <View style={styles.detailRow}>
                  <Text style={styles.amount}>
                    {item.type === 'out' ? '-' : '+'}{item.amount}
                  </Text>
                  <View style={{flex:1, marginLeft: 15}}>
                    <Text style={styles.location}>📍 {item.location?.name || 'ไม่ระบุ'}</Text>
                    <Text style={styles.user}>👤 โดย: {item.action_by?.username || 'System'}</Text>
                  </View>
               </View>

               {item.remark && <Text style={styles.remark}>"{item.remark}"</Text>}
            </View>
          </View>
        )}
        ListEmptyComponent={
            <View style={styles.center}>
                <Ionicons name="documents-outline" size={40} color="#cbd5e1" />
                <Text style={{color: '#94a3b8', marginTop: 10}}>ยังไม่มีประวัติการเคลื่อนไหว</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  
  infoCard: { padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginBottom: 10 },
  prodName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  prodCode: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  stockSummary: { marginTop: 10, flexDirection: 'row', gap: 15 },

  timelineItem: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { width: 40, alignItems: 'center', marginRight: 10 },
  line: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#e2e8f0', zIndex: -1 },
  icon: { backgroundColor: '#f8fafc', marginTop: 15 }, 

  card: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  typeBadge: { fontWeight: 'bold', fontSize: 14 },
  date: { fontSize: 12, color: '#94a3b8' },
  docNo: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  
  detailRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8 },
  amount: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  location: { fontSize: 13, color: '#475569', fontWeight: '500' },
  user: { fontSize: 12, color: '#64748b' },
  
  remark: { marginTop: 8, fontStyle: 'italic', color: '#64748b', fontSize: 12 }
});