import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  RefreshControl, TouchableOpacity 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../app/contexts/AuthContext'; // อ้างอิง Path ตามโครงสร้างที่คุณยืนยัน
import { API_URL } from '../../constants/Config';

export default function MyRequestsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // โหลดข้อมูลทุกครั้งที่หน้าจอนี้ถูกโฟกัส
  useFocusEffect(
    useCallback(() => {
      fetchMyRequests();
    }, [user, token])
  );

  const fetchMyRequests = async () => {
    if (!user || !token) return;

    try {
      setLoading(true);
      const userDocId = (user as any).documentId || user.id;

      // ⭐ Query นี้สำคัญมาก: ต้องสั่ง populate ให้ลึกถึงชั้น product เพื่อเอาชื่อมาแสดง
      const query = `filters[request_by][documentId][$eq]=${userDocId}&populate[items][populate]=product&populate=project_site&sort=createdAt:desc`;
      
      const response = await fetch(`${API_URL}/withdrawal-requests?${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const json = await response.json();
      setRequests(json.data || []);
    } catch (error) {
      console.error("Fetch MyRequests Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return { bg: '#dcfce7', text: '#166534', label: 'อนุมัติแล้ว' };
      case 'rejected': return { bg: '#fee2e2', text: '#991b1b', label: 'ไม่อนุมัติ' };
      default: return { bg: '#f1f5f9', text: '#475569', label: 'รอตรวจสอบ' };
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const status = getStatusStyle(item.request_status);

    return (
      <View style={styles.card}>
        {/* ส่วนหัวของการ์ด */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.jobNo}>{item.job_no}</Text>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('th-TH', {
                day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit'
              })} น.
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>

        {/* ข้อมูลไซท์งาน */}
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#00796B" />
          <Text style={styles.infoText}>ไซท์: {item.project_site?.name || 'ไม่ระบุไซท์งาน'}</Text>
        </View>

        {/* รายการสินค้า (แก้ไขจาก x1 เป็นข้อมูลจริง) */}
        <View style={styles.itemsBox}>
          {item.items && item.items.map((subItem: any, index: number) => (
            <View key={index} style={styles.productLine}>
              <Text style={styles.productName}>
                • {subItem.product?.name || 'สินค้าถูกลบจากระบบ'}
              </Text>
              <Text style={styles.productQty}>
                x {subItem.qty_request || 0}
              </Text>
            </View>
          ))}
        </View>

        {/* หมายเหตุ */}
        {item.note && (
          <Text style={styles.noteText}>📝 หมายเหตุ: {item.note}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ประวัติการเบิกของฉัน</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.documentId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchMyRequests} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyText}>ยังไม่มีรายการเบิกครับ</Text>
            </View>
          ) : <ActivityIndicator size="large" color="#00796B" style={{marginTop: 50}} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 15, backgroundColor: 'white',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  
  card: { 
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16,
    borderLeftWidth: 5, borderLeftColor: '#00796B',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  jobNo: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  date: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: 'bold' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  infoText: { fontSize: 14, color: '#475569' },

  itemsBox: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, marginTop: 5 },
  productLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  productName: { fontSize: 14, color: '#334155', flex: 1 },
  productQty: { fontSize: 14, fontWeight: 'bold', color: '#00796B', marginLeft: 10 },

  noteText: { fontSize: 12, color: '#64748b', marginTop: 10, fontStyle: 'italic' },

  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#94a3b8', marginTop: 15, fontSize: 16 }
});