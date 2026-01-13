import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print'; // ✅ เพิ่ม Import
import * as Sharing from 'expo-sharing'; // ✅ เพิ่ม Import
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

// --- Interfaces ---
interface StockLocationItem {
  id: number;
  documentId: string;
  quantity?: number;
  on_hand_stock?: number;
  location?: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  documentId: string;
  name: string;
  sku: string;
  category?: Category;
  stock_locations?: StockLocationItem[];
}

export default function StockBalanceReport() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  
  // --- Filters State ---
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const queryItems = [
        'populate[stock_locations][populate][location][fields][0]=name',
        'populate[stock_locations][fields][0]=on_hand_stock',
        'populate[category][fields][0]=name',
        'sort=name:asc'
      ];

      const url = `${API_URL}/products?${queryItems.join('&')}`;
      console.log("🚀 Calling API:", url);

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const json = await res.json();
      
      if (res.ok && json.data) {
        setProducts(json.data);
      } else {
        console.warn("❌ API Error:", json);
      }

    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Logic Helpers ---
  const { uniqueCategories, uniqueLocations } = useMemo(() => {
    const cats = new Set<string>(['All']);
    const locs = new Set<string>(['All']);
    products.forEach(p => {
      if (p.category?.name) cats.add(p.category.name);
      else cats.add('ไม่ระบุหมวด');
      p.stock_locations?.forEach(sl => {
        if (sl.location?.name) locs.add(sl.location.name);
      });
    });
    return { uniqueCategories: Array.from(cats), uniqueLocations: Array.from(locs) };
  }, [products]);

  const calculateTotalStock = (locations: StockLocationItem[] | undefined) => {
    if (!locations || !Array.isArray(locations)) return 0;
    return locations.reduce((sum, loc) => sum + (loc.on_hand_stock || 0), 0);
  };

  const getLocationName = (loc: StockLocationItem) => {
    return loc.location?.name || "ไม่ระบุโซน";
  };

  // --- 🎯 Filtered Data (ข้อมูลชุดเดียวกับที่แสดงหน้าจอ) ---
  const filteredData = useMemo(() => {
    return products.filter(p => {
      const matchText = (p.name || '').toLowerCase().includes(searchText.toLowerCase()) || 
                        (p.sku || '').toLowerCase().includes(searchText.toLowerCase());
      const pCatName = p.category?.name || 'ไม่ระบุหมวด';
      const matchCategory = selectedCategory === 'All' || pCatName === selectedCategory;
      const matchLocation = selectedLocation === 'All' 
        ? true 
        : p.stock_locations?.some(loc => getLocationName(loc) === selectedLocation);

      return matchText && matchCategory && matchLocation;
    });
  }, [products, searchText, selectedCategory, selectedLocation]);

  // --- 🖨️ PDF Generation Function ---
  const generatePDF = async () => {
    try {
      // 1. สร้างแถวตาราง HTML (Table Rows) จาก filteredData
      const tableRows = filteredData.map((item, index) => {
        const total = calculateTotalStock(item.stock_locations);
        
        // สร้างรายการ Location ย่อยๆ ในเซลล์เดียว
        let locDetails = '-';
        if (item.stock_locations && item.stock_locations.length > 0) {
            // กรอง Location ตามที่เลือก (เหมือนหน้าจอ)
            const activeLocs = selectedLocation === 'All' 
                ? item.stock_locations 
                : item.stock_locations.filter(l => getLocationName(l) === selectedLocation);
            
            locDetails = activeLocs.map(l => 
                `<div style="font-size: 10px; color: #555;">${getLocationName(l)}: <b>${l.on_hand_stock || 0}</b></div>`
            ).join('');
        }

        return `
          <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${index + 1}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">
                <b>${item.name}</b><br/>
                <span style="font-size: 10px; color: #888;">${item.sku || '-'}</span>
            </td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.category?.name || '-'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${locDetails}</td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${total}</td>
          </tr>
        `;
      }).join('');

      // 2. สร้างโครงสร้าง HTML เต็มรูปแบบ (A4 Template)
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
               body { font-family: 'Helvetica', sans-serif; padding: 20px; }
               h1 { color: #1e3a8a; margin-bottom: 5px; }
               .header-info { font-size: 12px; color: #555; margin-bottom: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
               table { width: 100%; border-collapse: collapse; margin-top: 10px; }
               th { background-color: #1e3a8a; color: white; text-align: left; padding: 10px; font-size: 12px; }
               td { font-size: 12px; }
               .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 10px; color: #aaa; }
            </style>
          </head>
          <body>
            <h1>รายงานสินค้าคงเหลือ (Stock Balance)</h1>
            
            <div class="header-info">
               พิมพ์วันที่: ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })} น.<br/>
               เงื่อนไขการกรอง: หมวดหมู่ [${selectedCategory}] | โซน [${selectedLocation}] <br/>
               จำนวนรายการ: ${filteredData.length} รายการ
            </div>

            <table>
              <thead>
                <tr>
                  <th width="5%">#</th>
                  <th width="35%">สินค้า / SKU</th>
                  <th width="15%">หมวดหมู่</th>
                  <th width="30%">จุดจัดเก็บ</th>
                  <th width="15%" style="text-align: right;">รวม</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <div class="footer">
                Siriwong Inventory System - Generated by Expo
            </div>
          </body>
        </html>
      `;

      // 3. สร้างไฟล์ PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log('PDF saved to:', uri);

      // 4. แชร์ไฟล์ (เพื่อให้ User กด Save หรือส่งต่อ)
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
      console.error("PDF Error:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถสร้าง PDF ได้");
    }
  };

  const renderItem = ({ item, index }: { item: Product, index: number }) => {
    const totalStock = calculateTotalStock(item.stock_locations);
    const isOutOfStock = totalStock === 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{flex:1}}>
             <Text style={styles.productName}>{index + 1}. {item.name}</Text>
             <View style={{flexDirection:'row', gap: 5, marginTop: 4}}>
                {item.category && (
                    <Text style={styles.categoryTag}>{item.category.name}</Text>
                )}
                <Text style={styles.sku}>#{item.sku || 'No SKU'}</Text>
             </View>
          </View>
          <View style={{alignItems:'flex-end'}}>
             <Text style={[styles.value, isOutOfStock ? styles.textRed : styles.textGreen]}>
                {totalStock}
             </Text>
             <Text style={{fontSize:10, color:'#94a3b8'}}>หน่วย</Text>
          </View>
        </View>

        {item.stock_locations && item.stock_locations.length > 0 ? (
          <View style={styles.locationContainer}>
            {item.stock_locations.map((loc, idx) => {
               if (selectedLocation !== 'All' && getLocationName(loc) !== selectedLocation) return null;
               return (
                  <View key={idx} style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={14} color="#64748b" />
                    <Text style={styles.locationText}> {getLocationName(loc)}: </Text>
                    <Text style={{fontWeight:'bold', color:'#334155'}}>{loc.on_hand_stock || 0}</Text>
                  </View>
               );
            })}
          </View>
        ) : (
          <Text style={styles.emptyLoc}>- ไม่มีการระบุ Location -</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
          <TouchableOpacity onPress={()=> router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>รายงานสินค้าคงเหลือ</Text>
      </View>
      
      {/* Filter Section */}
      <View style={styles.filterContainer}>
        {/* Search */}
        <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#94a3b8" style={{marginRight: 8}} />
            <TextInput 
              style={{flex:1}}
              placeholder="ค้นหาชื่อสินค้า / SKU..."
              value={searchText}
              onChangeText={setSearchText}
            />
        </View>
        
        {/* Category Filter */}
        <View style={{marginTop: 10}}>
            <Text style={styles.filterLabel}>หมวดหมู่:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                {uniqueCategories.map(cat => (
                    <TouchableOpacity 
                        key={cat} 
                        onPress={() => setSelectedCategory(cat)}
                        style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                    >
                        <Text style={{color: selectedCategory === cat ? '#fff' : '#475569', fontSize: 12}}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* Location Filter */}
        <View style={{marginTop: 10}}>
            <Text style={styles.filterLabel}>โซน/คลัง:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
                {uniqueLocations.map(loc => (
                    <TouchableOpacity 
                        key={loc} 
                        onPress={() => setSelectedLocation(loc)}
                        style={[styles.chip, selectedLocation === loc && styles.chipActive]}
                    >
                        <Text style={{color: selectedLocation === loc ? '#fff' : '#475569', fontSize: 12}}>
                            {loc}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      </View>

      {/* List Section */}
      {loading ? (
        <ActivityIndicator size="large" color="#0ea5e9" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => (item.documentId || item.id).toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
          ListEmptyComponent={
            <View style={{alignItems:'center', marginTop: 40}}>
                <Ionicons name="cube-outline" size={50} color="#e2e8f0" />
                <Text style={{marginTop: 10, color:'#94a3b8'}}>ไม่พบข้อมูลสินค้า</Text>
            </View>
          }
        />
      )}

      {/* Floating Action Button for PDF */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={generatePDF} // ✅ เรียกใช้ฟังก์ชัน PDF จริงๆ แล้ว
      >
        <Ionicons name="print" size={24} color="#fff" />
        <Text style={styles.fabText}>PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  headerRow: { flexDirection:'row', alignItems:'center', marginBottom: 15, paddingTop: 10 },
  backBtn: { marginRight: 10, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color:'#1e293b' },
  filterContainer: { marginBottom: 16, backgroundColor: '#fff', padding: 15, borderRadius: 16, elevation:1 },
  searchBox: { flexDirection:'row', alignItems:'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 10, height: 40 },
  filterLabel: { fontSize: 12, color: '#64748b', marginBottom: 6, fontWeight:'600' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth:1, borderColor:'#e2e8f0' },
  chipActive: { backgroundColor: '#0ea5e9', borderColor:'#0ea5e9' },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#0ea5e9', elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productName: { fontSize: 15, fontWeight: '600', color: '#334155' },
  categoryTag: { fontSize: 10, color: '#fff', backgroundColor:'#64748b', paddingHorizontal:6, paddingVertical:2, borderRadius:4, overflow:'hidden' },
  sku: { color: '#64748b', fontSize: 11, backgroundColor:'#f1f5f9', paddingHorizontal:6, paddingVertical:2, borderRadius:4, overflow:'hidden' },
  value: { fontSize: 18, fontWeight: 'bold' },
  textRed: { color: '#ef4444' },
  textGreen: { color: '#10b981' },
  locationContainer: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  locationRow: { flexDirection:'row', alignItems:'center', marginBottom: 2 },
  locationText: { fontSize: 12, color: '#64748b' },
  emptyLoc: { fontStyle: 'italic', marginTop: 4, color: '#ccc', fontSize: 12 },
  fab: { 
      position: 'absolute', bottom: 30, right: 20, 
      backgroundColor: '#dc2626', // เปลี่ยนเป็นสีแดง ให้ดูเหมือนปุ่ม Print PDF
      flexDirection:'row', alignItems:'center',
      paddingVertical: 12, paddingHorizontal: 20, borderRadius: 30, 
      elevation: 5, shadowColor: '#dc2626', shadowOpacity: 0.3
  },
  fabText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 }
});