import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  RefreshControl, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageRequestsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ดึงข้อมูลเฉพาะที่ Pending
  const fetchPendingRequests = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const query = [
        `filters[request_status][$eq]=pending`,
        `populate[items][populate]=product`, 
        `populate[request_by][fields][0]=username`,
        `populate[project_site][fields][0]=name`,
        `sort=createdAt:desc`
      ].join('&');
      
      const res = await fetch(`${API_URL}/withdrawal-requests?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setRequests(json.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchPendingRequests();
    }, [fetchPendingRequests])
  );

  const getDisplayName = (obj: any, type: 'user' | 'site') => {
    if (!obj) return "ไม่ระบุ";
    if (type === 'user') return obj.username || "ไม่ระบุชื่อ";
    if (type === 'site') return obj.name || "ไม่ระบุไซท์";
    return "-";
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายการรออนุมัติ ({requests.length})</Text>
        <View style={{width: 24}} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => (item.documentId || item.id).toString()}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPendingRequests} />}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            // ลิงก์ไปหน้าตัดสต็อกที่เราทำเสร็จแล้ว
            onPress={() => router.push(`/product/request_detail/${item.documentId || item.id}` as any)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.jobNo}>{item.job_no}</Text>
              <View style={styles.badge}>
                 <Text style={styles.badgeText}>รออนุมัติ</Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
               <Ionicons name="person" size={14} color="#64748b" />
               <Text style={styles.infoText}>{getDisplayName(item.request_by, 'user')}</Text>
            </View>
            <View style={styles.infoRow}>
               <Ionicons name="business" size={14} color="#64748b" />
               <Text style={styles.infoText}>{getDisplayName(item.project_site, 'site')}</Text>
            </View>

            <View style={styles.divider} />
            
            <View style={styles.footerRow}>
               <Text style={styles.itemCount}>📦 {item.items?.length || 0} รายการ</Text>
               <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('th-TH')}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>ไม่มีรายการค้างอนุมัติ</Text>
              <Text style={styles.emptySubText}>ทุกอย่างเรียบร้อยดีครับ!</Text>
            </View>
          ) : (
            <ActivityIndicator size="large" color="#4f46e5" style={{ marginTop: 20 }} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  jobNo: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badge: { backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#c2410c', fontSize: 10, fontWeight: 'bold' },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoText: { fontSize: 14, color: '#475569', marginLeft: 8 },
  
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemCount: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  dateText: { fontSize: 12, color: '#94a3b8' },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { marginTop: 15, fontSize: 16, fontWeight: 'bold', color: '#64748b' },
  emptySubText: { marginTop: 5, fontSize: 14, color: '#94a3b8' }
});