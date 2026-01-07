import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, Modal, FlatList, ActivityIndicator, 
  Image, KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, BASE_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateRequestScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [sites, setSites] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resSites, resProducts, resCats] = await Promise.all([
        fetch(`${API_URL}/project-sites?filters[project_status][$eq]=active`),
        fetch(`${API_URL}/products?populate=*&pagination[pageSize]=1000`),
        fetch(`${API_URL}/categories`)
      ]);
      
      const [jsonSites, jsonProducts, jsonCats] = await Promise.all([
        resSites.json(), resProducts.json(), resCats.json()
      ]);

      setSites(jsonSites.data || []);
      setProducts(jsonProducts.data || []);
      setCategories(jsonCats.data || []);
    } catch (error) {
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    }
  };

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'all') {
      result = result.filter(p => (p.category?.documentId === selectedCategory) || (p.category?.id === selectedCategory));
    }
    if (searchQuery) {
      result = result.filter(p => (p.name || p.attributes?.name || "").toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [products, searchQuery, selectedCategory]);

  const addToCart = (product: any) => {
    const stock = product.stock ?? product.attributes?.stock ?? 0;
    if (stock <= 0) {
      Alert.alert("สินค้าหมด", "ไม่สามารถเบิกสินค้าที่ไม่มีในสต็อกได้ครับ");
      return;
    }

    const existing = cart.find(item => (item.product.documentId || item.product.id) === (product.documentId || product.id));
    if (existing) {
      Alert.alert("แจ้งเตือน", "สินค้านี้อยู่ในรายการแล้วครับ");
      return;
    }
    setCart([...cart, { product: product, qty: 1 }]);
    setShowProductModal(false);
  };

  const updateQty = (index: number, text: string) => {
    const newCart = [...cart];
    const qty = parseInt(text);
    newCart[index].qty = isNaN(qty) ? 0 : qty;
    setCart(newCart);
  };

  const handleSubmit = async () => {
    if (!selectedSite || cart.length === 0) {
      return Alert.alert("ข้อมูลไม่ครบ", "กรุณาเลือกไซท์งานและสินค้าอย่างน้อย 1 รายการ");
    }

    try {
      setLoading(true);
      const payload = {
        data: {
          job_no: `REQ-${new Date().getTime()}`,
          request_status: 'pending',
          project_site: selectedSite.documentId || selectedSite.id,
          note: note,
          items: cart.map(item => ({
            product: item.product.documentId || item.product.id,
            qty_request: item.qty
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
        Alert.alert("สำเร็จ", "ส่งใบเบิกเรียบร้อยแล้ว", [{ text: "ตกลง", onPress: () => router.back() }]);
      } else {
        throw new Error("บันทึกไม่สำเร็จ");
      }
    } catch (error: any) {
      Alert.alert("ผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>สร้างใบเบิกสินค้า</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>📍 ไซท์งาน / โครงการ *</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowSiteModal(true)}>
            <Text style={[styles.pickerText, !selectedSite && {color: '#999'}]}>
              {selectedSite ? selectedSite.name : "-- เลือกไซท์งาน --"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <Text style={styles.label}>📝 หมายเหตุ</Text>
          <TextInput style={styles.input} placeholder="ระบุเพิ่มเติม" value={note} onChangeText={setNote} multiline />
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>📦 รายการเบิก ({cart.length})</Text>
          <TouchableOpacity onPress={() => setShowProductModal(true)} style={styles.addBtn}>
            <Text style={{color:'white', fontWeight:'bold'}}>+ เพิ่มสินค้า</Text>
          </TouchableOpacity>
        </View>

        {cart.map((item, index) => (
          <View key={index} style={styles.cartItem}>
            <View style={{flex:1}}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemStock}>คงเหลือ: {item.product.stock}</Text>
            </View>
            <TextInput 
              style={styles.qtyInput} 
              keyboardType="numeric" 
              value={item.qty.toString()} 
              onChangeText={(text) => updateQty(index, text)} 
            />
            <TouchableOpacity onPress={() => {
              const newCart = [...cart];
              newCart.splice(index, 1);
              setCart(newCart);
            }}><Ionicons name="trash" size={20} color="red" /></TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="white"/> : <Text style={styles.submitText}>ยืนยันส่งใบเบิก</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={{flex:1}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProductModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกสินค้า</Text>
            <View style={{width: 28}} />
          </View>
          <TextInput style={styles.searchBar} placeholder="ค้นหา..." value={searchQuery} onChangeText={setSearchQuery} />
          <FlatList 
            data={filteredProducts}
            keyExtractor={(item: any) => (item.documentId || item.id).toString()}
            renderItem={({item}) => {
              const stock = item.stock ?? item.attributes?.stock ?? 0;
              const isOut = stock <= 0;
              return (
                <TouchableOpacity 
                  style={[styles.productCard, isOut && {opacity: 0.5}]} 
                  onPress={() => addToCart(item)}
                  disabled={isOut}
                >
                  <View style={{flex: 1}}>
                    <Text style={styles.modalItemText}>{item.name || item.attributes?.name}</Text>
                    <Text style={{color: isOut ? 'red' : 'green'}}>
                      {isOut ? "สินค้าหมด (เบิกไม่ได้)" : `คงเหลือ: ${stock} ชิ้น`}
                    </Text>
                  </View>
                  {!isOut && <Ionicons name="add-circle" size={30} color="#00796B" />}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={showSiteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <FlatList 
              data={sites}
              renderItem={({item}) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedSite(item); setShowSiteModal(false); }}>
                  <Text>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: 'white' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 2 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 15 },
  pickerBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  pickerText: { fontSize: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#00796B', padding: 8, borderRadius: 20, paddingHorizontal: 15 },
  cartItem: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold' },
  itemStock: { fontSize: 12, color: '#64748b' },
  qtyInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, width: 60, textAlign: 'center', padding: 5, marginHorizontal: 10 },
  footer: { padding: 20, backgroundColor: 'white' },
  submitBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 40 },
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, fontWeight: '500' },
  productCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  searchBar: { margin: 15, backgroundColor: '#f0f0f0', padding: 12, borderRadius: 10 }
});