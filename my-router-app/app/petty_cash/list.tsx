import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView, Linking, Alert } from 'react-native';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { useRouter } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function PettyCashList() {
  const router = useRouter();
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(new Date(2025, 0, 1));
  const [endDate, setEndDate] = useState(new Date());
  const [isStartDatePickerVisible, setStartVisible] = useState(false);
  const [isEndDatePickerVisible, setEndVisible] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = `${API_URL}/petty-cashes?populate=*&sort=date:desc`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      setItems(json.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const createPDF = async () => {
    const totalAmount = filteredItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const reportTitle = `รายงานเงินสดย่อย ${selectedSite ? `Site: ${selectedSite}` : ''} ${selectedUser ? `พนักงาน: ${selectedUser}` : ''}`;

    const tableRows = filteredItems.map((item, index) => `
      <tr>
        <td style="text-align:center">${index + 1}</td>
        <td>${new Date(item.date).toLocaleDateString('th-TH')}</td>
        <td>${item.description || '-'}</td>
        <td>${item.project_sites?.[0]?.name || 'ทั่วไป'}</td>
        <td>${item.requested_bies?.[0]?.username || '-'}</td>
        <td style="text-align:right">${Number(item.amount).toLocaleString()}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 20px; }
            h1 { text-align: center; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; font-size: 12px; }
            th { background-color: #f1f5f9; }
            .total { text-align: right; font-weight: bold; font-size: 16px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <p>ช่วงเวลา: ${startDate.toLocaleDateString('th-TH')} ถึง ${endDate.toLocaleDateString('th-TH')}</p>
          <table>
            <thead>
              <tr><th>ลำดับ</th><th>วันที่</th><th>รายละเอียด</th><th>Site งาน</th><th>ผู้เบิก</th><th>เงิน (บาท)</th></tr>
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
    } catch (error) { Alert.alert("สร้าง PDF ไม่สำเร็จ"); }
  };

  const filteredItems = items.filter(item => {
    const itemDate = new Date(item.date);
    const checkDate = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    const startCompare = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endCompare = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const requesterName = item.requested_bies?.[0]?.username || '';
    const siteName = item.project_sites?.[0]?.name || ''; 
    const matchDate = checkDate >= startCompare && checkDate <= endCompare;
    const matchSearch = (item.description || "").toLowerCase().includes(searchQuery.toLowerCase()) || siteName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchUser = selectedUser ? requesterName === selectedUser : true;
    const matchSite = selectedSite ? siteName === selectedSite : true;
    return matchDate && matchSearch && matchUser && matchSite;
  });

  const getImgUrl = (imgData: any) => {
    if (!imgData || !imgData.url) return null;
    const baseUrl = API_URL.replace('/api', ''); 
    return imgData.url.startsWith('/') ? `${baseUrl}${imgData.url}` : imgData.url;
  };

  const sendLineNudge = (description: string) => {
    const message = `แจ้งเตือน: รายการ "${description}" ยังไม่ส่งรูปสินค้า รบกวนช่วยส่งด้วยครับ 🙏`;
    const url = `line://msg/text/${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert("ไม่สามารถเปิด Line ได้"));
  };

  const renderItem = ({ item }: any) => {
    const requester = item.requested_bies?.[0]?.username || 'ไม่ระบุ';
    const siteName = item.project_sites?.[0]?.name || 'ไม่ระบุ Site';
    const hasReceipt = !!item.receipt_image;
    const hasSlip = !!item.slip_image;
    const hasProduct = !!item.product_image;

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => router.push({ pathname: `/petty_cash/${item.id}` as any, params: { itemData: JSON.stringify(item) } })}>
          <View style={styles.cardHeader}>
            <Text style={styles.dateText}>{item.date ? new Date(item.date).toLocaleDateString('th-TH') : '-'}</Text>
            <TouchableOpacity onPress={() => setSelectedSite(selectedSite === siteName ? null : siteName)} style={[styles.siteBadge, selectedSite === siteName && styles.siteBadgeActive]}>
              <Text style={[styles.siteText, {color: selectedSite === siteName ? 'white' : '#1e293b'}]}>📍 {siteName}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.contentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.descriptionText}>{item.description}</Text>
              <Text style={styles.amountText}>฿{Number(item.amount || 0).toLocaleString()}</Text>
              <TouchableOpacity onPress={() => setSelectedUser(selectedUser === requester ? null : requester)} style={[styles.userBadge, selectedUser === requester && styles.userBadgeActive]}>
                <Ionicons name="person-circle" size={14} color={selectedUser === requester ? "white" : "#64748b"} />
                <Text style={[styles.userBadgeText, {color: selectedUser === requester ? "white" : "#64748b"}]}>{requester}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.imageGroup}>
               <View style={styles.thumbBox}>{hasReceipt ? <Image source={{ uri: getImgUrl(item.receipt_image) }} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.missingThumb]}><Text style={styles.missingTxt}>บิล</Text></View>}</View>
               <View style={styles.thumbBox}>{hasSlip ? <Image source={{ uri: getImgUrl(item.slip_image) }} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.missingThumb]}><Text style={styles.missingTxt}>ใบกำกับ</Text></View>}</View>
               <View style={styles.thumbBox}>{hasProduct ? <Image source={{ uri: getImgUrl(item.product_image) }} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.missingThumb]}><Text style={styles.missingTxt}>สินค้า</Text></View>}</View>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.footerRow}>
          <View style={styles.statusGroup}>
            <Text style={[styles.statusMini, {color: hasReceipt ? '#059669' : '#ef4444'}]}>● บิล</Text>
            <Text style={[styles.statusMini, {color: hasSlip ? '#059669' : '#ef4444'}]}>● ใบกำกับ</Text>
            <Text style={[styles.statusMini, {color: hasProduct ? '#059669' : '#ef4444'}]}>● สินค้า</Text>
          </View>
          {!hasProduct && (
            <TouchableOpacity style={styles.lineBtn} onPress={() => sendLineNudge(item.description)}>
              <Ionicons name="chatbubble-ellipses" size={12} color="white" /><Text style={styles.lineBtnText}>ทวงทาง Line</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
          <View style={{ flex: 1 }}>
            <Text style={{color: '#94a3b8', fontSize: 12}}>{selectedSite ? `📍 ${selectedSite}` : 'ยอดรวม'} ({filteredItems.length} รายการ)</Text>
            <Text style={{color: 'white', fontSize: 26, fontWeight: 'bold'}}>฿{filteredItems.reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString()}</Text>
          </View>
          <View style={{ gap: 8 }}>
            <TouchableOpacity onPress={createPDF} style={styles.pdfBtn}><Ionicons name="document-text" size={16} color="white" /><Text style={{color:'white', fontSize:10, fontWeight:'bold'}}>PDF</Text></TouchableOpacity>
            {(selectedUser || selectedSite) && <TouchableOpacity onPress={() => { setSelectedUser(null); setSelectedSite(null); }} style={styles.clearFilterBtn}><Text style={{color:'white', fontSize:10}}>ล้างตัวกรอง ✕</Text></TouchableOpacity>}
          </View>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchBarContainer}><Ionicons name="search" size={18} color="#64748b" /><TextInput style={styles.searchInput} placeholder="ค้นหา..." value={searchQuery} onChangeText={setSearchQuery} /></View>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setStartVisible(true)}><Text style={styles.dateLabel}>จาก: {startDate.toLocaleDateString('th-TH')}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setEndVisible(true)}><Text style={styles.dateLabel}>ถึง: {endDate.toLocaleDateString('th-TH')}</Text></TouchableOpacity>
        </View>
      </View>

      <DateTimePickerModal isVisible={isStartDatePickerVisible} mode="date" date={startDate} onConfirm={(d) => {setStartDate(d); setStartVisible(false);}} onCancel={() => setStartVisible(false)} />
      <DateTimePickerModal isVisible={isEndDatePickerVisible} mode="date" date={endDate} onConfirm={(d) => {setEndDate(d); setEndVisible(false);}} onCancel={() => setEndVisible(false)} />

      {loading ? <ActivityIndicator size="large" color="#059669" style={{ marginTop: 50 }} /> : <FlatList data={filteredItems} renderItem={renderItem} keyExtractor={(i) => i.id.toString()} contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }} ListEmptyComponent={<Text style={styles.emptyText}>ไม่พบรายการ</Text>} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  summaryCard: { backgroundColor: '#1e293b', padding: 20, margin: 15, borderRadius: 15 },
  clearFilterBtn: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pdfBtn: { backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  filterSection: { paddingHorizontal: 15, marginBottom: 10, gap: 8 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, borderRadius: 10, height: 40, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: { flex: 1, backgroundColor: 'white', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  dateLabel: { fontSize: 12, color: '#475569', fontWeight: '500' },
  card: { backgroundColor: 'white', borderRadius: 12, marginBottom: 12, padding: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  dateText: { color: '#64748b', fontSize: 11 },
  siteBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  siteBadgeActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  siteText: { fontSize: 10, fontWeight: 'bold' },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  descriptionText: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  amountText: { fontSize: 22, fontWeight: 'bold', color: '#059669' },
  userBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#f8fafc', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  userBadgeActive: { backgroundColor: '#059669', borderColor: '#059669' },
  userBadgeText: { fontSize: 12, fontWeight: '600' },
  imageGroup: { flexDirection: 'row', gap: 4 },
  thumbBox: { width: 42, height: 42 },
  thumbnail: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: '#f8fafc' },
  missingThumb: { borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  missingTxt: { fontSize: 6, color: '#94a3b8' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  statusGroup: { flexDirection: 'row', gap: 10 },
  statusMini: { fontSize: 10, fontWeight: 'bold' },
  lineBtn: { backgroundColor: '#06c755', flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 5 },
  lineBtnText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});