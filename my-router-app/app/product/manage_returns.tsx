import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  RefreshControl, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageReturnsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReturns = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // ดึงรายการที่ status = pending
      const query = [
        `filters[return_status][$eq]=pending`,
        `populate[items][populate]=product`, 
        `populate[return_by][fields][0]=username`,
        `populate[project_site][fields][0]=name`,
        `sort=createdAt:desc`
      ].join('&');
      
      const res = await fetch(`${API_URL}/return-requests?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setReturns(json.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchReturns();
    }, [fetchReturns])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#78350f" /></TouchableOpacity>
        <Text style={styles.headerTitle}>รายการรอรับคืน ({returns.length})</Text>
        <View style={{width: 24}} />
      </View>

      <FlatList
        data={returns}
        keyExtractor={(item) => (item.documentId || item.id).toString()}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchReturns} />}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card} 
            // ลิงก์ไปหน้า Detail ที่จะสร้างใน step ต่อไป
            onPress={() => router.push(`/product/return_detail/${item.documentId || item.id}` as any)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.jobNo}>{item.job_no}</Text>
              <View style={styles.badge}>
                 <Text style={styles.badgeText}>รอรับของ</Text>
              </View>
            </View>
            
            <Text style={styles.siteText}>🏗️ {item.project_site?.name || 'ไม่ระบุไซท์'}</Text>
            <Text style={styles.userText}>👤 คืนโดย: {item.return_by?.username || 'ไม่ระบุ'}</Text>

            <View style={styles.divider} />
            <View style={styles.footerRow}>
               <Text style={styles.itemCount}>📦 {item.items?.length || 0} รายการ</Text>
               <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString('th-TH')}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>ไม่มีรายการค้างรับคืน</Text> : <ActivityIndicator />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#78350f' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#d97706' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  jobNo: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badge: { backgroundColor: '#fff7ed', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#d97706', fontSize: 10, fontWeight: 'bold' },
  siteText: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  userText: { fontSize: 13, color: '#6b7280' },
  divider: { height: 1, backgroundColor: '#fff7ed', marginVertical: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemCount: { fontSize: 12, color: '#d97706', fontWeight: 'bold' },
  dateText: { fontSize: 12, color: '#9ca3af' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#9ca3af' }
});