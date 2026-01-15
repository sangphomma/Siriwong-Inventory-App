import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_URL } from '../../constants/Config';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print'; // ✅ 1. เพิ่ม Import Print
import * as Sharing from 'expo-sharing'; // ✅ 1. เพิ่ม Import Sharing

const { width } = Dimensions.get('window');

export default function PettyCashDetail() {
  const { itemData } = useLocalSearchParams();
  const router = useRouter();
  const item = itemData ? JSON.parse(itemData as string) : null;

  // ฟังก์ชันแปลง URL รูปภาพให้สมบูรณ์
  const getFullUrl = (imgObj: any) => {
    if (!imgObj || !imgObj.url) return null;
    // เช็คว่า URL มี http อยู่แล้วหรือไม่ (กรณี Cloudinary/AWS) ถ้าไม่มีให้ต่อ Base URL
    if (imgObj.url.startsWith('http')) return imgObj.url;
    const baseUrl = API_URL.replace('/api', ''); 
    return `${baseUrl}${imgObj.url}`;
  };

  const getImgUrl = (imgObj: any) => {
    if (!imgObj || !imgObj.url) return null;
    return getFullUrl(imgObj);
  };

  // ✅ 2. ฟังก์ชันสร้าง PDF สำหรับรายการเดียว
  const printSinglePDF = async () => {
    if (!item) return;

    // เตรียม URL รูปภาพ
    const slipUrl = getFullUrl(item.slip_image);
    const receiptUrl = getFullUrl(item.receipt_image);
    const productUrl = getFullUrl(item.product_image);

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 30px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .title { font-size: 24px; font-weight: bold; }
            .subtitle { font-size: 14px; color: #666; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
            .label { font-weight: bold; width: 120px; color: #555; }
            .amount { font-size: 20px; font-weight: bold; color: #059669; }
            .image-section { margin-top: 20px; page-break-inside: avoid; }
            .img-box { margin-bottom: 20px; text-align: center; border: 1px solid #eee; padding: 10px; border-radius: 8px; }
            img { max-width: 100%; max-height: 400px; object-fit: contain; }
            .img-caption { margin-bottom: 5px; font-weight: bold; color: #555; font-size: 14px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">ใบสำคัญจ่ายเงินสดย่อย</div>
            <div class="subtitle">Siriwong Inventory System</div>
          </div>

          <table class="info-table">
            <tr>
              <td class="label">วันที่ทำรายการ:</td>
              <td>${new Date(item.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            <tr>
              <td class="label">ผู้เบิก:</td>
              <td>${item.requested_bies?.[0]?.username || 'ไม่ระบุ'}</td>
            </tr>
            <tr>
              <td class="label">Site งาน:</td>
              <td>${item.project_sites?.[0]?.name || 'ทั่วไป'}</td>
            </tr>
            <tr>
              <td class="label">รายละเอียด:</td>
              <td>${item.description}</td>
            </tr>
            <tr>
              <td class="label">จำนวนเงิน:</td>
              <td class="amount">฿${Number(item.amount).toLocaleString()}</td>
            </tr>
          </table>

          <h3>หลักฐานประกอบ (Attachments)</h3>
          
          <div class="image-section">
            ${receiptUrl ? `
              <div class="img-box">
                <div class="img-caption">1. บิล / ใบเสร็จรับเงิน</div>
                <img src="${receiptUrl}" />
              </div>` : ''}
            
            ${slipUrl ? `
              <div class="img-box">
                <div class="img-caption">2. สลิปโอนเงิน / ใบกำกับภาษี</div>
                <img src="${slipUrl}" />
              </div>` : ''}

            ${productUrl ? `
              <div class="img-box">
                <div class="img-caption">3. รูปสินค้า / หน้างาน</div>
                <img src="${productUrl}" />
              </div>` : ''}
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert("ผิดพลาด", "ไม่สามารถสร้าง PDF ได้");
    }
  };

  if (!item) return <View style={styles.container}><Text>ไม่พบข้อมูล</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดการเบิกเงิน</Text>
        
        {/* ✅ 3. ปุ่ม Print มุมขวาบน */}
        <TouchableOpacity onPress={printSinglePDF} style={styles.printBtn}>
          <Ionicons name="print-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.mainCard}>
        <Text style={styles.descTitle}>{item.description}</Text>
        <Text style={styles.amountText}>฿{Number(item.amount).toLocaleString()}</Text>
        
        <View style={styles.infoRow}><Ionicons name="person-circle-outline" size={20} color="#64748b" /><Text style={styles.infoText}>ผู้เบิก: {item.requested_bies?.[0]?.username || 'meen'}</Text></View>
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>📸 หลักฐานตรวจสอบ (3 ส่วน)</Text>
        
        <View style={styles.imageStack}>
          {/* 1. ใบเสร็จ */}
          <Text style={styles.imgLabel}>1. บิล / ใบเสร็จรับเงิน</Text>
          {item.receipt_image ? <Image source={{ uri: getImgUrl(item.receipt_image) }} style={styles.fullImage} resizeMode="contain" /> 
          : <View style={styles.noImage}><Text style={styles.noImgTxt}>ยังไม่มีการส่งใบเสร็จ</Text></View>}

          {/* 2. ใบกำกับ */}
          <Text style={[styles.imgLabel, {marginTop: 20}]}>2. ใบกำกับภาษี / สลิปโอนเงิน</Text>
          {item.slip_image ? <Image source={{ uri: getImgUrl(item.slip_image) }} style={styles.fullImage} resizeMode="contain" /> 
          : <View style={styles.noImage}><Text style={styles.noImgTxt}>ยังไม่มีการส่งใบกำกับ</Text></View>}

          {/* 3. สินค้า */}
          <Text style={[styles.imgLabel, {marginTop: 20}]}>3. รูปสินค้า / งานที่ทำ</Text>
          {item.product_image ? <Image source={{ uri: getImgUrl(item.product_image) }} style={styles.fullImage} resizeMode="contain" /> 
          : <View style={styles.noImage}><Text style={styles.noImgTxt}>ยังไม่มีการส่งรูปสินค้า</Text></View>}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#1e293b', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, // ปรับ justifyContent
  backBtn: { padding: 5 },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: 'bold', marginLeft: 10, flex: 1 },
  printBtn: { padding: 5 }, // Style ปุ่ม Print
  mainCard: { backgroundColor: 'white', margin: 15, borderRadius: 15, padding: 20, elevation: 3 },
  descTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  amountText: { fontSize: 32, fontWeight: 'bold', color: '#059669', marginVertical: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { color: '#64748b', fontSize: 13 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  imgLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  fullImage: { width: '100%', height: width * 0.8, borderRadius: 12, backgroundColor: '#f8fafc' },
  noImage: { width: '100%', height: 120, backgroundColor: '#f1f5f9', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1' },
  noImgTxt: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  imageStack: { gap: 10 }
});