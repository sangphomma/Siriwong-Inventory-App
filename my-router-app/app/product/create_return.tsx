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

// --- Interfaces ---
interface Category { documentId: string; name: string; }
interface Product { documentId: string; id: number; name: string; unit?: string; category?: Category; }
interface CartItem { product: Product; qty: number; condition: string; }
interface ProjectSite { documentId: string; id: number; name: string; }

export default function CreateReturnScreen() {
  const router = useRouter();
  // ✅ 1. เพิ่ม user เพื่อเอา ID คนทำรายการ
  const { token, user } = useAuth(); 

  // --- Data State ---
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // --- Form State ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSite, setSelectedSite] = useState<ProjectSite | null>(null);
  const [note, setNote] = useState('');

  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [])
  );

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const siteUrl = `${API_URL}/project-sites?filters[project_status][$eq]=active&pagination[pageSize]=100`;
      const catUrl = `${API_URL}/categories`;
      
      // ✅ แก้จุดที่ 1: เพิ่ม &sort=createdAt:desc (ให้สินค้าใหม่ล่าสุดเด้งมาบนสุด)
      const prodUrl = `${API_URL}/products?populate=*&pagination[pageSize]=1000&sort=createdAt:desc`;

      const [resSites, resCats, resProds] = await Promise.all([
        fetch(siteUrl, { headers }),
        fetch(catUrl, { headers }),
        fetch(prodUrl, { headers })
      ]);
      
      const jsonSites = await resSites.json();
      const jsonCats = await resCats.json();
      const jsonProds = await resProds.json();

      setSites(jsonSites.data || []);
      setCategories(jsonCats.data || []);
      setProducts(jsonProds.data || []);

    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setInitialLoading(false);
    }
  };

  // --- Logic ---
  const handleProductSelect = (product: Product) => {
    const existingIndex = cart.findIndex(c => c.product.documentId === product.documentId);
    if (existingIndex >= 0) {
        Alert.alert("แจ้งเตือน", "สินค้านี้อยู่ในรายการคืนแล้ว");
        return;
    }
    setCart([...cart, { product, qty: 1, condition: 'ปกติ' }]);
    setShowProductModal(false);
    setSearchQuery("");
  };

  const updateCartQty = (index: number, change: number) => {
    const newCart = [...cart];
    const newQty = newCart[index].qty + change;
    if (newQty < 1) return;
    newCart[index].qty = newQty;
    setCart(newCart);
  };

  const handleSubmit = async () => {
    if (!selectedSite) return Alert.alert("ข้อมูลไม่ครบ", "กรุณาเลือกไซท์งานที่จะคืนของ");
    if (cart.length === 0) return Alert.alert("ข้อมูลไม่ครบ", "กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");

    try {
      setLoading(true);
      const payload = {
        data: {
          job_no: `RET-${new Date().getTime()}`,
          return_status: 'pending',
          project_site: selectedSite.documentId || selectedSite.id,
          note: note,
          return_by: user?.id, 
          
          // ✅ แก้จุดที่ 2: เพิ่ม publishedAt: new Date() เพื่อแก้ปัญหาติด Draft
          publishedAt: new Date(), 
          
          items: cart.map(item => ({
            product: item.product.documentId || item.product.id,
            qty_request: item.qty, 
            condition: item.condition 
          }))
        }
      };

      const response = await fetch(`${API_URL}/return-requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert("สำเร็จ", "ส่งใบคืนของเรียบร้อย รอ Store ตรวจรับ", [
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

  const getName = (item: any) => item?.name || "ไม่ระบุชื่อ";

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#78350f" /></TouchableOpacity>
        <Text style={styles.headerTitle}>↩️ คืนของ (Technician)</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>🏗️ คืนจากไซท์งาน / โครงการ *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowSiteModal(true)}>
            <Text style={[styles.pickerText, !selectedSite && {color: '#94a3b8'}]}>
              {selectedSite ? getName(selectedSite) : "-- เลือกไซท์งาน --"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>

          <Text style={styles.label}>📝 สาเหตุการคืน / หมายเหตุ</Text>
          <TextInput 
            style={[styles.input, {height: 60}]} 
            placeholder="เช่น ของเหลือใช้, สั่งผิด, ชำรุด" 
            value={note} 
            onChangeText={setNote} 
            multiline 
          />
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>📦 รายการส่งคืน ({cart.length})</Text>
          <TouchableOpacity onPress={() => setShowProductModal(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ เพิ่มสินค้า</Text>
          </TouchableOpacity>
        </View>

        {cart.map((item, index) => (
          <View key={index} style={styles.cartItem}>
            <View style={{flex:1}}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={{fontSize:12, color:'#d97706'}}>สภาพ: {item.condition}</Text>
            </View>
            <View style={styles.qtyControl}>
                <TouchableOpacity onPress={() => updateCartQty(index, -1)} style={styles.qtyBtn}>
                    <Ionicons name="remove" size={16} color="white" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.qty}</Text>
                <TouchableOpacity onPress={() => updateCartQty(index, 1)} style={styles.qtyBtn}>
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
             <Ionicons name="return-down-back-outline" size={40} color="#cbd5e1" />
             <Text style={{color: '#94a3b8', marginTop: 5}}>เลือกสินค้าที่จะส่งคืนเข้า Store</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, (loading || !selectedSite || cart.length === 0) && {backgroundColor: '#94a3b8'}]} 
          onPress={handleSubmit} 
          disabled={loading || !selectedSite || cart.length === 0}
        >
          {loading ? <ActivityIndicator color="white"/> : <Text style={styles.submitText}>ยืนยันการคืนของ</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={{flex:1, backgroundColor: 'white'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowProductModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
                <Text style={styles.modalTitle}>เลือกสินค้าคืน</Text>
                <View style={{width:28}}/>
            </View>
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
                renderItem={({item}) => (
                    <TouchableOpacity 
                        style={styles.productRow} 
                        onPress={() => handleProductSelect(item)}
                    >
                        <View style={{flex: 1}}>
                            <Text style={styles.productRowName}>{item.name}</Text>
                            <Text style={{fontSize:12, color:'#64748b'}}>{item.unit || 'ชิ้น'}</Text>
                        </View>
                        <Ionicons name="add-circle" size={28} color="#f59e0b" />
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
      </Modal>

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
                onPress={() => { setSelectedSite(item); setShowSiteModal(false); }}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={{width:40, height:40, borderRadius:8, backgroundColor:'#fef3c7', justifyContent:'center', alignItems:'center', marginRight:15}}>
                     <Ionicons name="business" size={20} color="#d97706" />
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
  container: { flex: 1, backgroundColor: '#fffbeb' }, 
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#78350f' },
  content: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600', color: '#92400e' },
  pickerBtn: { borderWidth: 1, borderColor: '#fcd34d', borderRadius: 8, padding: 12, backgroundColor: '#fff7ed', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  pickerText: { fontSize: 16, color: '#333' },
  input: { borderWidth: 1, borderColor: '#fcd34d', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#fff7ed', textAlignVertical: 'top' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400e' },
  addBtn: { backgroundColor: '#f59e0b', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  cartItem: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 8, alignItems: 'center', borderLeftWidth:4, borderLeftColor:'#f59e0b', elevation:1 },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', borderRadius: 8, padding: 2 },
  qtyBtn: { backgroundColor: '#f59e0b', width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  qtyText: { paddingHorizontal: 10, fontWeight: 'bold', fontSize: 14, minWidth: 30, textAlign: 'center' },
  emptyCart: { alignItems: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.5)' },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#fde68a' },
  submitBtn: { backgroundColor: '#d97706', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  catScroll: { maxHeight: 50, marginVertical: 10, paddingHorizontal: 10 },
  catTab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8, height: 35 },
  catTabActive: { backgroundColor: '#f59e0b' },
  catText: { fontSize: 13, color: '#64748b' },
  catTextActive: { color: 'white', fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', margin: 10, paddingHorizontal: 10, borderRadius: 8 },
  searchBar: { flex: 1, padding: 10 },
  productRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productRowName: { fontSize: 16, color: '#333', fontWeight: '500' },
});