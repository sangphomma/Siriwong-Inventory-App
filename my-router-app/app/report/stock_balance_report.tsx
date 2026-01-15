import React, { useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, Text, View, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, TextInput, Alert 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

interface AdjustItem {
    id: number;
    docNo: string;
    date: string;
    product_name: string;
    location_name: string;
    diff: number;
    user_name: string;
    remark: string;
    type: string;
}

export default function StockBalanceReportScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [data, setData] = useState<AdjustItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'frequency'>('timeline');

  // --- 🔍 State สำหรับ Filter ---
  const [searchQuery, setSearchQuery] = useState("");
  // ตั้งค่าเริ่มต้น: 30 วันย้อนหลัง
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);

  const fetchAdjustments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      
      // ดึงข้อมูล Transaction 500 รายการล่าสุด (เผื่อกรอง)
      const res = await fetch(`${API_URL}/transactions?populate=*&sort=createdAt:desc&pagination[limit]=500`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const json = await res.json();
      
      if (json.error) {
          console.error("API Error:", json.error);
          return;
      }

      const rawData = json.data || [];

      const mapped = rawData
      // กรองเอาเฉพาะที่มีคำว่า [Audit] หรือ "ปรับ" ใน remark หรือ type='adjust'
      .filter((t: any) => {
          const typeMatch = t.type === 'adjust';
          const remarkMatch = (t.remark || "").toLowerCase().includes('audit') || (t.remark || "").toLowerCase().includes('ปรับ');
          return typeMatch || remarkMatch;
      })
      .map((t: any) => ({
          id: t.id,
          docNo: t.docNo || `TRX-${t.id}`,
          date: t.createdAt,
          product_name: t.product?.name || t.product?.attributes?.name || 'สินค้าไม่ระบุ',
          location_name: t.location?.name || t.location?.attributes?.name || 'ไม่ระบุจุดเก็บ',
          diff: t.type === 'in' ? t.amount : -t.amount, 
          type: t.type,
          user_name: t.action_by?.username || t.action_by?.attributes?.username || 'Admin',
          remark: t.remark || '-'
      }));

      setData(mapped);

    } catch (e) { 
        console.error("Fetch Error:", e);
    } finally { setLoading(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { fetchAdjustments(); }, [fetchAdjustments]));

  // --- 🛠️ Logic การกรอง (Search + Date) ---
  const filteredData = useMemo(() => {
    return data.filter(item => {
        const itemDate = new Date(item.date);
        
        // 1. กรองวันที่ (ตัดเวลาออกเพื่อเทียบแค่วัน)
        const checkDate = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
        const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        const inDateRange = checkDate >= start && checkDate <= end;

        // 2. กรองคำค้นหา
        const lowerQ = searchQuery.toLowerCase();
        const matchesSearch = 
            item.product_name.toLowerCase().includes(lowerQ) ||
            item.location_name.toLowerCase().includes(lowerQ) ||
            item.user_name.toLowerCase().includes(lowerQ) ||
            item.remark.toLowerCase().includes(lowerQ);

        return inDateRange && matchesSearch;
    });
  }, [data, startDate, endDate, searchQuery]);

  // --- 📊 คำนวณสถิติ (จากข้อมูลที่กรองแล้ว) ---
  const frequencyStats = useMemo(() => {
      const stats: Record<string, { count: number, totalDiff: number }> = {};
      filteredData.forEach(item => {
          if (!stats[item.product_name]) {
              stats[item.product_name] = { count: 0, totalDiff: 0 };
          }
          stats[item.product_name].count += 1;
          stats[item.product_name].totalDiff += item.diff;
      });
      return Object.entries(stats)
          .map(([name, val]) => ({ name, ...val }))
          .sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // --- 🖨️ PDF Export ---
  const createPDF = async () => {
    const reportTitle = `รายงานความผิดพลาดสต็อก (Audit)`;
    const dateRange = `${startDate.toLocaleDateString('th-TH')} - ${endDate.toLocaleDateString('th-TH')}`;
    
    const tableRows = filteredData.map((item, index) => `
      <tr>
        <td style="text-align:center">${index + 1}</td>
        <td>${new Date(item.date).toLocaleDateString('th-TH')}</td>
        <td>${item.product_name}</td>
        <td>${item.location_name}</td>
        <td style="text-align:center; font-weight:bold; color:${item.diff < 0 ? 'red' : 'green'}">
            ${item.diff > 0 ? '+' : ''}${item.diff}
        </td>
        <td>${item.remark}</td>
        <td>${item.user_name}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 20px; }
            h1 { text-align: center; color: #db2777; }
            h3 { text-align: center; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; }
            th { background-color: #fdf2f8; color: #db2777; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <h3>ช่วงเวลา: ${dateRange}</h3>
          <table>
            <thead>
              <tr>
                <th width="5%">ลำดับ</th>
                <th width="12%">วันที่</th>
                <th>สินค้า</th>
                <th>จุดเก็บ</th>
                <th width="10%">ผลต่าง</th>
                <th>หมายเหตุ</th>
                <th width="12%">ผู้ตรวจ</th>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>📉 รายงานความผิดพลาด</Text>
        <TouchableOpacity onPress={createPDF} style={styles.pdfBtn}>
            <Ionicons name="print-outline" size={24} color="#db2777" />
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput 
                style={styles.input} 
                placeholder="ค้นหา (สินค้า, จุดเก็บ, ผู้ตรวจ)..." 
                value={searchQuery} 
                onChangeText={setSearchQuery} 
            />
        </View>
        <View style={{flexDirection:'row', gap:10}}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setStartPickerVisible(true)}>
                <Text style={styles.dateText}>📅 จาก: {startDate.toLocaleDateString('th-TH')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setEndPickerVisible(true)}>
                <Text style={styles.dateText}>📅 ถึง: {endDate.toLocaleDateString('th-TH')}</Text>
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, viewMode==='timeline' && styles.tabActive]} onPress={()=>setViewMode('timeline')}>
              <Text style={[styles.tabText, viewMode==='timeline' && {color:'white'}]}>⏳ Timeline ({filteredData.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, viewMode==='frequency' && styles.tabActive]} onPress={()=>setViewMode('frequency')}>
              <Text style={[styles.tabText, viewMode==='frequency' && {color:'white'}]}>🏆 ผิดบ่อยสุด</Text>
          </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color="#db2777" style={{marginTop:20}}/> : (
        <View style={{flex:1}}>
            {viewMode === 'timeline' ? (
                <FlatList
                    data={filteredData}
                    keyExtractor={i => i.id.toString()}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAdjustments} />}
                    contentContainerStyle={{padding: 15}}
                    ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:'#999'}}>ไม่พบข้อมูลในช่วงเวลานี้</Text>}
                    renderItem={({item}) => (
                        <View style={styles.card}>
                            <View style={styles.rowBetween}>
                                <Text style={styles.date}>{new Date(item.date).toLocaleDateString('th-TH')} {new Date(item.date).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</Text>
                                <View style={{flexDirection:'row', gap:5}}>
                                    <Text style={[styles.diffBadge, {color: item.diff < 0 ? '#ef4444' : '#10b981'}]}>
                                        {item.diff > 0 ? '+' : ''}{item.diff}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.prodName}>{item.product_name}</Text>
                            <Text style={styles.locName}>📍 {item.location_name}</Text>
                            <View style={styles.remarkBox}>
                                <Text style={styles.remark}>📝 {item.remark}</Text>
                                <Text style={styles.user}>โดย: {item.user_name}</Text>
                            </View>
                        </View>
                    )}
                />
            ) : (
                <FlatList
                    data={frequencyStats}
                    keyExtractor={i => i.name}
                    contentContainerStyle={{padding: 15}}
                    ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:'#999'}}>ยังไม่มีข้อมูลสถิติ</Text>}
                    renderItem={({item, index}) => (
                        <View style={styles.rankCard}>
                            <View style={styles.rankBadge}><Text style={styles.rankText}>#{index+1}</Text></View>
                            <View style={{flex:1, marginLeft: 10}}>
                                <Text style={styles.prodName}>{item.name}</Text>
                                <Text style={styles.statDetail}>ปรับปรุงยอดไปแล้ว <Text style={{fontWeight:'bold', color:'#db2777'}}>{item.count} ครั้ง</Text></Text>
                                <Text style={styles.statDetail}>ยอดสุทธิ: {item.totalDiff > 0 ? '+' : ''}{item.totalDiff}</Text>
                            </View>
                        </View>
                    )}
                />
            )}
        </View>
      )}

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={isStartPickerVisible}
        mode="date"
        date={startDate}
        onConfirm={(date) => { setStartDate(date); setStartPickerVisible(false); }}
        onCancel={() => setStartPickerVisible(false)}
      />
      <DateTimePickerModal
        isVisible={isEndPickerVisible}
        mode="date"
        date={endDate}
        onConfirm={(date) => { setEndDate(date); setEndPickerVisible(false); }}
        onCancel={() => setEndPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf2f8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#db2777' },
  pdfBtn: { padding: 5 },
  
  filterSection: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, paddingHorizontal: 10, height: 40, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  input: { flex: 1, marginLeft: 10 },
  dateBtn: { flex: 1, padding: 10, backgroundColor: '#fdf2f8', borderRadius: 8, borderWidth: 1, borderColor: '#fce7f3', alignItems: 'center' },
  dateText: { fontSize: 12, color: '#db2777', fontWeight: 'bold' },

  tabContainer: { flexDirection: 'row', padding: 15, justifyContent: 'center', gap: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#db2777' },
  tabActive: { backgroundColor: '#db2777' },
  tabText: { color: '#db2777', fontWeight: 'bold' },
  
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  date: { fontSize: 12, color: '#94a3b8' },
  diffBadge: { fontSize: 18, fontWeight: 'bold' },
  prodName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  locName: { fontSize: 14, color: '#64748b', marginTop: 2 },
  remarkBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between' },
  remark: { fontSize: 12, color: '#475569', fontStyle: 'italic', flex: 1, paddingRight: 10 },
  user: { fontSize: 12, color: '#db2777', fontWeight: '500' },
  
  rankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  rankBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fce7f3', justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 16, fontWeight: 'bold', color: '#db2777' },
  statDetail: { fontSize: 13, color: '#64748b', marginTop: 2 }
});