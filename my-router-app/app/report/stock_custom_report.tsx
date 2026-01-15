import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Modal, Switch, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Picker } from '@react-native-picker/picker'; // *ต้องติดตั้งเพิ่มถ้ายังไม่มี: npx expo install @react-native-picker/picker

import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function StockCustomReportScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter States
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Load Categories & Initial Data
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      // Strapi v5 structure check
      setCategories([{ name: 'All', id: 'all' }, ...json.data]);
    } catch (e) { console.log('Err Cat', e); }
  };

  // Function ดึงข้อมูลสินค้าตาม Filter
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = `${API_URL}/products?populate=*&pagination[limit]=1000`; // ดึงเยอะหน่อยเพื่อทำ Report

      // 1. Filter Category
      if (selectedCategory !== 'All') {
        // เช็คชื่อ field ให้ตรงกับ strapi ของคุณ (category.name หรือ categories.id)
        query += `&filters[category][name][$eq]=${selectedCategory}`;
      }

      // 2. Filter Low Stock (สมมติ < 10)
      if (showLowStockOnly) {
        query += `&filters[qty][$lte]=10`;
      }

      const res = await fetch(query, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setProducts(json.data || []);

    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถดึงข้อมูลสินค้าได้');
    } finally {
      setLoading(false);
    }
  };

  // กดปุ่มค้นหา/แสดงผล
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, showLowStockOnly]);

  // ฟังก์ชันสร้าง PDF
  const generatePDF = async () => {
    if (products.length === 0) return Alert.alert('แจ้งเตือน', 'ไม่มีข้อมูลสินค้าในรายการ');

    const tableRows = products.map((item, index) => {
        const catName = item.category?.name || '-';
        return `
            <tr>
                <td style="text-align:center">${index + 1}</td>
                <td>${item.name}</td>
                <td style="text-align:center">${catName}</td>
                <td style="text-align:right">${item.qty || 0} ${item.unit || 'หน่วย'}</td>
            </tr>
        `;
    }).join('');

    const htmlContent = `
        <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                    h1 { text-align: center; margin-bottom: 5px; }
                    h3 { text-align: center; color: #555; margin-top: 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #333; padding: 8px; font-size: 12px; }
                    th { background-color: #f0f0f0; }
                </style>
            </head>
            <body>
                <h1>รายงานสินค้าคงคลัง</h1>
                <h3>เงื่อนไข: ${selectedCategory === 'All' ? 'ทุกหมวดหมู่' : selectedCategory} ${showLowStockOnly ? '(เฉพาะสินค้าใกล้หมด)' : ''}</h3>
                <p>ข้อมูล ณ วันที่: ${new Date().toLocaleDateString('th-TH')}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th width="10%">ลำดับ</th>
                            <th>ชื่อสินค้า</th>
                            <th width="20%">หมวดหมู่</th>
                            <th width="20%">คงเหลือ</th>
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
    } catch (e) {
        Alert.alert('Error', 'สร้าง PDF ไม่สำเร็จ');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>📊 รายงานสต็อก (Custom)</Text>
        <TouchableOpacity onPress={generatePDF}>
             <Ionicons name="print-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.filterBox}>
         <Text style={styles.label}>เลือกหมวดหมู่:</Text>
         <View style={styles.pickerWrapper}>
             <Picker
                selectedValue={selectedCategory}
                onValueChange={(val) => setSelectedCategory(val)}
             >
                {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.name} />)}
             </Picker>
         </View>

         <View style={styles.switchRow}>
             <Text style={styles.label}>แสดงเฉพาะของใกล้หมด (Low Stock):</Text>
             <Switch value={showLowStockOnly} onValueChange={setShowLowStockOnly} />
         </View>
      </View>

      {/* List Preview */}
      <View style={styles.listHeader}>
          <Text style={{fontWeight:'bold'}}>รายการสินค้า ({products.length})</Text>
      </View>

      {loading ? <ActivityIndicator size="large" color="#3b82f6" style={{marginTop:20}} /> : (
          <FlatList 
            data={products}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{paddingBottom: 20}}
            renderItem={({item, index}) => (
                <View style={styles.itemRow}>
                    <Text style={{width: 30, color:'#888'}}>{index+1}</Text>
                    <View style={{flex:1}}>
                        <Text style={{fontWeight:'bold'}}>{item.name}</Text>
                        <Text style={{fontSize:12, color:'#666'}}>{item.category?.name || '-'}</Text>
                    </View>
                    <Text style={{fontWeight:'bold', color: item.qty <= 10 ? 'red' : 'green'}}>
                        {item.qty} {item.unit}
                    </Text>
                </View>
            )}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  filterBox: { padding: 15, backgroundColor: 'white', margin: 15, borderRadius: 10, elevation: 2 },
  label: { fontSize: 14, color: '#333', marginBottom: 5 },
  pickerWrapper: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, marginBottom: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listHeader: { paddingHorizontal: 20, marginBottom: 10 },
  itemRow: { flexDirection: 'row', padding: 15, backgroundColor: 'white', marginHorizontal: 15, marginBottom: 8, borderRadius: 8, alignItems:'center' }
});