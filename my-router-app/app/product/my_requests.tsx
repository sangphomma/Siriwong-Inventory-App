import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  RefreshControl, TouchableOpacity, SafeAreaView 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext'; 
import { API_URL } from '../../constants/Config';

export default function MyRequestsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ⭐ ปรับปรุงฟังก์ชันการดึงข้อมูลให้รองรับทั้ง id และ documentId
  const fetchMyRequests = useCallback(async () => {
    if (!user || !token) return;

    try {
      setLoading(true);
      
      // ดึง ID ของผู้ใช้ปัจจุบัน
      const userId = user.id;
      
      // ⭐ ใช้ Query ที่รองรับการกรองผ่าน ID ของระบบสมาชิกโดยตรง
      const query = [
        `filters[request_by][id][$eq]=${userId}`,
        `populate[items][populate]=product`,
        `populate=project_site`,
        `sort=createdAt:desc`
      ].join('&');
      
      console.log("🔗 Fetching My Requests for User ID:", userId);
      
      const response = await fetch(`${API_URL}/withdrawal-requests?${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const json = await response.json();
      console.log("📦 Received Data Count:", json.data?.length || 0);
      setRequests(json.data || []);
    } catch (error) {
      console.error("🔥 Fetch MyRequests Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useFocusEffect(
    useCallback(() => {
      fetchMyRequests();
    }, [fetchMyRequests])
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return { bg: '#dcfce7', text: '#166534', label: 'อนุมัติแล้ว' };
      case 'rejected': return { bg: '#fee2e2', text: '#991b1b', label: 'ไม่อนุมัติ' };
      default: return { bg: '#fef9c3', text: '#854d0e', label: 'รอตรวจสอบ' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = getStatusStyle(item.request_status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.jobNo}>{item.job_no || 'No Job No.'}</Text>
            <Text style={styles.date}>
              📅 {new Date(item.createdAt).toLocaleDateString('th-TH')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#00796B" />
          <Text style={styles.infoText}>
            ไซท์: {item.project_site?.name || item.project_site?.attributes?.name || 'ไม่ระบุ'}
          </Text>
        </View>

        <View style={styles.itemsBox}>
          {item.items && item.items.map((subItem: any, index: number) => (
            <View key={index} style={styles.productLine}>
              <Text style={styles.productName} numberOfLines={1}>
                • {subItem.product?.name || subItem.product?.attributes?.name || 'สินค้าไม่มีชื่อ'}
              </Text>
              <Text style={styles.productQty}>
                x {subItem.qty_request || 0}
              </Text>
            </View>
          ))}
        </View>

        {item.note && (
          <View style={styles.noteSection}>
             <Text style={styles.noteText}>📝 หมายเหตุ: {item.note}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ประวัติการเบิกของฉัน</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => (item.documentId || item.id).toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchMyRequests} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyText}>ยังไม่มีรายการเบิกในระบบครับ</Text>
            </View>
          ) : <ActivityIndicator size="large" color="#00796B" style={{marginTop: 50}} />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 10, paddingBottom: 20, paddingHorizontal: 15, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  card: { 
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  jobNo: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  date: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  infoText: { fontSize: 14, color: '#475569' },
  itemsBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginTop: 5 },
  productLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  productName: { fontSize: 14, color: '#334155', flex: 1, marginRight: 10 },
  productQty: { fontSize: 14, fontWeight: 'bold', color: '#00796B' },
  noteSection: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  noteText: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94a3b8', marginTop: 15, fontSize: 16 }
});