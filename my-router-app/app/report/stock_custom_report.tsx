import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Switch, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Picker } from '@react-native-picker/picker'; 

import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

// --- Interfaces ---
interface StockLocation {
    id: number;
    on_hand_stock: number;
    location?: { id: number; name: string };
}

interface Product {
    id: number;
    documentId: string;
    name: string;
    sku?: string;
    min_stock: number;
    unit: string;
    category?: { name: string };
    stock_locations?: StockLocation[];
    
    // Field พิเศษที่คำนวณแล้ว
    _calculated_total?: number; 
}

interface RealLocation {
    id: number;
    name: string;
}

export default function StockCustomReportScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filter States
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<RealLocation[]>([]); // ✅ State เก็บรายชื่อจุดเก็บ
  
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState<number | 'all'>('all'); // ✅ State เลือกจุดเก็บ
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => { 
      fetchCategories(); 
      fetchLocations(); // ✅ ดึงรายชื่อจุดเก็บ
  }, []);

  useEffect(() => { 
      fetchProducts(); 
  }, [selectedCategory, selectedLocation, showLowStockOnly]); // ✅ Reload เมื่อเปลี่ยน Location

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      setCategories([{ name: 'All', id: 'all' }, ...json.data]);
    } catch (e) { console.log('Err Cat', e); }
  };

  // ✅ ฟังก์ชันดึงรายชื่อจุดเก็บ (เหมือนหน้า Manual)
  const fetchLocations = async () => {
      try {
          const res = await fetch(`${API_URL}/stock-locations?populate[location][fields][0]=name&pagination[limit]=2000`, { 
              headers: { 'Authorization': `Bearer ${token}` } 
          });
          const json = await res.json();
          const rawStocks = json.data || [];
          
          // Extract Unique Locations
          const locMap = new Map<number, RealLocation>();
          rawStocks.forEach((s: any) => {
              if (s.location && s.location.id) {
                  locMap.set(s.location.id, s.location);
              }
          });
          const uniqueLocs = Array.from(locMap.values()).sort((a,b) => a.name.localeCompare(b.name));
          setLocations(uniqueLocs);
      } catch (e) { console.log('Err Loc', e); }
  };

