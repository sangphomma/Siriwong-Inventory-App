import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  RefreshControl, TouchableOpacity 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../constants/Config';

export default function ManageReturnsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Populate ข้อมูลที่จำเป็น: ใครคืน? ไซท์ไหน?
      const query = `populate[return_by][fields][0]=username&populate[project_site][fields][0]=name&sort=createdAt:desc`;
      
      const response = await fetch(`${API_URL}/return-requests?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      setRequests(json.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchReturns();
    }, [fetchReturns])
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'approved': return '#166534'; // เขียว
      case 'rejected': return '#991b1b'; // แดง
      default: return '#c2410c'; // ส้ม (pending)
    }
  };

  const getStatusBg = (status: string) => {
    switch(status) {
      case 'approved': return '#f0fdf4';
      case 'rejected': return '#fef2f2';
      default: return '#fff7ed';
    }
  };

  // Helper สำหรับดึงค่า (ป้องกัน Error เหมือนเดิม)
  const getValue = (item: any, key: string) => item[key] !== undefined ? item[key] : (item.attributes?.[key] || '');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{padding: 5}}>
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการการรับคืนของ (Returns)</Text>
        <View style={{width: 30}} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => (item.id || item.documentId).toString()}
        renderItem={({ item }) => {
          const status = getValue(item, 'return_status');
          return (
            <TouchableOpacity 
              style={styles.card}
              // เดี๋ยวเราจะไปสร้างหน้า Detail กันต่อครับ
              onPress={() => router.push(`/product/approve_return/${item.documentId || item.id}` as any)}
            >
              <View style={styles.row}>
                <Text style={styles.jobNo}>{getValue(item, 'job_no')}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusBg(status) }]}>
                  <Text style={{ color: getStatusColor(status), fontSize: 12, fontWeight: 'bold' }}>
                    {status}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color="#64748b" />
                <Text style={styles.infoText}>ผู้คืน: {getValue(getValue(item, 'return_by'), 'username') || 'ไม่ระบุ'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#64748b" />
                <Text style={styles.infoText}>ไซท์: {getValue(getValue(item, 'project_site'), 'name') || 'ไม่ระบุ'}</Text>
              </View>

              <Text style={styles.dateText}>📅 {new Date(getValue(item, 'createdAt')).toLocaleDateString('th-TH')}</Text>
            </TouchableOpacity>
          );
        }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchReturns} />}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>ไม่มีรายการคืนของ</Text> : <ActivityIndicator color="#f59e0b" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: 'white' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  jobNo: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoText: { color: '#475569', fontSize: 14 },
  dateText: { marginTop: 8, fontSize: 12, color: '#94a3b8', textAlign: 'right' },
  empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});