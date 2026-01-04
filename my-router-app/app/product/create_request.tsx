import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, Modal, FlatList, ActivityIndicator, Image, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, BASE_URL } from '../../constants/Config';
import { useAuth } from '../contexts/AuthContext'; // เรียกใช้ AuthContext

export default function CreateRequestScreen() {
  const router = useRouter();
  
  // ⭐ 1. ดึง user และ token มาใช้ได้เลย (สะดวกกว่า AsyncStorage)
  const { user, token } = useAuth(); 
  
  // --- State ข้อมูล ---
  const [sites, setSites] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // --- State แบบฟอร์ม ---
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<any[]>([]); 

  // --- State ควบคุม UI และ Filter ---
  const [loading, setLoading] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  // Filter ใน Modal เลือกสินค้า
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // 1. ดึง Project Site (กรองเฉพาะ active)
      const resSites = await fetch(`${API_URL}/project-sites?filters[project_status][$eq]=active`);
      const jsonSites = await resSites.json();
      setSites(jsonSites.data || []);

      // 2. ดึงสินค้า
      const resProducts = await fetch(`${API_URL}/products?populate=*&pagination[pageSize]=1000`);
      const jsonProducts = await resProducts.json();
      setProducts(jsonProducts.data || []);

      // 3. ดึงหมวดหมู่
      const resCats = await fetch(`${API_URL}/categories`);
      const jsonCats = await resCats.json();
      setCategories(jsonCats.data || []);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ กรุณาเช็คอินเทอร์เน็ต");
    }
  };

  // 🧠 Logic กรองสินค้า
  const filteredProducts = useMemo(() => {
    let result = products;
    // กรองหมวดหมู่
    if (selectedCategory !== 'all') {
      result = result.filter(p => (p.category?.documentId === selectedCategory) || (p.category?.id === selectedCategory));
    }
    // กรองชื่อ
    if (searchQuery) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [products, searchQuery, selectedCategory]);


  // 🛒 ฟังก์ชันจัดการตะกร้า
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      Alert.alert("แจ้งเตือน", "สินค้านี้อยู่ในรายการแล้วครับ");
      return;
    }
    setCart([...cart, { product: product, qty: 1 }]);
    setShowProductModal(false);
    setSearchQuery("");
  };

  const updateQty = (index: number, text: string) => {
    const newCart = [...cart];
    const qty = parseInt(text);
    newCart[index].qty = isNaN(qty) ? 0 : qty;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // 📅 ฟังก์ชันสร้าง Job No อัตโนมัติ (REQ-YYYYMMDD-HHMM)
  const generateJobNo = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `REQ-${yyyy}${mm}${dd}-${hh}${min}`;
  };

  // 🚀 ฟังก์ชัน Submit (ฉบับสมบูรณ์)
  const handleSubmit = async () => {
    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!selectedSite) return Alert.alert("กรุณาระบุข้อมูล", "เลือกไซท์งาน/โครงการ ก่อนครับ");
    if (cart.length === 0) return Alert.alert("ตระกร้าว่างเปล่า", "เลือกสินค้าอย่างน้อย 1 รายการครับ");
    
    // 2. ⭐ เช็ค Token จาก Context โดยตรง (สำคัญมาก!)
    if (!token || !user) {
        Alert.alert("หมดเวลา", "กรุณาล็อกอินใหม่อีกครั้ง", [
            { text: "ตกลง", onPress: () => router.replace('/login') }
        ]);
        return;
    }

    try {
      setLoading(true);
      const autoJobNo = generateJobNo();
      
      // เตรียม Items (สินค้า)
      const requestItems = cart.map(item => ({
        product: (item.product as any).documentId || item.product.id, 
        qty_request: item.qty,
        qty_approved: 0, 
        remark: "-" 
      }));

      // เตรียมข้อมูลที่จะส่ง (Payload)
      // ⚠️ หมายเหตุ: เราไม่ส่ง request_by แล้ว เพราะเราเขียน Code ที่ Backend ให้เติมให้อัตโนมัติ
      const payload = {
        data: {
          job_no: autoJobNo,
          request_status: 'pending',
          project_site: (selectedSite as any).documentId || selectedSite.id,
          note: note,
          items: requestItems
        }
      };

      console.log("🚀 Sending Payload:", JSON.stringify(payload));

      // 3. ยิง API (แนบ Token ใน Header)
      const response = await fetch(`${API_URL}/withdrawal-requests`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // ⭐ กุญแจสำคัญที่ทำให้ Server รู้จักเรา
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || JSON.stringify(errorData);
        console.error("🔥 API Error:", errorMessage);
        
        // ถ้า Token หมดอายุ
        if (response.status === 401 || response.status === 403) {
             throw new Error("กรุณาล็อกอินใหม่อีกครั้ง (Token หมดอายุ)");
        }

        throw new Error(errorMessage);
      }

      // สำเร็จ!
      Alert.alert("สำเร็จ ✅", `สร้างใบเบิกเลขที่: ${autoJobNo}`, [{ text: "ตกลง", onPress: () => router.back() }]);

    } catch (error: any) {
      console.error(error);
      Alert.alert("บันทึกไม่สำเร็จ", error.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สร้างใบเบิกสินค้า</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        
        {/* Card 1: ข้อมูลหลัก */}
        <View style={styles.card}>
            <Text style={styles.label}>📍 ไซท์งาน / โครงการ <Text style={{color:'red'}}>*</Text></Text>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowSiteModal(true)}>
                <Text style={[styles.pickerText, !selectedSite && {color: '#999'}]}>
                    {selectedSite ? selectedSite.name : "-- แตะเพื่อเลือกไซท์งาน --"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text style={styles.label}>📄 เลขที่ใบงาน (Job No.)</Text>
                <Text style={{fontSize:12, color:'#00796B'}}>*ระบบสร้างให้อัตโนมัติ</Text>
            </View>
            <View style={[styles.input, {backgroundColor: '#e0f2f1', justifyContent:'center'}]}>
                 <Text style={{color:'#004d40', fontWeight:'bold'}}>REQ-YYYYMMDD-XXXX</Text>
            </View>

            <Text style={styles.label}>📝 หมายเหตุ</Text>
            <TextInput 
                style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
                placeholder="ระบุเพิ่มเติม (ถ้ามี)"
                value={note}
                onChangeText={setNote}
                multiline
            />
        </View>

        {/* Card 2: รายการสินค้า */}
        <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>📦 รายการเบิก ({cart.length})</Text>
            <TouchableOpacity onPress={() => setShowProductModal(true)}>
                <View style={styles.addBtn}>
                    <Ionicons name="add" size={18} color="white" />
                    <Text style={{color:'white', fontWeight:'bold', marginLeft: 4}}>เพิ่มสินค้า</Text>
                </View>
            </TouchableOpacity>
        </View>

        {cart.length === 0 ? (
            <View style={styles.emptyCart}>
                <Ionicons name="basket-outline" size={48} color="#ccc" />
                <Text style={{color: '#999', marginTop: 10}}>ยังไม่ได้เลือกสินค้า</Text>
            </View>
        ) : (
            cart.map((item, index) => (
                <View key={index} style={styles.cartItem}>
                    <View style={{flex:1}}>
                        <Text style={styles.itemName}>{item.product.name}</Text>
                        <Text style={styles.itemStock}>เหลือ: {item.product.stock}</Text>
                    </View>
                    <View style={styles.qtyContainer}>
                        <Text style={{fontSize: 10, color:'#666', marginBottom: 2}}>จำนวน</Text>
                        <TextInput 
                            style={styles.qtyInput}
                            keyboardType="numeric"
                            value={item.qty.toString()}
                            onChangeText={(text) => updateQty(index, text)}
                            selectTextOnFocus
                        />
                    </View>
                    <TouchableOpacity onPress={() => removeFromCart(index)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={22} color="#dc2626" />
                    </TouchableOpacity>
                </View>
            ))
        )}
        <View style={{height: 100}} /> 
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.submitBtn, loading && {opacity: 0.7}]} 
            onPress={handleSubmit}
            disabled={loading}
          >
             {loading ? <ActivityIndicator color="white"/> : 
                <View style={{flexDirection:'row', alignItems:'center'}}>
                    <Ionicons name="paper-plane-outline" size={20} color="white" style={{marginRight: 8}} />
                    <Text style={styles.submitText}>ยืนยันส่งใบเบิก</Text>
                </View>
             }
          </TouchableOpacity>
      </View>

      {/* --- Modal เลือกไซท์ (Active) --- */}
      <Modal visible={showSiteModal} animationType="slide" transparent={true}>
         <View style={styles.modalOverlay}>
             <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>เลือกไซท์งาน (Active)</Text>
                    <TouchableOpacity onPress={() => setShowSiteModal(false)}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
                <FlatList 
                    data={sites}
                    keyExtractor={(item: any) => item.id.toString()}
                    renderItem={({item}) => (
                        <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedSite(item); setShowSiteModal(false); }}>
                            <View style={styles.siteIcon}><Ionicons name="business" size={24} color="#00796B" /></View>
                            <View><Text style={styles.modalItemText}>{item.name}</Text></View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>ไม่พบไซท์งานที่เปิดอยู่</Text>}
                />
             </View>
         </View>
      </Modal>

      {/* --- Modal เลือกสินค้า (มี Filter) --- */}
      <Modal visible={showProductModal} animationType="slide">
         <View style={styles.fullScreenModal}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowProductModal(false)}>
                    <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>เลือกสินค้าที่จะเบิก</Text>
                <View style={{width: 28}} />
            </View>

            <View style={styles.filterSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="ค้นหาชื่อสินค้า..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
                    <TouchableOpacity 
                        style={[styles.catBadge, selectedCategory === 'all' && styles.catBadgeActive]}
                        onPress={() => setSelectedCategory('all')}
                    >
                        <Text style={[styles.catText, selectedCategory === 'all' && styles.catTextActive]}>ทั้งหมด</Text>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                        <TouchableOpacity 
                            key={cat.id}
                            style={[styles.catBadge, (selectedCategory === cat.documentId || selectedCategory === cat.id) && styles.catBadgeActive]}
                            onPress={() => setSelectedCategory(cat.documentId || cat.id)}
                        >
                            <Text style={[styles.catText, (selectedCategory === cat.documentId || selectedCategory === cat.id) && styles.catTextActive]}>
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList 
                data={filteredProducts}
                keyExtractor={(item: any) => item.id.toString()}
                contentContainerStyle={{padding: 15}}
                renderItem={({item}) => (
                    <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
                        {item.image?.url ? (
                            <Image source={{ uri: item.image.url.startsWith('http') ? item.image.url : BASE_URL + item.image.url }} style={styles.productImage} />
                        ) : (
                            <View style={[styles.productImage, {backgroundColor:'#eee', justifyContent:'center', alignItems:'center'}]}>
                                <Ionicons name="image-outline" size={24} color="#ccc" />
                            </View>
                        )}
                        <View style={{flex: 1, marginLeft: 12}}>
                            <Text style={styles.modalItemText}>{item.name}</Text>
                            <Text style={{fontSize:12, color: item.stock <=5 ? 'red':'green', fontWeight: 'bold'}}>
                                คงเหลือ: {item.stock} ชิ้น
                            </Text>
                        </View>
                        <Ionicons name="add-circle" size={30} color="#00796B" />
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 50, color:'#999'}}>ไม่พบสินค้า</Text>}
            />
         </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  backBtn: { padding: 5 },
  content: { flex: 1, padding: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  label: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16, backgroundColor: '#f8fafc' },
  pickerBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc' },
  pickerText: { fontSize: 16, color: '#333' },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  addBtn: { flexDirection: 'row', backgroundColor: '#00796B', padding: 8, borderRadius: 20, paddingHorizontal: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, elevation: 2 },
  emptyCart: { alignItems: 'center', padding: 30, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10 },
  
  cartItem: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  itemStock: { fontSize: 12, color: '#64748b' },
  qtyContainer: { alignItems: 'center', marginHorizontal: 10 },
  qtyInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, width: 60, textAlign: 'center', padding: 8, fontSize: 16, fontWeight: 'bold', color: '#00796B' },
  deleteBtn: { padding: 8 },

  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  submitBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.3, elevation: 5 },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#333', fontWeight: '500' },
  siteIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0F2F1', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  emptyText: { textAlign: 'center', padding: 20, color: '#999' },
  
  fullScreenModal: { flex: 1, backgroundColor: '#f8fafc', paddingTop: 40 },
  productCard: { flexDirection: 'row', backgroundColor: 'white', padding: 10, marginBottom: 10, borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
  productImage: { width: 50, height: 50, borderRadius: 8 },

  // Filter Styles
  filterSection: { padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchBar: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 10, height: 45, alignItems: 'center' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  catBadge: { paddingHorizontal: 15, height: 35, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8, justifyContent: 'center' },
  catBadgeActive: { backgroundColor: '#00796B' },
  catText: { color: '#666', fontSize: 13 },
  catTextActive: { color: 'white', fontWeight: 'bold' },
});