const fetchProducts = async () => {
    setLoading(true);
    try {
      // Query พื้นฐาน
      let query = `${API_URL}/products?populate[category]=true&populate[stock_locations][populate]=location&sort=name:asc&pagination[limit]=2000`; 

      if (selectedCategory !== 'All') {
        query += `&filters[category][name][$eq]=${selectedCategory}`;
      }

      const res = await fetch(query, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      let fetchedProducts: Product[] = json.data || [];

      // 1. คำนวณยอด (Map)
      let processedProducts = fetchedProducts.map(item => {
          const locations = item.stock_locations || [];
          let stockToCount = 0;

          if (selectedLocation === 'all') {
              // รวมทุกจุด
              stockToCount = locations.reduce((sum, loc) => sum + (loc.on_hand_stock || 0), 0);
          } else {
              // เฉพาะจุดที่เลือก
              const targetLoc = locations.find(l => l.location?.id === selectedLocation);
              stockToCount = targetLoc ? (targetLoc.on_hand_stock || 0) : 0;
          }
          
          return {
              ...item,
              _calculated_total: stockToCount
          };
      });

      // ✅ 2. (เพิ่มใหม่) กรองรายการออก: ถ้าเลือกเจาะจง Location ให้โชว์เฉพาะที่มีของ (>0)
      if (selectedLocation !== 'all') {
          processedProducts = processedProducts.filter(item => (item._calculated_total || 0) > 0);
      }

      // 3. กรอง Low Stock (ถ้าเปิด Switch)
      if (showLowStockOnly) {
        processedProducts = processedProducts.filter(item => {
              const currentStock = item._calculated_total || 0;
              const threshold = item.min_stock || 0;
              return currentStock < threshold; 
          });
      }

      setProducts(processedProducts);

    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถดึงข้อมูลสินค้าได้');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper: สร้าง string แสดงรายละเอียดจุดเก็บ ---
  const getLocDetails = (item: Product) => {
      const locs = item.stock_locations || [];
      if (selectedLocation !== 'all') {
          // ถ้าเลือก Location ให้โชว์แค่ชื่อ Location นั้น
          const l = locations.find(loc => loc.id === selectedLocation);
          return l ? l.name : '-';
      }
      // ถ้าเลือก All ให้โชว์หมด
      return locs.length > 0 
        ? locs.map(l => `${l.location?.name || '?'}: ${l.on_hand_stock}`).join(', ')
        : '-';
  };

  const generatePDF = async () => {
    if (products.length === 0) return Alert.alert('แจ้งเตือน', 'ไม่มีข้อมูลสินค้าในรายการ');

    const tableRows = products.map((item, index) => {
        const minVal = item.min_stock || 0;
        const currentStock = item._calculated_total || 0;
        
        // Logic คำนวณยอดสั่งเพิ่ม
        const needsRestock = currentStock < minVal;
        const orderAmount = needsRestock ? (minVal - currentStock) : 0;

        // Styles
        const rowStyle = needsRestock ? 'color: #dc2626;' : ''; 
        const orderCellStyle = needsRestock ? 'font-weight: bold; color: red;' : 'color: #ccc;';

        const locDetail = getLocDetails(item);

        return `
            <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}; ${rowStyle}">
                <td style="text-align:center; padding:8px; border-bottom:1px solid #ddd;">${index + 1}</td>
                <td style="padding:8px; border-bottom:1px solid #ddd;">
                    <b>${item.name}</b><br/>
                    <span style="font-size:10px; color:#666;">SKU: ${item.sku || '-'}</span>
                </td>
                <td style="font-size:10px; color:#444; padding:8px; border-bottom:1px solid #ddd;">${locDetail}</td>
                <td style="text-align:center; padding:8px; border-bottom:1px solid #ddd;">${currentStock}</td>
                <td style="text-align:center; padding:8px; border-bottom:1px solid #ddd;">${minVal}</td>
                <td style="text-align:right; padding:8px; border-bottom:1px solid #ddd; ${orderCellStyle}">
                    ${orderAmount > 0 ? `+${orderAmount}` : '-'} ${item.unit}
                </td>
            </tr>
        `;
    }).join('');

    // ส่วนหัวรายงาน
    const filterText = `หมวด: ${selectedCategory} | จุดเก็บ: ${selectedLocation === 'all' ? 'ทั้งหมด' : locations.find(l=>l.id===selectedLocation)?.name}`;

    const htmlContent = `
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background-color: #4f46e5; color: white; padding: 10px; text-align: left; font-size: 11px; }
                    .footer { margin-top: 30px; text-align: right; font-size: 10px; color: #888; }
                </style>
            </head>
            <body>
                <h2 style="text-align:center; color:#333;">รายงานตรวจสอบสต็อก & สั่งซื้อ</h2>
                <p style="text-align:center; font-size:12px; color:#666;">${filterText}</p>
                <p style="text-align:center; font-size:12px; color:#666;">วันที่พิมพ์: ${new Date().toLocaleString('th-TH')}</p>
                
                <table>
                    <thead>
                        <tr>
                            <th width="5%">#</th>
                            <th width="30%">สินค้า</th>
                            <th width="25%">รายละเอียดจุดเก็บ</th>
                            <th width="10%" style="text-align:center;">คงเหลือ</th>
                            <th width="10%" style="text-align:center;">ขั้นต่ำ</th>
                            <th width="20%" style="text-align:right;">ควรสั่งเพิ่ม</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <div class="footer">Siriwong Inventory System (Auto Report)</div>
            </body>
        </html>
    `;

    try {
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert('Error', 'สร้าง PDF ไม่สำเร็จ'); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>📊 รายงานสต็อก</Text>
        <TouchableOpacity onPress={generatePDF}>
             <Ionicons name="print" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterBox}>
         
         {/* Row 1: Category */}
         <View style={{marginBottom: 10}}>
             <Text style={styles.label}>หมวดหมู่:</Text>
             <View style={styles.pickerWrapper}>
                 <Picker selectedValue={selectedCategory} onValueChange={setSelectedCategory} style={styles.picker}>
                    {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.name} style={{fontSize:14}} />)}
                 </Picker>
             </View>
         </View>

         {/* Row 2: Location (เพิ่มใหม่) */}
         <View style={{marginBottom: 10}}>
             <Text style={styles.label}>จุดเก็บสินค้า:</Text>
             <View style={styles.pickerWrapper}>
                 <Picker selectedValue={selectedLocation} onValueChange={setSelectedLocation} style={styles.picker}>
                    <Picker.Item label="รวมทุกจุดเก็บ (All Locations)" value="all" style={{fontSize:14}} />
                    {locations.map(loc => <Picker.Item key={loc.id} label={loc.name} value={loc.id} style={{fontSize:14}} />)}
                 </Picker>
             </View>
         </View>

         <View style={styles.switchRow}>
             <View>
                <Text style={styles.label}>แสดงเฉพาะของใกล้หมด:</Text>
                <Text style={{fontSize:10, color:'#888'}}>
                    {selectedLocation === 'all' ? '(สต็อกรวม < ขั้นต่ำ)' : '(สต็อกจุดนี้ < ขั้นต่ำ)'}
                </Text>
             </View>
             <Switch value={showLowStockOnly} onValueChange={setShowLowStockOnly} trackColor={{false: "#767577", true: "#fca5a5"}} thumbColor={showLowStockOnly ? "#ef4444" : "#f4f3f4"} />
         </View>
      </View>

      <View style={styles.listHeader}>
          <Text style={{fontWeight:'bold', color:'#333'}}>รายการสินค้า ({products.length})</Text>
          <View style={{flexDirection:'row'}}>
             <Text style={{fontSize:12, color:'#666', marginRight:10}}>คงเหลือ</Text>
             <Text style={{fontSize:12, color:'#666'}}>สั่งเพิ่ม</Text>
          </View>
      </View>

      {loading ? <ActivityIndicator size="large" color="#3b82f6" style={{marginTop:20}} /> : (
          <FlatList 
            data={products}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{paddingBottom: 20}}
            renderItem={({item, index}) => {
                const minVal = item.min_stock || 0;
                const totalStock = item._calculated_total || 0;
                const needsRestock = totalStock < minVal;
                const orderAmount = minVal - totalStock;

                return (
                    <View style={[styles.itemRow, needsRestock && styles.lowStockRow]}>
                        <Text style={{width: 30, color:'#888', fontSize:12}}>{index+1}</Text>
                        <View style={{flex:1}}>
                            <Text style={{fontWeight:'bold', fontSize:14, color: '#333'}}>{item.name}</Text>
                            
                            {/* แสดงรายละเอียดจุดเก็บ */}
                            <Text style={{fontSize:11, color:'#666', marginTop:2}}>
                                📍 {getLocDetails(item)}
                            </Text>
                        </View>
                        
                        <View style={{alignItems:'flex-end', minWidth: 80}}>
                            {/* บรรทัดบน: คงเหลือ / ขั้นต่ำ */}
                            <Text style={{fontSize:14, color: '#333'}}>
                                {totalStock} <Text style={{fontSize:10, color:'#999'}}>/ {minVal}</Text>
                            </Text>
                            
                            {/* บรรทัดล่าง: สั่งเพิ่ม (ถ้าต้องสั่ง) */}
                            {needsRestock ? (
                                <Text style={{fontSize:12, color:'#ef4444', fontWeight:'bold'}}>
                                    +{orderAmount} {item.unit}
                                </Text>
                            ) : (
                                <Ionicons name="checkmark-circle" size={16} color="#10b981" style={{marginTop:2}} />
                            )}
                        </View>
                    </View>
                );
            }}
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
  label: { fontSize: 14, color: '#333', marginBottom: 5, fontWeight:'600' },
  pickerWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor:'#f8fafc', height: 50, justifyContent:'center' },
  picker: { height: 50, width: '100%' }, // ปรับ Picker ให้เต็มกรอบ
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 10, alignItems:'center' },
  itemRow: { flexDirection: 'row', padding: 15, backgroundColor: 'white', marginHorizontal: 15, marginBottom: 8, borderRadius: 8, alignItems:'center', elevation: 1 },
  lowStockRow: { borderLeftWidth: 4, borderLeftColor: '#ef4444' }
});