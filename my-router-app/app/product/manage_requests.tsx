import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, 
  RefreshControl, TouchableOpacity, TextInput, Alert, Share 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../constants/Config';

// 📦 Import สำหรับ PDF และ Print
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

export default function ManageRequestsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับ Filter
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // 🔔 LINE TOKEN: (ใส่ Token ของกลุ่มไลน์ที่นี่)
  // วิธีขอ Token: ไปที่ https://notify-bot.line.me/my/ -> Generate Token
  const LINE_NOTIFY_TOKEN = "วาง_TOKEN_ของคุณที่นี่"; 

  const fetchAllRequests = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Query เดิม (Strapi v5)
      const query = [
        `populate[items][populate]=product`,
        `populate[project_site][fields][0]=name`,
        `populate[request_by][fields][0]=username`,
        `sort=createdAt:desc`
      ].join('&');

      const response = await fetch(`${API_URL}/withdrawal-requests?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      setRequests(json.data || []);
    } catch (error) {
      console.error("Fetch All Requests Error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchAllRequests();
    }, [fetchAllRequests])
  );

  const getDisplayName = (obj: any, type: 'user' | 'site') => {
    if (!obj) return "ไม่ระบุ";
    if (type === 'user') return obj.username || obj.attributes?.username || "ไม่ระบุชื่อ";
    if (type === 'site') return obj.name || obj.attributes?.name || "ไม่ระบุไซท์";
    return "ไม่ระบุ";
  };

  // Logic การกรองข้อมูล (คงเดิม)
  const filteredRequests = useMemo(() => {
    return requests.filter(item => {
      const statusMatch = item.request_status === statusFilter;
      const jobNo = item.job_no?.toLowerCase() || '';
      const requester = getDisplayName(item.request_by, 'user').toLowerCase();
      const site = getDisplayName(item.project_site, 'site').toLowerCase();
      const searchMatch = jobNo.includes(searchQuery.toLowerCase()) || 
                          requester.includes(searchQuery.toLowerCase()) ||
                          site.includes(searchQuery.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [requests, statusFilter, searchQuery]);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'pending': return { bg: '#fff7ed', text: '#c2410c', label: 'รอตรวจสอบ' };
      case 'approved': return { bg: '#f0fdf4', text: '#166534', label: 'อนุมัติแล้ว' };
      case 'rejected': return { bg: '#fef2f2', text: '#991b1b', label: 'ปฏิเสธ' };
      default: return { bg: '#f8fafc', text: '#64748b', label: status };
    }
  };

  // ---------------------------------------------------------
  // 🖨️ ฟังก์ชัน 1: สร้าง PDF
  // ---------------------------------------------------------
  const handleExportPDF = async () => {
    if (filteredRequests.length === 0) {
      Alert.alert("ไม่มีข้อมูล", "ไม่พบรายการที่จะพิมพ์");
      return;
    }

    // สร้าง HTML สำหรับตาราง
    const tableRows = filteredRequests.map((item, index) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>${item.job_no || '-'}</td>
        <td>${new Date(item.createdAt).toLocaleDateString('th-TH')}</td>
        <td>${getDisplayName(item.request_by, 'user')}</td>
        <td>${getDisplayName(item.project_site, 'site')}</td>
        <td style="text-align: center;">${item.items?.length || 0}</td>
        <td style="text-align: center;">${getStatusStyle(item.request_status).label}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 20px; }
            h1 { text-align: center; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { background-color: #f2f2f2; text-align: left; }
            .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #777; }
          </style>
        </head>
        <body>
          <h1>📄 รายงานการเบิกสินค้า</h1>
          <p>สถานะ: <strong>${getStatusStyle(statusFilter).label}</strong> | จำนวน: ${filteredRequests.length} รายการ</p>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 20%;">เลขที่ใบงาน</th>
                <th style="width: 15%;">วันที่</th>
                <th style="width: 20%;">ผู้เบิก</th>
                <th style="width: 20%;">ไซท์งาน</th>
                <th style="width: 10%;">รายการ</th>
                <th style="width: 10%;">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถสร้าง PDF ได้");
      console.error(error);
    }
  };

  // ---------------------------------------------------------
  // 🔔 ฟังก์ชัน 2: ส่ง Line Notify
  // ---------------------------------------------------------
  const handleLineNotify = async (item: any) => {
    // ถ้ายังไม่ได้ใส่ Token ให้แจ้งเตือนก่อน
    if (LINE_NOTIFY_TOKEN === "วาง_TOKEN_ของคุณที่นี่") {
      Alert.alert("ยังไม่ตั้งค่า Line", "กรุณาใส่ Line Notify Token ในโค้ดก่อนใช้งานครับ");
      return;
    }

    const message = `\n📢 แจ้งเตือนสถานะใบเบิก\n` +
      `📄 เลขที่: ${item.job_no || '-'}\n` +
      `👤 ผู้เบิก: ${getDisplayName(item.request_by, 'user')}\n` +
      `📍 ไซท์งาน: ${getDisplayName(item.project_site, 'site')}\n` +
      `📦 จำนวน: ${item.items?.length || 0} รายการ\n` +
      `📌 สถานะ: ${getStatusStyle(item.request_status).label}`;

    try {
      const response = await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`,
        },
        body: `message=${encodeURIComponent(message)}`,
      });

      if (response.ok) {
        Alert.alert("สำเร็จ", "ส่งแจ้งเตือน Line เรียบร้อย!");
      } else {
        Alert.alert("ผิดพลาด", "ส่ง Line ไม่สำเร็จ");
      }
    } catch (error) {
      Alert.alert("Error", "เกิดข้อผิดพลาดในการเชื่อมต่อ Line");
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการใบเบิกสินค้า</Text>
        
        {/* ⭐ ปุ่ม Print PDF เพิ่มเข้ามาใหม่ตรงนี้ */}
        <TouchableOpacity onPress={handleExportPDF} style={styles.printBtn}>
          <Ionicons name="print-outline" size={24} color="#00796B" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#94a3b8" />
          <TextInput 
            style={styles.searchInput}
            placeholder="ค้นหาเลขที่ใบงาน, ชื่อผู้เบิก, ไซท์งาน..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tab Filter */}
      <View style={styles.tabContainer}>
        {['pending', 'approved', 'rejected'].map((status) => (
          <TouchableOpacity 
            key={status}
            style={[styles.tab, statusFilter === status && styles.activeTab]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.tabText, statusFilter === status && styles.activeTabText]}>
              {getStatusStyle(status).label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => (item.documentId || item.id).toString()}
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.request_status);
          return (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push(`/product/approve/${item.documentId || item.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.jobNo}>{item.job_no || 'No Job No.'}</Text>
                  <Text style={styles.requester}>👤 ผู้เบิก: {getDisplayName(item.request_by, 'user')}</Text>
                </View>
                
                {/* ปุ่ม Action ขวาบนของการ์ด */}
                <View style={{flexDirection: 'row', gap: 8}}>
                  {/* ⭐ ปุ่มแจ้งเตือน Line */}
                  <TouchableOpacity 
                    style={styles.iconBtn} 
                    onPress={(e) => {
                      e.stopPropagation(); // ป้องกันไม่ให้กดทะลุไปหน้า detail
                      handleLineNotify(item);
                    }}
                  >
                     <Ionicons name="notifications-outline" size={20} color="#f59e0b" />
                  </TouchableOpacity>

                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color="#64748b" />
                <Text style={styles.infoText}>ไซท์งาน: {getDisplayName(item.project_site, 'site')}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="cube-outline" size={16} color="#64748b" />
                <Text style={styles.infoText}>รายการ: {item.items?.length || 0} รายการ</Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>📅 {new Date(item.createdAt).toLocaleDateString('th-TH')}</Text>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAllRequests} />}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>ไม่พบรายการที่ตรงตามเงื่อนไข</Text> : <ActivityIndicator color="#00796B" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 60, paddingBottom: 15, paddingHorizontal: 15, backgroundColor: 'white' 
  },
  backBtn: { padding: 5 },
  printBtn: { padding: 5 }, // Style สำหรับปุ่ม Print
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  searchSection: { padding: 15, backgroundColor: 'white' },
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', 
    borderRadius: 10, paddingHorizontal: 12, height: 45 
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#00796B' },
  tabText: { color: '#64748b', fontSize: 13 },
  activeTabText: { color: '#00796B', fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  jobNo: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  requester: { fontSize: 13, color: '#64748b', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  infoText: { fontSize: 14, color: '#475569' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  dateText: { fontSize: 12, color: '#94a3b8' },
  empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },
  iconBtn: { padding: 4, marginRight: 8 } // Style สำหรับปุ่ม Line
});