import React, { useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  TextInput, RefreshControl, Alert, Modal, ScrollView 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

interface HistoryItem {
    id: string | number;
    docNo: string;
    date: string;
    user_name: string;
    site_name: string;
    type: 'Counter' | 'Request' | 'Return';
    items: {
      product_name: string;
      amount: number | string;
      unit?: string;
    }[];
    originalData?: any; 
}

export default function InventoryReportScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'last_7_days' | 'this_month' | 'all'>('last_7_days');

  // ✅ เพิ่ม State ที่หายไปครับ (แก้ Error ตรงนี้)
  const [selectedExpress, setSelectedExpress] = useState<HistoryItem | null>(null);
  const [showExpressModal, setShowExpressModal] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };

      // 1. เบิกด่วน
      const resOrders = await fetch(`${API_URL}/withdrawal-orders?populate[withdrawal_items][populate]=product&sort=date:desc&pagination[limit]=100`, { headers });
      const jsonOrders = await resOrders.json();
      const mappedOrders: HistoryItem[] = (jsonOrders.data || []).map((o: any) => ({
          id: o.documentId || o.id,
          docNo: `EXP-${o.id}`, 
          date: o.date || o.createdAt,
          user_name: o.user_name || 'ไม่ระบุ',
          site_name: o.note?.includes('นำไปใช้ที่:') ? o.note.split('นำไปใช้ที่:')[1].trim() : '-',
          type: 'Counter',
          items: o.withdrawal_items?.map((i: any) => ({
              product_name: i.product?.name || 'Unknown',
              amount: i.amount,
              unit: i.product?.unit
          })) || [],
          originalData: o
      }));

      // 2. ใบเบิกอนุมัติ
      const resReqs = await fetch(`${API_URL}/withdrawal-requests?filters[request_status][$eq]=approved&populate[items][populate]=product&populate[request_by][fields][0]=username&populate[project_site][fields][0]=name&sort=updatedAt:desc`, { headers });
      const jsonReqs = await resReqs.json();
      const mappedReqs: HistoryItem[] = (jsonReqs.data || []).map((r: any) => ({
          id: r.documentId || r.id,
          docNo: r.job_no || `REQ-${r.id}`,
          date: r.updatedAt || r.createdAt, 
          user_name: r.request_by?.username || 'ไม่ระบุ',
          site_name: r.project_site?.name || '-',
          type: 'Request',
          items: r.items?.map((i: any) => ({
              product_name: i.product?.name || 'Unknown',
              amount: i.qty_request,
              unit: i.product?.unit
          })) || [],
          originalData: r
      }));

      // 3. ใบรับคืน
      const resRets = await fetch(`${API_URL}/return-requests?filters[return_status][$eq]=approved&populate[items][populate]=product&populate[return_by][fields][0]=username&populate[project_site][fields][0]=name&sort=updatedAt:desc`, { headers });
      const jsonRets = await resRets.json();
      const mappedRets: HistoryItem[] = (jsonRets.data || []).map((r: any) => ({
          id: r.documentId || r.id,
          docNo: r.job_no || `RET-${r.id}`,
          date: r.updatedAt || r.createdAt,
          user_name: r.return_by?.username || 'ไม่ระบุ',
          site_name: r.project_site?.name || '-',
          type: 'Return',
          items: r.items?.map((i: any) => ({
              product_name: i.product?.name || 'Unknown',
              amount: i.qty_request,
              unit: i.product?.unit
          })) || [],
          originalData: r
      }));

      const combined = [...mappedOrders, ...mappedReqs, ...mappedRets].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setHistoryData(combined);
    } catch (error) { Alert.alert("Error", "โหลดข้อมูลล้มเหลว"); } finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  const filteredData = useMemo(() => {
    let result = historyData;
    if (filterType === 'last_7_days') {
        const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0);
        result = result.filter(item => new Date(item.date) >= d);
    } else if (filterType === 'this_month') {
        const now = new Date(); const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        result = result.filter(item => new Date(item.date) >= startOfMonth);
    }
    if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        result = result.filter(item => 
            item.user_name.toLowerCase().includes(lowerQ) || item.site_name.toLowerCase().includes(lowerQ)
        );
    }
    return result;
  }, [historyData, filterType, searchQuery]);

  // ✅ ฟังก์ชัน Print สำหรับใบเบิกด่วน (Express)
  const printExpressPDF = async (item: HistoryItem) => {
    const htmlContent = `
      <html>
        <body style="font-family:Helvetica; padding:20px;">
           <div style="border: 2px solid #333; padding: 20px; border-radius: 10px;">
                <h2 style="text-align:center;">ใบเบิกสินค้า (Store Counter)</h2>
                <hr/>
                <p><b>วันที่:</b> ${new Date(item.date).toLocaleDateString('th-TH')}</p>
                <p><b>ผู้เบิก:</b> ${item.user_name}</p>
                <p><b>นำไปใช้ที่:</b> ${item.site_name}</p>
                
                <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                    <tr style="background:#ddd;">
                        <th style="border:1px solid #999; padding:8px;">รายการสินค้า</th>
                        <th style="border:1px solid #999; padding:8px;">จำนวน</th>
                    </tr>
                    ${item.items.map(i => `
                        <tr>
                            <td style="border:1px solid #999; padding:8px;">${i.product_name}</td>
                            <td style="border:1px solid #999; padding:8px; text-align:center;">${i.amount} ${i.unit || ''}</td>
                        </tr>
                    `).join('')}
                </table>
                <br/>
                <p style="text-align:right; margin-top:20px;">ลงชื่อผู้รับของ ......................................</p>
            </div>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert("Error", "Print Error"); }
  };

  // ✅ ฟังก์ชัน createPDF (รวม List)
  const createListPDF = async () => {
    const reportTitle = `รายงานเบิกจ่ายอุปกรณ์ (${filterType === 'last_7_days' ? '7 วันล่าสุด' : filterType === 'this_month' ? 'เดือนนี้' : 'ทั้งหมด'})`;
    
    const tableRows = filteredData.map((item, index) => {
      const itemsList = item.items.map(i => `${i.product_name} (${i.amount} ${i.unit || ''})`).join('<br/>');
      const typeLabel = item.type === 'Counter' ? 'เบิกด่วน' : item.type === 'Request' ? 'ใบเบิก' : 'รับคืน';
      const color = item.type === 'Return' ? 'blue' : 'black';

      return `
        <tr style="color: ${color}">
          <td style="text-align:center">${index + 1}</td>
          <td>${new Date(item.date).toLocaleDateString('th-TH')}</td>
          <td>${item.docNo}</td>
          <td>${typeLabel}</td>
          <td>${itemsList}</td>
          <td>${item.site_name}</td>
          <td>${item.user_name}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 20px; }
            h1 { text-align: center; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; vertical-align: top; }
            th { background-color: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <table>
            <thead>
              <tr>
                <th width="5%">ลำดับ</th>
                <th width="10%">วันที่</th>
                <th width="12%">เลขที่</th>
                <th width="10%">ประเภท</th>
                <th>รายการสินค้า</th>
                <th width="15%">Site งาน</th>
                <th width="10%">ผู้ทำรายการ</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) { Alert.alert("ผิดพลาด", "สร้าง PDF ไม่สำเร็จ"); }
  };

  const handlePressItem = (item: HistoryItem) => {
    if (item.type === 'Request') {
       // ✅ ระบุ Path แบบชัดเจน (String Template)
       router.push(`/product/request_detail/${item.id}` as any); 
    } else if (item.type === 'Return') {
       // ✅ ระบุ Path แบบชัดเจน
       router.push(`/product/return_detail/${item.id}` as any);
    } else {
       // ถ้าเป็นเบิกด่วน เปิด Modal แทน
       setSelectedExpress(item);
       setShowExpressModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>📦 รายงานเบิกจ่ายอุปกรณ์</Text>
        <TouchableOpacity onPress={createListPDF} style={{padding:5}}>
           <Ionicons name="print-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput style={styles.input} placeholder="ค้นหาช่าง หรือ ไซท์..." value={searchQuery} onChangeText={setSearchQuery} />
        </View>
        <View style={styles.toggleContainer}>
            {(['last_7_days', 'this_month', 'all'] as const).map((t) => (
                <TouchableOpacity key={t} style={[styles.toggleBtn, filterType === t && styles.toggleActive]} onPress={() => setFilterType(t)}>
                    <Text style={[styles.toggleText, filterType === t && styles.textActive]}>
                        {t === 'last_7_days' ? '7 วันล่าสุด' : t === 'this_month' ? 'เดือนนี้' : 'ทั้งหมด'}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchHistory} />}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => {
            let config = { color: '#10b981', label: 'เบิกด่วน', bg: '#ecfdf5' };
            if (item.type === 'Request') config = { color: '#f59e0b', label: 'ใบเบิกอนุมัติ', bg: '#fff7ed' };
            if (item.type === 'Return') config = { color: '#3b82f6', label: 'รับคืนของ', bg: '#eff6ff' };

            return (
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => handlePressItem(item)}
                  style={[styles.card, { borderLeftColor: config.color, borderLeftWidth: 4 }]}
                >
                    <View style={styles.cardHeader}>
                        <View style={{flex:1}}>
                            <Text style={styles.docNo}>{item.docNo}</Text>
                            <Text style={styles.dateText}>{new Date(item.date).toLocaleDateString('th-TH')}</Text>
                        </View>
                        <View style={{alignItems:'flex-end'}}>
                            <Text style={styles.userText}>{item.user_name}</Text>
                            <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                                <Text style={{ fontSize:10, color: config.color, fontWeight:'bold' }}>{config.label}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.siteRow}>
                        <Ionicons name="location" size={12} color="#64748b" />
                        <Text style={styles.siteText}> {item.site_name}</Text>
                    </View>
                    <View style={styles.divider} />
                    {item.items.map((i, idx) => (
                        <View key={idx} style={styles.itemRow}>
                            <Text style={styles.productName}>{i.product_name}</Text>
                            <Text style={[styles.qtyText, item.type === 'Return' && {color: '#2563eb'}]}>
                                {item.type === 'Return' ? '+' : '-'} {i.amount} {i.unit || ''}
                            </Text>
                        </View>
                    ))}
                </TouchableOpacity>
            );
        }}
      />

      {/* ✅ Modal สำหรับดูรายละเอียดเบิกด่วน */}
      <Modal visible={showExpressModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
                    <Text style={styles.modalTitle}>รายละเอียดเบิกด่วน</Text>
                    <TouchableOpacity onPress={() => setShowExpressModal(false)}><Ionicons name="close" size={24} /></TouchableOpacity>
                </View>

                {selectedExpress && (
                    <View>
                        <View style={styles.infoBox}>
                             <Text style={{fontWeight:'bold', fontSize:16, marginBottom:5}}>{selectedExpress.docNo}</Text>
                             <Text>📅 วันที่: {new Date(selectedExpress.date).toLocaleDateString('th-TH')}</Text>
                             <Text>👤 ผู้เบิก: {selectedExpress.user_name}</Text>
                             <Text>🏗️ ไซท์: {selectedExpress.site_name}</Text>
                        </View>
                        
                        <ScrollView style={{maxHeight: 250, marginVertical:10}}>
                             {selectedExpress.items.map((i, idx) => (
                                 <View key={idx} style={styles.expressItemRow}>
                                     <Text style={{flex:1, color:'#333'}}>{idx+1}. {i.product_name}</Text>
                                     <Text style={{fontWeight:'bold'}}>{i.amount} {i.unit}</Text>
                                 </View>
                             ))}
                        </ScrollView>

                        <TouchableOpacity 
                             style={styles.printBtn} 
                             onPress={() => printExpressPDF(selectedExpress)}
                        >
                             <Ionicons name="print" size={20} color="white" />
                             <Text style={{color:'white', fontWeight:'bold', marginLeft:5}}>พิมพ์ใบเบิก (PDF)</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  filterSection: { backgroundColor: 'white', padding: 15, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, height: 40, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, marginLeft: 10 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  toggleActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, elevation: 1 },
  toggleText: { fontSize: 13, color: '#64748b' },
  textActive: { color: '#3b82f6', fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  docNo: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  dateText: { color: '#94a3b8', fontSize: 11 },
  userText: { fontWeight: 'bold', color: '#1e293b', fontSize: 14 },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  siteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  siteText: { color: '#64748b', fontSize: 12 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  productName: { fontSize: 14, color: '#475569', flex: 1 },
  qtyText: { fontSize: 14, fontWeight: 'bold' },
  // ✅ Styles ใหม่สำหรับ Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 20, borderRadius: 15, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  infoBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 10 },
  expressItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  printBtn: { flexDirection: 'row', backgroundColor: '#3b82f6', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 }
});