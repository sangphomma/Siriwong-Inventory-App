import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, TextInput 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { API_URL } from '../../../constants/Config';

// 📦 Import สำหรับ Print PDF (ต้องลง expo-print expo-sharing แล้ว)
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

export default function ApproveRequestScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');

  const fetchRequestDetail = useCallback(async () => {
    if (!token || !id) return;
    try {
      setLoading(true);
      const query = `populate[items][populate]=product&populate[project_site][fields][0]=name&populate[request_by][fields][0]=username`;
      const res = await fetch(`${API_URL}/withdrawal-requests/${id}?${query}`, {
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

  const getDisplayName = (obj: any, type: 'user' | 'site' | 'product') => {
    if (!obj) return "ไม่ระบุ";
    if (type === 'user') return obj.username || obj.attributes?.username || "ไม่ระบุชื่อ";
    if (type === 'site') return obj.name || obj.attributes?.name || "ไม่ระบุไซท์";
    if (type === 'product') return obj.name || obj.attributes?.name || "สินค้าไม่มีชื่อ";
    return "ไม่ระบุ";
  };

  // ---------------------------------------------------------
  // 🖨️ ฟังก์ชันสร้าง PDF ใบเบิก (A4 Form)
  // ---------------------------------------------------------
  const handlePrint = async () => {
    if (!request) return;

    // เตรียมข้อมูลสำหรับ HTML
    const requestDate = new Date(request.createdAt).toLocaleDateString('th-TH');
    const jobNo = request.job_no || '-';
    const requesterName = getDisplayName(request.request_by, 'user');
    const siteName = getDisplayName(request.project_site, 'site');

    // สร้างแถวรายการสินค้า
    const itemsHtml = request.items?.map((item: any, index: number) => `
      <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>${getDisplayName(item.product, 'product')}</td>
        <td style="text-align: center;">${item.qty_request || 0}</td>
        <td style="text-align: center;">หน่วย</td> 
        <td style="text-align: center;"></td> </tr>
    `).join('') || '<tr><td colspan="5" style="text-align:center">ไม่มีรายการ</td></tr>';

    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .doc-title { font-size: 18px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
            
            .info-section { width: 100%; margin-bottom: 20px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 40px; }
            th, td { border: 1px solid #000; padding: 10px; font-size: 14px; }
            th { background-color: #f0f0f0; text-align: center; }
            
            .signature-section { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 80px; 
              padding-left: 20px; 
              padding-right: 20px;
            }
            .signature-box { text-align: center; width: 40%; }
            .line { border-bottom: 1px dotted #000; height: 30px; margin-bottom: 10px; }
            .label { font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          
          <div class="header">
            <div class="company-name">บริษัท ศิริวงษ์ กรุ๊ป จำกัด</div>
            <div>Siriwong Group Co., Ltd.</div>
          </div>

          <div style="text-align: center;">
            <div class="doc-title">ใบเบิกวัสดุ-อุปกรณ์ (Withdrawal Request)</div>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span><strong>เลขที่ใบเบิก (Job No):</strong> ${jobNo}</span>
              <span><strong>วันที่ (Date):</strong> ${requestDate}</span>
            </div>
            <div class="info-row">
              <span><strong>ผู้เบิก (Requester):</strong> ${requesterName}</span>
              <span><strong>นำไปใช้ที่ (Site):</strong> ${siteName}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%;">ลำดับ</th>
                <th style="width: 50%;">รายการวัสดุ-อุปกรณ์</th>
                <th style="width: 15%;">จำนวน</th>
                <th style="width: 10%;">หน่วย</th>
                <th style="width: 15%;">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-box">
              <div class="line"></div>
              <div class="label">( ${requesterName} )</div>
              <div>ผู้เบิกของ (Requester)</div>
              <div>วันที่ ....../....../......</div>
            </div>

            <div class="signature-box">
              <div class="line"></div>
              <div class="label">( ........................................ )</div>
              <div>ผู้จ่ายอุปกรณ์ (Store Keeper)</div>
              <div>วันที่ ....../....../......</div>
            </div>
          </div>

        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถสร้าง PDF ได้");
    }
  };

  const handleApprove = async () => {
    Alert.alert("ยืนยันการอนุมัติ", "ระบบจะทำการตัดสต็อกสินค้าจริง ยืนยันหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ยืนยัน", onPress: async () => {
          try {
            setSubmitting(true);
            const items = request.items || [];
            for (const item of items) {
              const product = item.product;
              const withdrawQty = item.qty_request || 0;
              const currentStock = product.stock ?? product.attributes?.stock ?? 0;
              const newStock = currentStock - withdrawQty;
              if (newStock < 0) throw new Error(`${getDisplayName(product, 'product')} สต็อกไม่พอ`);
              
              await fetch(`${API_URL}/products/${product.documentId || product.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { stock: newStock } })
              });
            }
            await fetch(`${API_URL}/withdrawal-requests/${request.documentId || id}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ data: { request_status: 'approved' } })
            });
            Alert.alert("สำเร็จ", "อนุมัติรายการเรียบร้อย");
            router.back();
          } catch (error: any) { Alert.alert("ผิดพลาด", error.message); }
          finally { setSubmitting(false); }
      }}
    ]);
  };

  const handleReject = async () => {
    if (!rejectRemark.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณาระบุเหตุผลที่ปฏิเสธใบเบิกนี้ในช่องหมายเหตุด้วยครับ");
      return;
    }

    Alert.alert("ยืนยันการปฏิเสธ", "คุณต้องการปฏิเสธใบเบิกนี้ใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ยืนยัน", style: "destructive", onPress: async () => {
          try {
            setSubmitting(true);
            await fetch(`${API_URL}/withdrawal-requests/${request.documentId || id}`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                data: { 
                  request_status: 'rejected',
                  note: `[ปฏิเสธโดยสโตร์: ${rejectRemark}] ${request.note || ''}` 
                } 
              })
            });
            Alert.alert("สำเร็จ", "ปฏิเสธรายการเรียบร้อยแล้ว");
            router.back();
          } catch (e) { Alert.alert("Error", "ไม่สามารถดำเนินการได้"); }
          finally { setSubmitting(false); }
      }}
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#00796B" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        {/* ส่วนหัวของการ์ด + ปุ่ม Print */}
        <View style={styles.headerRow}>
           <View>
              <Text style={styles.jobNo}>ใบเบิกเลขที่: {request?.job_no}</Text>
              <Text style={styles.subInfo}>👤 ผู้เบิก: {getDisplayName(request?.request_by, 'user')}</Text>
           </View>
           
           {/* ⭐ ปุ่ม Print PDF */}
           <TouchableOpacity onPress={handlePrint} style={styles.printBtn}>
             <Ionicons name="print-outline" size={28} color="#00796B" />
           </TouchableOpacity>
        </View>

        <Text style={styles.subInfo}>📍 ไซท์: {getDisplayName(request?.project_site, 'site')}</Text>
        <View style={styles.statusLabel}><Text style={styles.statusText}>{request?.request_status === 'pending' ? 'รอตรวจสอบ' : request?.request_status}</Text></View>
      </View>

      <Text style={styles.sectionTitle}>รายการสินค้าที่เบิก</Text>
      {request?.items?.map((item: any, index: number) => (
        <View key={index} style={styles.itemCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{getDisplayName(item.product, 'product')}</Text>
            <Text style={styles.itemStock}>คงเหลือในระบบ: {item.product?.stock ?? item.product?.attributes?.stock ?? 0} หน่วย</Text>
          </View>
          <Text style={styles.itemQty}>x {item.qty_request || 0}</Text>
        </View>
      ))}

      {request?.request_status === 'pending' && (
        <View style={styles.footerAction}>
          <Text style={styles.label}>ระบุหมายเหตุ (กรณีปฏิเสธ):</Text>
          <TextInput 
            style={styles.input} 
            placeholder="เช่น ของหมด, ระบุไซท์งานผิด..." 
            value={rejectRemark}
            onChangeText={setRejectRemark}
          />
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.btn, styles.rejectBtn]} 
              onPress={handleReject}
              disabled={submitting}
            >
              <Text style={styles.btnText}>ปฏิเสธใบเบิก</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.approveBtn]} 
              onPress={handleApprove}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>อนุมัติจ่ายของ</Text>}
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
  // ⭐ Style ใหม่สำหรับจัดแถวหัวข้อ
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, 
  printBtn: { padding: 5 },
  
  jobNo: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 5 },
  subInfo: { fontSize: 15, color: '#475569', marginBottom: 6 },
  statusLabel: { alignSelf: 'flex-start', backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 5 },
  statusText: { color: '#c2410c', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemStock: { fontSize: 12, color: '#94a3b8' },
  itemQty: { fontSize: 18, fontWeight: 'bold', color: '#00796B' },
  footerAction: { marginTop: 10 },
  label: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, marginBottom: 20 },
  buttonGroup: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  approveBtn: { backgroundColor: '#10b981' },
  rejectBtn: { backgroundColor: '#ef4444' },
  btnText: { color: 'white', fontWeight: 'bold' }
});