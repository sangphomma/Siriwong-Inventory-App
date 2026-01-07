import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_URL } from '../../constants/Config';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function PettyCashDetail() {
  const { itemData } = useLocalSearchParams();
  const router = useRouter();
  const item = itemData ? JSON.parse(itemData as string) : null;

  const getImgUrl = (imgObj: any) => {
    if (!imgObj || !imgObj.url) return null;
    const baseUrl = API_URL.replace('/api', ''); 
    return imgObj.url.startsWith('/') ? `${baseUrl}${imgObj.url}` : imgObj.url;
  };

  if (!item) return <View style={styles.container}><Text>ไม่พบข้อมูล</Text></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>รายละเอียดการเบิกเงิน</Text>
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
  header: { backgroundColor: '#1e293b', padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 5 },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: 'bold', marginLeft: 10 },
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