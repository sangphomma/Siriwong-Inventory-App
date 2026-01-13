import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, Modal, FlatList, ActivityIndicator, 
  KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

// --- Interfaces (เลียนแบบจาก withdraw.tsx แต่ปรับให้เข้ากับ Request) ---
interface Category { documentId: string; name: string; }

interface Product { 
  documentId: string; 
  id: number;
  name: string; 
  unit?: string;
  category?: Category;
  total_stock?: number; // ยอดรวมทุก Location
}

interface CartItem { 
  product: Product; 
  qty: number; 
}

interface ProjectSite {
  documentId: string;
  id: number;
  name: string;
}

export default function CreateRequestScreen() {
  const router = useRouter();
  const { token, user } = useAuth(); // ใช้ user จาก Context

  // --- Data State ---
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form State
  const [selectedSite, setSelectedSite] = useState<ProjectSite | null>(null);
  const [note, setNote] = useState('');

  // --- Modals ---
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [])
  );

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // 1. ดึงข้อมูล Project Site (Active Only)
      const siteUrl = `${API_URL}/project-sites?filters[project_status][$eq]=active&pagination[pageSize]=100`;
      
      // 2. ดึง Categories
      const catUrl = `${API_URL}/categories`;

      // 3. ดึง Products และ StockLocations เพื่อคำนวณยอดรวม
      const prodUrl = `${API_URL}/products?populate=*&pagination[pageSize]=1000`;
      const stockUrl = `${API_URL}/stock-locations?filters[on_hand_stock][$gt]=0&populate[product][fields][0]=documentId&pagination[limit]=2000`;

      const [resSites, resCats, resProds, resStocks] = await Promise.all([
        fetch(siteUrl, { headers }),
        fetch(catUrl, { headers }),
        fetch(prodUrl, { headers }),
        fetch(stockUrl, { headers })
      ]);
      
      const jsonSites = await resSites.json();
      const jsonCats = await resCats.json();
      const jsonProds = await resProds.json();
      const jsonStocks = await resStocks.json();

      const rawProducts = jsonProds.data || [];
      const rawStocks = jsonStocks.data || [];

      // Logic: รวม Stock จากทุก Location เข้าไปใน Product แต่ละตัวเพื่อให้ช่างเห็นยอดรวม
      const mappedProducts = rawProducts.map((p: any) => {
        const myStocks = rawStocks.filter((s: any) => 
            (s.product?.documentId === p.documentId) || (s.product?.id === p.id)
        );
        const totalStock = myStocks.reduce((sum: number, s: any) => sum + (s.on_hand_stock || 0), 0);
        return { ...p, total_stock: totalStock }; 
      });

      setSites(jsonSites.data || []);
      setCategories(jsonCats.data || []);
      setProducts(mappedProducts);

    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setInitialLoading(false);
    }
  };

  // --- Logic Selection ---

  const handleProductSelect = (product: Product) => {
    // เช็คว่ามีของไหม (ดูจากยอดรวม)
    if ((product.total_stock || 0) <= 0) {
        Alert.alert("สินค้าหมด", "ไม่มีสินค้าในสต็อกเลย");
        return;
    }

    // เช็คว่ามีในตะกร้าหรือยัง
    const existingIndex = cart.findIndex(c => c.product.documentId === product.documentId);
    if (existingIndex >= 0) {
        Alert.alert("แจ้งเตือน", "สินค้านี้อยู่ในรายการแล้ว");
        return;
    }

    // เพิ่มลงตะกร้า (เริ่มที่ 1)
    setCart([...cart, { product, qty: 1 }]);
    setShowProductModal(false);
    setSearchQuery("");
  };

  const updateCartQty = (index: number, change: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newQty = item.qty + change;
    const maxStock = item.product.total_stock || 0;

    // Validation
    if (newQty < 1) return;
    if (newQty > maxStock) {
        Alert.alert("แจ้งเตือน", `เบิกได้สูงสุด ${maxStock} ${item.product.unit || 'ชิ้น'}`);
        return;
    }

    item.qty = newQty;
    setCart(newCart);
  };

  const handleSubmit = async () => {
    if (!selectedSite) return Alert.alert("ข้อมูลไม่ครบ", "กรุณาเลือกไซท์งาน");
    if (cart.length === 0) return Alert.alert("ข้อมูลไม่ครบ", "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");

    try {
      setLoading(true);
      const payload = {
        data: {
          job_no: `REQ-${new Date().getTime()}`,
          request_status: 'pending', // สถานะรออนุมัติ
          project_site: selectedSite.documentId || selectedSite.id,
          note: note,
          // user หรือ creator จะถูกผูกโดยอัตโนมัติจาก Token ใน Strapi
          items: cart.map(item => ({
            product: item.product.documentId || item.product.id, // ส่ง Product ID
            qty_request: item.qty
            // *สำคัญ* เรายังไม่ส่ง location_id เพราะ Store จะเป็นคนเลือกตอน Approve
          }))
        }
      };

      const response = await fetch(`${API_URL}/withdrawal-requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert("สำเร็จ", "ส่งใบเบิกเรียบร้อยแล้ว รอ Store อนุมัติ", [
            { text: "ตกลง", onPress: () => router.back() }
        ]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "บันทึกไม่สำเร็จ");
      }
    } catch (error: any) {
      Alert.alert("ผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category?.documentId === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  // UI Helpers
  const getName = (item: any) => item?.name || "ไม่ระบุชื่อ";

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>📝 สร้างใบเบิก (Technician)</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        
        {/* Section 1: Project Site Selection (สิ่งที่ Technician ต้องเลือก) */}
        <View style={styles.card}>
          <Text style={styles.label}>🏗️ ไซท์งาน / โครงการ *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowSiteModal(true)}>
            <Text style={[styles.pickerText, !selectedSite && {color: '#94a3b8'}]}>
              {selectedSite ? getName(selectedSite) : "-- แตะเพื่อเลือกไซท์งาน --"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>

          <Text style={styles.label}>💬 หมายเหตุ (ถ้ามี)</Text>
          <TextInput 
            style={[styles.input, {height: 60}]} 
            placeholder="เช่น รีบใช้, รอของเข้า ฯลฯ" 
            value={note} 
            onChangeText={setNote} 
            multiline 
          />
        </View>

        {/* Section 2: Cart List (Style เหมือน Withdraw แต่ไม่มี Location) */}
        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>📦 รายการเบิก ({cart.length})</Text>
          <TouchableOpacity onPress={() => setShowProductModal(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ เพิ่มสินค้า</Text>
          </TouchableOpacity>
        </View>

        {cart.map((item, index) => (
          <View key={index} style={styles.cartItem}>
            <View style={{flex:1}}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.stockInfo}>
                 (สต็อกรวมที่มี: {item.product.total_stock} {item.product.unit})
              </Text>
            </View>
            
            <View style={styles.qtyControl}>
                <TouchableOpacity onPress={() => updateCartQty(index, -1)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={16} color="white" />
                </TouchableOpacity>
                
                <Text style={styles.qtyText}>{item.qty}</Text>
                
                <TouchableOpacity 
                    onPress={() => updateCartQty(index, 1)} 
                    style={[styles.qtyBtn, item.qty >= (item.product.total_stock||0) && {backgroundColor:'#e2e8f0'}]}
                    disabled={item.qty >= (item.product.total_stock||0)}
                >
                    <Ionicons name="add" size={16} color="white" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setCart(cart.filter((_, i) => i !== index))} style={{marginLeft: 10}}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        {cart.length === 0 && (
          <View style={styles.emptyCart}>
             <Ionicons name="cube-outline" size={40} color="#cbd5e1" />
             <Text style={{color: '#94a3b8', marginTop: 5}}>กด "+ เพิ่มสินค้า" เพื่อเริ่มสร้างรายการ</Text>
          </View>
        )}

      </ScrollView>

      {/* Footer Submit */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, (loading || !selectedSite || cart.length === 0) && {backgroundColor: '#94a3b8'}]} 
          onPress={handleSubmit} 
          disabled={loading || !selectedSite || cart.length === 0}
        >
          {loading ? <ActivityIndicator color="white"/> : <Text style={styles.submitText}>🚀 ยืนยันใบเบิก</Text>}
        </TouchableOpacity>
      </View>

      {/* Modal 1: Product Selection (เหมือน Withdraw เป๊ะ) */}
      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={{flex:1, backgroundColor: 'white'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowProductModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
                <Text style={styles.modalTitle}>เลือกสินค้า</Text>
                <View style={{width:28}}/>
            </View>
            
            {/* Categories Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                <TouchableOpacity style={[styles.catTab, selectedCategory === 'all' && styles.catTabActive]} onPress={() => setSelectedCategory('all')}>
                    <Text style={[styles.catText, selectedCategory === 'all' && styles.catTextActive]}>ทั้งหมด</Text>
                </TouchableOpacity>
                {categories.map(c => (
                    <TouchableOpacity key={c.documentId} style={[styles.catTab, selectedCategory === c.documentId && styles.catTabActive]} onPress={() => setSelectedCategory(c.documentId)}>
                        <Text style={[styles.catText, selectedCategory === c.documentId && styles.catTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput style={styles.searchBar} placeholder="ค้นหาชื่อสินค้า..." value={searchQuery} onChangeText={setSearchQuery} />
            </View>

            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.documentId || item.id.toString()}
                renderItem={({item}) => {
                    const stock = item.total_stock || 0;
                    const isOutOfStock = stock <= 0;
                    
                    return (
                        <TouchableOpacity 
                            style={[styles.productRow, isOutOfStock && styles.productRowDisabled]} 
                            onPress={() => handleProductSelect(item)}
                            disabled={isOutOfStock}
                        >
                            <View style={{flex: 1}}>
                                <Text style={[styles.productRowName, isOutOfStock && {color: '#ef4444'}]}>
                                    {item.name}
                                </Text>
                                <View style={{flexDirection:'row', gap:10, marginTop:4}}>
                                   {isOutOfStock ? (
                                      <Text style={{color:'#ef4444', fontSize:12, fontWeight:'bold'}}>❌ ของหมดสต็อก (0)</Text>
                                   ) : (
                                      <Text style={{color:'#059669', fontSize:12}}>✅ มีของในคลังรวม {stock} {item.unit || 'ชิ้น'}</Text>
                                   )}
                                </View>
                            </View>
                            {!isOutOfStock && <Ionicons name="add-circle" size={28} color="#6366f1" />}
                        </TouchableOpacity>
                    );
                }}
            />
        </SafeAreaView>
      </Modal>

      {/* Modal 2: Site Selection (แบบเดิมแต่ปรับ Style ให้เข้าชุด) */}
      <Modal visible={showSiteModal} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSiteModal(false)}>
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกไซท์งาน</Text>
            <View style={{width: 28}} />
          </View>
          
          <FlatList 
            data={sites}
            keyExtractor={(item) => (item.documentId || item.id).toString()}
            contentContainerStyle={{padding: 10}}
            renderItem={({item}) => (
              <TouchableOpacity 
                style={styles.productRow} 
                onPress={() => { 
                  setSelectedSite(item); 
                  setShowSiteModal(false); 
                }}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={{width:40, height:40, borderRadius:8, backgroundColor:'#e0e7ff', justifyContent:'center', alignItems:'center', marginRight:15}}>
                     <Ionicons name="business" size={20} color="#4f46e5" />
                  </View>
                  <Text style={{fontSize:16, color: '#333', fontWeight:'500'}}>{getName(item)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  
  // Card & Inputs
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600', color: '#475569' },
  pickerBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, backgroundColor: '#f8fafc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  pickerText: { fontSize: 16, color: '#333' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f8fafc', textAlignVertical: 'top' },

  // List & Buttons
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  addBtn: { backgroundColor: '#6366f1', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  // Cart Item
  cartItem: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 8, alignItems: 'center' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  stockInfo: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 },
  qtyBtn: { backgroundColor: '#6366f1', width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  qtyText: { paddingHorizontal: 10, fontWeight: 'bold', fontSize: 14, minWidth: 30, textAlign: 'center' },
  
  emptyCart: { alignItems: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10 },
  
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  submitBtn: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Modal Styles (Copied & Adapted)
  modalHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  catScroll: { maxHeight: 50, marginVertical: 10, paddingHorizontal: 10 },
  catTab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, height: 35 },
  catTabActive: { backgroundColor: '#4f46e5' },
  catText: { fontSize: 13, color: '#64748b' },
  catTextActive: { color: 'white', fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 10, paddingHorizontal: 10, borderRadius: 8 },
  searchBar: { flex: 1, padding: 10 },
  
  productRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productRowDisabled: { backgroundColor: '#fef2f2' },
  productRowName: { fontSize: 16, color: '#333', fontWeight: '500' },
});