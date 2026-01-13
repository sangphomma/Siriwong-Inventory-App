import React, { useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  ActivityIndicator, TextInput, RefreshControl, Alert 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function TransactionReportScreen() {
  const router = useRouter();
  const { token } = useAuth();

  // Data State
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'this_month'>('this_month');

  // 1. Fetch Data
  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      
      // Query: ดึง Withdrawal Order + เจาะเข้าไปเอา Items + เจาะ Product
      // เรียงจาก ใหม่ -> เก่า
      const query = [
        `populate[withdrawal_items][populate]=product`, 
        `sort=date:desc,createdAt:desc`,
        `pagination[limit]=100` // ดึง 100 รายการล่าสุด
      ].join('&');

      const res = await fetch(`${API_URL}/withdrawal-orders?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      
      const rawData = json.data || [];
      setOrders(rawData);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  // 2. Filter Logic (กรองวันที่ + ชื่อคน)
  const filteredData = useMemo(() => {
    let result = orders;

    // กรองเดือนนี้
    if (filterType === 'this_month') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        // เช็คว่า date ของ order >= วันที่ 1 ของเดือนนี้
        result = result.filter(item => item.date >= startOfMonth);
    }

    // กรองชื่อคนเบิก
    if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        result = result.filter(item => 
            (item.user_name && item.user_name.toLowerCase().includes(lowerQ))
        );
    }

    return result;
  }, [orders, filterType, searchQuery]);

  // 3. PDF Export
  const handleExportPDF = async () => {
    if (filteredData.length === 0) {
        return Alert.alert("ไม่มีข้อมูล", "ไม่พบรายการที่จะพิมพ์");
    }

    try {
        const tableRows = filteredData.map((order, index) => {
            // สร้างรายการสินค้าย่อยในช่องเดียว
            const itemsHtml = order.withdrawal_items?.map((item: any) => `
                <div style="margin-bottom:4px; border-bottom:1px dashed #eee; padding-bottom:2px;">
                    <span style="font-weight:bold;">${item.product?.name || '-'}</span> 
                    <span style="color:#666; font-size:10px;">(${item.location_snapshot || 'ไม่ระบุจุด'})</span>
                    <span style="float:right;">x ${item.amount}</span>
                </div>
            `).join('') || '-';

            return `
              <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
                <td style="text-align: center;">${index + 1}</td>
                <td>${formatDate(order.date)}</td>
                <td>${order.user_name || '-'}</td>
                <td style="padding: 5px;">${itemsHtml}</td>
              </tr>
            `;
        }).join('');

        const html = `
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                h1 { text-align: center; color: #333; margin-bottom: 5px; }
                .sub-header { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
                th { background-color: #4f46e5; color: white; text-align: left; }
              </style>
            </head>
            <body>
              <h1>📄 รายงานประวัติการเบิกจ่าย</h1>
              <div class="sub-header">
                ช่วงเวลา: ${filterType === 'this_month' ? 'เดือนปัจจุบัน' : 'ทั้งหมด'} | 
                พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 15%;">วันที่</th>
                    <th style="width: 25%;">ผู้เบิก</th>
                    <th style="width: 55%;">รายการสินค้า (จุดเก็บ)</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
        Alert.alert("Error", "สร้าง PDF ไม่สำเร็จ");
    }
  };

  // Helper
  const formatDate = (dateString: string) => {
    if(!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>📊 ประวัติการเบิกจ่าย</Text>
        <TouchableOpacity onPress={handleExportPDF}>
            <Ionicons name="print-outline" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput 
                style={styles.input} 
                placeholder="ค้นหาชื่อผู้เบิก..." 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
            />
        </View>
        
        {/* Toggle Month Filter */}
        <View style={styles.toggleContainer}>
            <TouchableOpacity 
                style={[styles.toggleBtn, filterType === 'this_month' && styles.toggleActive]} 
                onPress={() => setFilterType('this_month')}
            >
                <Text style={[styles.toggleText, filterType === 'this_month' && styles.textActive]}>เดือนนี้</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.toggleBtn, filterType === 'all' && styles.toggleActive]} 
                onPress={() => setFilterType('all')}
            >
                <Text style={[styles.toggleText, filterType === 'all' && styles.textActive]}>ทั้งหมด</Text>
            </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => (item.documentId || item.id).toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHistory} />}
        contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
        ListEmptyComponent={
            !loading ? <Text style={styles.emptyText}>ไม่พบข้อมูลการเบิกจ่าย</Text> : <ActivityIndicator color="#4f46e5" />
        }
        renderItem={({ item }) => (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{flexDirection:'row', alignItems:'center', gap:5}}>
                        <Ionicons name="calendar-outline" size={16} color="#64748b" />
                        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={styles.userText}>👤 {item.user_name}</Text>
                </View>

                <View style={styles.divider} />

                {/* รายการสินค้าใน Order นี้ */}
                {item.withdrawal_items?.map((wItem: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                        <View style={{flex: 1}}>
                            <Text style={styles.productName}>{wItem.product?.name || 'สินค้าลบแล้ว'}</Text>
                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                <Ionicons name="location-sharp" size={12} color="#00796B" />
                                <Text style={styles.locationSnap}> {wItem.location_snapshot || 'ไม่ระบุจุดเก็บ'}</Text>
                            </View>
                        </View>
                        <Text style={styles.qtyBadge}>x{wItem.amount}</Text>
                    </View>
                ))}
            </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  
  filterSection: { backgroundColor: 'white', padding: 15, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, height: 40, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, marginLeft: 10 },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  toggleActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, elevation: 1 },
  toggleText: { fontSize: 13, color: '#64748b' },
  textActive: { color: '#4f46e5', fontWeight: 'bold' },

  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateText: { color: '#64748b', fontSize: 14, fontWeight:'500' },
  userText: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 10 },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  productName: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  locationSnap: { fontSize: 11, color: '#00796B', marginLeft: 2 },
  qtyBadge: { backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  emptyText: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});