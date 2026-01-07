import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, TextInput 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { API_URL } from '../../../constants/Config';

// Import สำหรับ Print PDF (เผื่ออยากปริ้นใบรับคืน)
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

export default function ApproveReturnScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');

  // Helper สำหรับดึงค่า (ป้องกัน Error Strapi v5)
  const getValue = (item: any, key: string) => item ? (item[key] !== undefined ? item[key] : (item.attributes?.[key] || '')) : '';

  const fetchRequestDetail = useCallback(async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      // Populate ให้ครบ: รายการของ, คนคืน, ไซท์
      const query = `populate[items][populate]=product&populate[project_site][fields][0]=name&populate[return_by][fields][0]=username`;
      const res = await fetch(`${API_URL}/return-requests/${id}?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setRequest(json.data);
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { fetchRequestDetail(); }, [fetchRequestDetail]);

  // ---------------------------------------------------------
  // ✅ ฟังก์ชัน 1: อนุมัติ (รับของเข้าสต็อก)
  // ---------------------------------------------------------
  const handleApprove = async () => {
    Alert.alert("ยืนยันรับคืน", "ระบบจะทำการ 'เพิ่มสต็อก' สินค้าเข้าสู่ระบบ ยืนยันหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ยืนยันรับของ", onPress: async () => {
          try {
            setSubmitting(true);
            const items = getValue(request, 'items') || [];
            
            // 1. วนลูปคืนสต็อกทีละรายการ
            for (const item of items) {
              const product = getValue(item, 'product');
              if (!product) continue;

              const returnQty = getValue(item, 'qty_request') || 0;
              const currentStock = getValue(product, 'stock') || 0;
              
              // ⭐ สูตรคำนวณ: ของเดิม + ของที่คืนมา
              const newStock = currentStock + returnQty; 

              // อัปเดตสต็อกที่ Product
              await fetch(`${API_URL}/products/${product.documentId || product.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { stock: newStock } })
              });
            }

            // 2. อัปเดตสถานะใบรับคืนเป็น approved
            await fetch(`${API_URL}/return-requests/${request.documentId || id}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: { return_status: 'approved' } })
            });

            Alert.alert("สำเร็จ", "รับของเข้าคลังเรียบร้อยแล้ว");
            router.back();

          } catch (error: any) { 
            Alert.alert("ผิดพลาด", error.message); 
          } finally { 
            setSubmitting(false); 
          }
      }}
    ]);
  };

  // ---------------------------------------------------------
  // ❌ ฟังก์ชัน 2: ปฏิเสธ (ไม่รับของ)
  // ---------------------------------------------------------
  const handleReject = async () => {
    if (!rejectRemark.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณาระบุเหตุผลที่ไม่รับของคืน");
      return;
    }

    Alert.alert("ยืนยันการปฏิเสธ", "คุณต้องการปฏิเสธการคืนของนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ยืนยัน", style: "destructive", onPress: async () => {
          try {
            setSubmitting(true);
            await fetch(`${API_URL}/return-requests/${request.documentId || id}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                data: { 
                  return_status: 'rejected',
                  note: `[ปฏิเสธโดยสโตร์: ${rejectRemark}] ${getValue(request, 'note') || ''}` 
                } 
              })
            });
            Alert.alert("สำเร็จ", "ปฏิเสธรายการเรียบร้อย");
            router.back();
          } catch (e) { Alert.alert("Error", "ไม่สามารถดำเนินการได้"); }
          finally { setSubmitting(false); }
      }}
    ]);
  };

  // ---------------------------------------------------------
  // 🖨️ ฟังก์ชัน 3: Print ใบรับคืน (Credit Note)
  // ---------------------------------------------------------
  const handlePrint = async () => {
    if (!request) return;
    const items = getValue(request, 'items') || [];
    const itemsHtml = items.map((item: any, index: number) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>${getValue(getValue(item, 'product'), 'name')}</td>
        <td style="text-align: center;">${getValue(item, 'qty_request')}</td>
        <td style="text-align: center;">หน่วย</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #000; padding: 8px; }
            th { background-color: #eee; }
          </style>
        </head>
        <body>
          <h1>📄 ใบรับคืนสินค้า (Return Receipt)</h1>
          <p><strong>เลขที่:</strong> ${getValue(request, 'job_no')}</p>
          <p><strong>ผู้คืน:</strong> ${getValue(getValue(request, 'return_by'), 'username')}</p>
          <p><strong>ไซท์งาน:</strong> ${getValue(getValue(request, 'project_site'), 'name')}</p>
          <table>
            <thead><tr><th>#</th><th>รายการ</th><th>จำนวนคืน</th><th>หน่วย</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <br><br>
          <p>ผู้รับคืน (Store Keeper): ........................................</p>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  };


  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#00796B" /></View>;

  const status = getValue(request, 'return_status');

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
            <View>
                <Text style={styles.jobNo}>ใบรับคืน: {getValue(request, 'job_no')}</Text>
                <Text style={styles.subInfo}>👤 ผู้คืน: {getValue(getValue(request, 'return_by'), 'username')}</Text>
                <Text style={styles.subInfo}>📍 จากไซท์: {getValue(getValue(request, 'project_site'), 'name')}</Text>
            </View>
            <TouchableOpacity onPress={handlePrint} style={{padding:5}}>
                 <Ionicons name="print-outline" size={28} color="#00796B" />
            </TouchableOpacity>
        </View>
        
        <View style={[styles.statusLabel, 
            { backgroundColor: status === 'approved' ? '#f0fdf4' : status === 'rejected' ? '#fef2f2' : '#fff7ed' }
        ]}>
          <Text style={[styles.statusText,
             { color: status === 'approved' ? '#166534' : status === 'rejected' ? '#991b1b' : '#c2410c' }
          ]}>
            {status === 'pending' ? 'รอตรวจสอบ' : status}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>รายการสินค้าที่คืนมา</Text>
      
      {/* Items List */}
      {(getValue(request, 'items') || []).map((item: any, index: number) => (
        <View key={index} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{getValue(getValue(item, 'product'), 'name')}</Text>
            <Text style={styles.itemStock}>
                สต็อกปัจจุบันในระบบ: {getValue(getValue(item, 'product'), 'stock')}
            </Text>
          </View>
          <View style={{alignItems:'flex-end'}}>
             <Text style={styles.itemQty}>+ {getValue(item, 'qty_request')}</Text>
             <Text style={{fontSize:10, color:'#10b981'}}>คืนเข้าสต็อก</Text>
          </View>
        </View>
      ))}

      {/* Action Buttons (แสดงเฉพาะตอน Pending) */}
      {status === 'pending' && (
        <View style={styles.footerAction}>
          <Text style={styles.label}>หมายเหตุ (กรณีปฏิเสธ):</Text>
          <TextInput 
            style={styles.input} 
            placeholder="เช่น ของชำรุด, จำนวนไม่ครบ..." 
            value={rejectRemark}
            onChangeText={setRejectRemark}
          />
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.btn, styles.rejectBtn]} 
              onPress={handleReject}
              disabled={submitting}
            >
              <Text style={styles.btnText}>ปฏิเสธ / ของเสีย</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.approveBtn]} 
              onPress={handleApprove}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>รับของเข้าสต็อก ✅</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{height: 50}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 2 },
  jobNo: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 5 },
  subInfo: { fontSize: 15, color: '#475569', marginBottom: 4 },
  statusLabel: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  statusText: { fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemStock: { fontSize: 12, color: '#94a3b8' },
  itemQty: { fontSize: 18, fontWeight: 'bold', color: '#10b981' },
  footerAction: { marginTop: 10 },
  label: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 20 },
  buttonGroup: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  approveBtn: { backgroundColor: '#10b981' },
  rejectBtn: { backgroundColor: '#ef4444' },
  btnText: { color: 'white', fontWeight: 'bold' }
});