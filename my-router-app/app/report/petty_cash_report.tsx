import React, { useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  TextInput, RefreshControl, Alert 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print'; // ✅ 1. Import Print
import * as Sharing from 'expo-sharing'; // ✅ 1. Import Sharing

import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

interface PettyCashItem {
    id: string | number;
    docNo: string;
    date: string;
    user_name: string;
    site_name: string;
    description: string;
    amount: number;
    is_missing_files: boolean;
    originalData: any; // ✅ 2. เพิ่ม field นี้เพื่อเก็บ object เต็มๆ ไว้ส่งไปหน้า Detail
}

export default function PettyCashReportScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<PettyCashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'last_7_days' | 'this_month' | 'all'>('all');

  const fetchPettyCash = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      // Populate * เพื่อให้ได้รูปภาพและข้อมูลความสัมพันธ์ครบถ้วน
      const res = await fetch(`${API_URL}/petty-cashes?populate=*&sort=date:desc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      
      const mapped: PettyCashItem[] = (json.data || []).map((p: any) => ({
          id: p.documentId || p.id,
          docNo: `CASH-${p.id}`,
          date: p.date || p.createdAt,
          user_name: p.requested_bies?.[0]?.username || 'ไม่ระบุ',
          site_name: p.project_sites?.[0]?.name || 'ทั่วไป',
          description: p.description,
          amount: p.amount,
          is_missing_files: !p.slip_image || !p.receipt_image || !p.product_image,
          originalData: p // ✅ เก็บข้อมูลดิบไว้ใช้ตอนกดดูรายละเอียด
      }));
      setData(mapped);
    } catch (e) { Alert.alert("Error", "โหลดข้อมูลล้มเหลว"); } finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchPettyCash(); }, [fetchPettyCash]));

  const filteredData = useMemo(() => {
    let result = data;
    // Logic การกรองวันที่
    if (filterType === 'last_7_days') {
        const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0);
        result = result.filter(item => new Date(item.date) >= d);
    } else if (filterType === 'this_month') {
        const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter(item => new Date(item.date) >= startOfMonth);
    }
    // Logic การค้นหา
    if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        result = result.filter(item => 
            item.user_name.toLowerCase().includes(lowerQ) || 
            item.description.toLowerCase().includes(lowerQ) ||
            item.site_name.toLowerCase().includes(lowerQ)
        );
    }
    return result;
  }, [data, filterType, searchQuery]);

  const totalAmount = useMemo(() => filteredData.reduce((s, i) => s + i.amount, 0), [filteredData]);

  // ✅ 3. ฟังก์ชันสร้าง PDF (ดึงมาจาก list.tsx แต่ปรับให้เข้ากับหน้านี้)
  const createPDF = async () => {
    const reportTitle = `รายงานสรุปเงินสดย่อย (${filterType === 'last_7_days' ? '7 วันย้อนหลัง' : filterType === 'this_month' ? 'เดือนนี้' : 'ทั้งหมด'})`;
    
    const tableRows = filteredData.map((item, index) => `
      <tr>
        <td style="text-align:center">${index + 1}</td>
        <td>${new Date(item.date).toLocaleDateString('th-TH')}</td>
        <td>${item.description}</td>
        <td>${item.site_name}</td>
        <td>${item.user_name}</td>
        <td style="text-align:center; color:${item.is_missing_files ? 'red' : 'green'}">
          ${item.is_missing_files ? 'ขาดหลักฐาน' : 'ครบถ้วน'}
        </td>
        <td style="text-align:right">${item.amount.toLocaleString()}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 20px; }
            h1 { text-align: center; color: #1e293b; }
            h3 { text-align: center; color: #64748b; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; }
            th { background-color: #f1f5f9; color: #334155; }
            .total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; color: #059669; }
          </style>
        </head>
        <body>
          <h1>รายงานเงินสดย่อย</h1>
          <h3>${reportTitle}</h3>
          <table>
            <thead>
              <tr>
                <th width="5%">ลำดับ</th>
                <th width="12%">วันที่</th>
                <th>รายละเอียด</th>
                <th width="15%">Site งาน</th>
                <th width="15%">ผู้เบิก</th>
                <th width="10%">สถานะ</th>
                <th width="15%">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
          <div class="total">ยอดรวมสุทธิ: ฿${totalAmount.toLocaleString()}</div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) { Alert.alert("สร้าง PDF ไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง"); }
  };

  // ✅ 4. ฟังก์ชันกดเพื่อไปหน้า Detail
  const handlePressItem = (item: PettyCashItem) => {
    router.push({
      pathname: `/petty_cash/${item.id}` as any,
      params: { itemData: JSON.stringify(item.originalData) } // ส่ง object ดิบไปให้หน้า Detail Parse
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>💰 รายงานเงินสดย่อย</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.summaryCard}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
            <View>
              <Text style={styles.summaryLabel}>ยอดรวมเงินจ่ายออก</Text>
              <Text style={styles.summaryAmount}>฿{totalAmount.toLocaleString()}</Text>
              <Text style={styles.summaryCount}>{filteredData.length} รายการ</Text>
            </View>
            
            {/* ✅ 5. ปุ่ม PDF ในส่วน Summary */}
            <TouchableOpacity style={styles.pdfButton} onPress={createPDF}>
               <Ionicons name="document-text-outline" size={20} color="#7c3aed" />
               <Text style={styles.pdfButtonText}>PDF</Text>
            </TouchableOpacity>
          </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput style={styles.input} placeholder="ค้นหาช่าง, รายละเอียด, หรือ Site..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <View style={styles.toggleContainer}>
            {(['last_7_days', 'this_month', 'all'] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.toggleBtn, filterType === t && styles.toggleActive]} onPress={() => setFilterType(t)}>
                    <Text style={[styles.toggleText, filterType === t && styles.textActive]}>
                        {t === 'last_7_days' ? '7 วัน' : t === 'this_month' ? 'เดือนนี้' : 'ทั้งหมด'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPettyCash} />}
        contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
        renderItem={({ item }) => (
            // ✅ 6. เปลี่ยนเป็น TouchableOpacity และใส่ onPress
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => handlePressItem(item)}
              style={[styles.card, item.is_missing_files && styles.cardMissing]}
            >
                <View style={styles.cardHeader}>
                    <View style={{flex:1}}>
                        <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('th-TH')}</Text>
                        <Text style={styles.userText}>{item.user_name}</Text>
                    </View>
                    <Text style={styles.amountText}>- ฿{item.amount.toLocaleString()}</Text>
                </View>
                <Text style={styles.descText} numberOfLines={2}>{item.description}</Text>
                <View style={styles.footerRow}>
                    <Text style={styles.siteText}>📍 {item.site_name}</Text>
                    {item.is_missing_files ? (
                        <View style={styles.warningBadge}>
                            <Ionicons name="warning" size={14} color="#ef4444" />
                            <Text style={styles.warningText}> ขาดบิล/รูป</Text>
                        </View>
                    ) : (
                        <View style={styles.okBadge}>
                             <Ionicons name="checkmark-circle" size={14} color="#059669" />
                             <Text style={styles.okText}> ครบถ้วน</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f3ff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  summaryCard: { backgroundColor: '#8b5cf6', margin: 15, padding: 20, borderRadius: 16, elevation: 4 },
  summaryLabel: { color: '#ede9fe', fontSize: 14 },
  summaryAmount: { color: 'white', fontSize: 32, fontWeight: 'bold', marginVertical: 4 },
  summaryCount: { color: '#ede9fe', fontSize: 12 },
  pdfButton: { backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 5 },
  pdfButtonText: { color: '#7c3aed', fontWeight: 'bold', fontSize: 14 },
  filterSection: { paddingHorizontal: 15, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingHorizontal: 10, height: 40, marginBottom: 10, elevation: 1 },
  input: { flex: 1, marginLeft: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#ddd6fe', borderRadius: 8, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleActive: { backgroundColor: 'white' },
  toggleText: { fontSize: 13, color: '#6d28d9' },
  textActive: { fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 1 },
  cardMissing: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  dateText: { color: '#94a3b8', fontSize: 11 },
  userText: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
  amountText: { fontSize: 18, fontWeight: 'bold', color: '#7c3aed' },
  descText: { color: '#4b5563', fontSize: 14, marginBottom: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  siteText: { color: '#64748b', fontSize: 12 },
  warningBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  warningText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' },
  okBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  okText: { color: '#059669', fontSize: 11, fontWeight: 'bold' }
});