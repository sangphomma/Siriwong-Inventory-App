import React, { useState, useMemo, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, 
  TextInput, ActivityIndicator, Alert, SafeAreaView, ScrollView, Platform 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

// --- Interfaces ---
interface Category { documentId: string; name: string; }

interface RealLocation {
    id: number;
    name: string;
}

interface StockLocation {
    id: number;
    documentId?: string;
    on_hand_stock: number;
    location?: RealLocation;
    product?: { documentId: string; id: number };
}

interface Product {
    id: number;
    documentId: string;
    name: string;
    sku?: string;
    unit?: string;
    min_stock?: number; // ✅ เพิ่ม field min_stock
    category?: Category;
    // Fields ที่เราจะคำนวณแปะเพิ่มเข้าไป
    _calculated_total?: number;
    _stock_details?: StockLocation[];
}

export default function ManualSelectionReportScreen() {
  const router = useRouter();
  const { token } = useAuth();

  // --- State Data ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<RealLocation[]>([]); 
  const [selectedItems, setSelectedItems] = useState<Product[]>([]);
  
  // UI State
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Search Modal State
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<number | "all">("all");

  // --- Fetch Data ---
  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [])
  );

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const catUrl = `${API_URL}/categories`;
      const prodUrl = `${API_URL}/products?populate=*&pagination[pageSize]=2000`;
      const stockUrl = `${API_URL}/stock-locations?filters[on_hand_stock][$gt]=0&populate[location][fields][0]=name&populate[product][fields][0]=documentId&pagination[limit]=2000`;

      const [resCats, resProds, resStocks] = await Promise.all([
        fetch(catUrl, { headers }),
        fetch(prodUrl, { headers }),
        fetch(stockUrl, { headers })
      ]);

      const jsonCats = await resCats.json();
      const jsonProds = await resProds.json();
      const jsonStocks = await resStocks.json();

      const rawProducts = jsonProds.data || [];
      const rawStocks = jsonStocks.data || [];

      // 1. Extract Unique Locations
      const locMap = new Map<number, RealLocation>();
      rawStocks.forEach((s: any) => {
          if (s.location && s.location.id) {
              locMap.set(s.location.id, s.location);
          }
      });
      const uniqueLocs = Array.from(locMap.values()).sort((a,b) => a.name.localeCompare(b.name));
      setLocations(uniqueLocs);

      // 2. Map Products with Stock
      const mappedProducts = rawProducts.map((p: any) => {
          const myStocks = rawStocks.filter((s: any) => 
            (s.product?.documentId === p.documentId) || (s.product?.id === p.id)
          );
          
          const totalStock = myStocks.reduce((sum: number, s: any) => sum + (s.on_hand_stock || 0), 0);
          
          return { 
              ...p, 
              _calculated_total: totalStock,
              _stock_details: myStocks 
          };
      });

      setCategories(jsonCats.data || []);
      setProducts(mappedProducts);

    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setInitialLoading(false);
    }
  };

  // --- Filter Logic ---
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // 1. Category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category?.documentId === selectedCategory);
    }

    // 2. Location
    if (selectedLocation !== "all") {
        filtered = filtered.filter(p => 
            p._stock_details?.some(stock => stock.location?.id === selectedLocation)
        );
    }
    
    // 3. Search
    if (searchQuery) {
      filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return filtered;
  }, [products, selectedCategory, selectedLocation, searchQuery]);

  // --- Helper: Get Stock Count ---
  const getStockInSelectedLocation = (item: Product) => {
      if (selectedLocation === 'all') return item._calculated_total || 0;
      
      const stockInLoc = item._stock_details?.find(s => s.location?.id === selectedLocation);
      return stockInLoc ? stockInLoc.on_hand_stock : 0;
  };

  // --- Actions ---
  const handleAddItem = (item: Product) => {
    const isExist = selectedItems.find(p => p.documentId === item.documentId);
    if (isExist) {
        Alert.alert("แจ้งเตือน", "สินค้านี้อยู่ในรายการแล้ว");
        return;
    }
    setSelectedItems([...selectedItems, item]);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleRemoveItem = (documentId: string) => {
    setSelectedItems(prev => prev.filter(item => item.documentId !== documentId));
  };

  const getStockDetailString = (item: Product) => {
      if (!item._stock_details || item._stock_details.length === 0) return "-";
      return item._stock_details.map(s => `${s.location?.name || 'Unknown'}: ${s.on_hand_stock}`).join(', ');
  };

  // --- PDF Generation ---
  const generatePDF = async () => {
    if (selectedItems.length === 0) return Alert.alert("แจ้งเตือน", "กรุณาเลือกสินค้าก่อนพิมพ์");
    setLoading(true);

    try {
        const rows = selectedItems.map((item, index) => {
            const details = getStockDetailString(item);
            const currentStock = item._calculated_total || 0;
            const minStock = item.min_stock || 0;
            
            // ✅ คำนวณยอดที่ต้องสั่งเพิ่ม
            const needsRestock = currentStock < minStock;
            const orderAmount = needsRestock ? (minStock - currentStock) : 0;
            
            // Highlight สีแดงถ้าต้องสั่งเพิ่ม
            const rowStyle = needsRestock ? 'color: #dc2626;' : ''; // สีแดงเข้ม
            const orderCellStyle = needsRestock ? 'font-weight: bold; color: red;' : 'color: #ccc;';

            return `
                <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}; ${rowStyle}">
                    <td style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">${index + 1}</td>
                    <td style="padding:8px; border-bottom:1px solid #ddd;">
                        <b>${item.name}</b><br/>
                        <span style="font-size:10px; color:#666;">SKU: ${item.sku || '-'}</span>
                    </td>
                    <td style="padding:8px; font-size:10px; color:#444; border-bottom:1px solid #ddd;">${details}</td>
                    <td style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">${currentStock}</td>
                    <td style="padding:8px; text-align:center; border-bottom:1px solid #ddd;">${minStock}</td>
                    <td style="padding:8px; text-align:right; border-bottom:1px solid #ddd; ${orderCellStyle}">
                        ${orderAmount > 0 ? `+${orderAmount}` : '-'} ${item.unit || ''}
                    </td>
                </tr>
            `;
        }).join('');

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
                    <h2 style="text-align:center; color:#333;">รายงานตรวจสอบสินค้า & สั่งซื้อ</h2>
                    <p style="text-align:center; font-size:12px; color:#666;">วันที่พิมพ์: ${new Date().toLocaleString('th-TH')}</p>
                    <table>
                        <thead>
                            <tr>
                                <th width="5%">#</th>
                                <th width="30%">สินค้า</th>
                                <th width="25%">จุดเก็บ</th>
                                <th width="10%" style="text-align:center;">คงเหลือ</th>
                                <th width="10%" style="text-align:center;">ขั้นต่ำ</th>
                                <th width="20%" style="text-align:right;">ควรสั่งเพิ่ม</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <div class="footer">Siriwong Inventory System</div>
                </body>
            </html>
        `;

        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri);
    } catch (e) {
        Alert.alert('Error', 'สร้าง PDF ไม่สำเร็จ');
    } finally {
        setLoading(false);
    }
  };

  // --- Render Empty State ---
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="basket" size={60} color="#3b82f6" />
      </View>
      <Text style={styles.emptyTitle}>เริ่มสร้างรายงาน</Text>
      <Text style={styles.emptySubtitle}>เลือกสินค้าเพื่อตรวจสอบสต็อกและยอดสั่งซื้อ</Text>
      
      <TouchableOpacity 
        style={styles.bigCenterButton} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="search" size={24} color="white" style={{marginRight: 10}} />
        <Text style={styles.bigCenterButtonText}>ค้นหาสินค้า</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📝 รายงาน & สั่งซื้อ</Text>
        {selectedItems.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedItems([])}>
                <Text style={{color:'#ef4444', fontSize:14}}>ล้างค่า</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* Main List */}
      <FlatList
        data={selectedItems}
        keyExtractor={item => item.documentId}
        contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item, index }) => {
            // คำนวณ Logic แสดงผลใน Card
            const currentStock = item._calculated_total || 0;
            const minStock = item.min_stock || 0;
            const needsRestock = currentStock < minStock;
            const orderAmount = minStock - currentStock;

            return (
              <View style={[styles.card, needsRestock && {borderLeftWidth: 5, borderLeftColor: '#ef4444'}]}>
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    <Text style={styles.cardIndex}>#{index + 1}</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(item.documentId)} style={{padding:5}}>
                        <Ionicons name="trash-outline" size={22} color="#ef4444" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.cardTitle}>{item.name}</Text>
                
                {/* แถวแสดง Location */}
                <Text style={{fontSize:12, color:'#64748b', marginBottom: 8}}>
                    📍 {getStockDetailString(item)}
                </Text>

                {/* แถวแสดงตัวเลข 3 ช่อง */}
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>คงเหลือ</Text>
                        <Text style={[styles.statValue, {color: '#3b82f6'}]}>{currentStock}</Text>
                    </View>
                    <View style={[styles.statBox, {borderLeftWidth:1, borderRightWidth:1, borderColor:'#eee'}]}>
                        <Text style={styles.statLabel}>ขั้นต่ำ</Text>
                        <Text style={[styles.statValue, {color: '#64748b'}]}>{minStock}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, needsRestock && {color:'#ef4444', fontWeight:'bold'}]}>
                            สั่งเพิ่ม
                        </Text>
                        {needsRestock ? (
                            <Text style={[styles.statValue, {color: '#ef4444', fontWeight:'bold'}]}>
                                +{orderAmount}
                            </Text>
                        ) : (
                            <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{marginTop:2}} />
                        )}
                    </View>
                </View>
              </View>
            );
        }}
      />

      {/* --- Footer ปุ่มใหญ่ --- */}
      {selectedItems.length > 0 && (
        <View style={styles.bigFooter}>
            <TouchableOpacity 
                style={[styles.bigFooterBtn, {backgroundColor: '#10b981', flex: 1, marginRight: 10}]} 
                onPress={generatePDF}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white"/> : (
                    <>
                        <Ionicons name="print" size={24} color="white" />
                        <Text style={styles.bigFooterText}>PDF ({selectedItems.length})</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.bigFooterBtn, {backgroundColor: '#3b82f6', flex: 1.5}]} 
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add-circle" size={28} color="white" />
                <Text style={styles.bigFooterText}>เพิ่มรายการ</Text>
            </TouchableOpacity>
        </View>
      )}

      {/* --- Search Modal --- */}
      <Modal visible={isModalVisible} animationType="slide">
        <SafeAreaView style={{flex:1, backgroundColor: 'white'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
                <Text style={styles.modalTitle}>เลือกสินค้า</Text>
                <View style={{width:28}}/>
            </View>
            
            <View style={{maxHeight: 110}}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    <TouchableOpacity style={[styles.filterTab, selectedCategory === 'all' && styles.filterTabActive]} onPress={() => setSelectedCategory('all')}>
                        <Text style={[styles.filterText, selectedCategory === 'all' && styles.filterTextActive]}>ทุกหมวดหมู่</Text>
                    </TouchableOpacity>
                    {categories.map(c => (
                        <TouchableOpacity key={c.documentId} style={[styles.filterTab, selectedCategory === c.documentId && styles.filterTabActive]} onPress={() => setSelectedCategory(c.documentId)}>
                            <Text style={[styles.filterText, selectedCategory === c.documentId && styles.filterTextActive]}>{c.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, {marginTop: 0}]}>
                    <TouchableOpacity style={[styles.locTab, selectedLocation === 'all' && styles.locTabActive]} onPress={() => setSelectedLocation('all')}>
                        <Ionicons name="business" size={14} color={selectedLocation === 'all' ? 'white' : '#64748b'} style={{marginRight:4}}/>
                        <Text style={[styles.filterText, selectedLocation === 'all' && styles.filterTextActive]}>ทุกจุดเก็บ</Text>
                    </TouchableOpacity>
                    {locations.map(loc => (
                        <TouchableOpacity key={loc.id} style={[styles.locTab, selectedLocation === loc.id && styles.locTabActive]} onPress={() => setSelectedLocation(loc.id)}>
                            <Ionicons name="location" size={14} color={selectedLocation === loc.id ? 'white' : '#64748b'} style={{marginRight:4}}/>
                            <Text style={[styles.filterText, selectedLocation === loc.id && styles.filterTextActive]}>{loc.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput 
                    style={styles.input} 
                    placeholder="ค้นหาชื่อสินค้า..." 
                    value={searchQuery}
                    onChangeText={setSearchQuery} 
                />
            </View>

            {initialLoading ? <ActivityIndicator style={{marginTop:20}} color="#3b82f6"/> : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={item => item.documentId}
                    contentContainerStyle={{padding:15}}
                    renderItem={({ item }) => {
                        const displayStock = getStockInSelectedLocation(item) || 0;
                        // เพิ่มการแสดงสถานะ Low Stock ใน Modal ด้วย
                        const isLow = (item._calculated_total || 0) < (item.min_stock || 0);

                        return (
                            <TouchableOpacity style={styles.searchItem} onPress={() => handleAddItem(item)}>
                                <View style={{flex:1}}>
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <Text style={styles.searchName}>{item.name}</Text>
                                        {isLow && <View style={styles.lowStockBadge}><Text style={styles.lowStockText}>ใกล้หมด</Text></View>}
                                    </View>
                                    <View style={{flexDirection:'row', flexWrap:'wrap'}}>
                                        <Text style={{fontSize:11, color:'#64748b', marginRight:8}}>SKU: {item.sku || '-'}</Text>
                                    </View>
                                </View>
                                <View style={{alignItems:'flex-end'}}>
                                    <Text style={{color: displayStock > 0 ? '#10b981' : '#ef4444', fontWeight:'bold'}}>
                                        {displayStock} {item.unit}
                                    </Text>
                                    {selectedLocation !== 'all' && (
                                        <Text style={{fontSize:9, color:'#64748b'}}>(เฉพาะจุดนี้)</Text>
                                    )}
                                    <Ionicons name="add-circle" size={24} color="#3b82f6" style={{marginTop:4}} />
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  
  // Card List (ปรับใหม่ให้มีช่อง Stats)
  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor:'#000', shadowOpacity:0.05 },
  cardIndex: { fontSize: 12, color: '#94a3b8', fontWeight:'bold' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 4, marginBottom: 8 },
  
  statsContainer: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 5 },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, color: '#64748b', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: 'bold' },

  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 60 },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginBottom: 5 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 30 },
  bigCenterButton: { 
    flexDirection: 'row', backgroundColor: '#ec4899', 
    paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, 
    alignItems: 'center', elevation: 5, shadowColor: '#ec4899', shadowOpacity: 0.3 
  },
  bigCenterButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Footer
  bigFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white',
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: Platform.OS === 'android' ? 30 : 20, 
    borderTopWidth: 1, borderTopColor: '#e2e8f0',
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
  },
  bigFooterBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    height: 55, 
    borderRadius: 12,
  },
  bigFooterText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  // Modal & Search
  modalHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  filterScroll: { maxHeight: 45, marginVertical: 5, paddingHorizontal: 10 },
  filterTab: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, height: 32, justifyContent:'center' },
  filterTabActive: { backgroundColor: '#3b82f6' },
  locTab: { flexDirection:'row', alignItems:'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth:1, borderColor:'#e2e8f0', marginRight: 8, height: 32 },
  locTabActive: { backgroundColor: '#475569', borderColor:'#475569' },
  filterText: { fontSize: 13, color: '#64748b' },
  filterTextActive: { color: 'white', fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 10, paddingHorizontal: 10, borderRadius: 8 },
  input: { flex: 1, padding: 10, fontSize: 16 },
  searchItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
  searchName: { fontSize: 15, fontWeight: '500', color: '#333' },
  
  // Badge ใหม่สำหรับสินค้าใกล้หมดใน Modal
  lowStockBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  lowStockText: { color: '#dc2626', fontSize: 10, fontWeight: 'bold' }
});