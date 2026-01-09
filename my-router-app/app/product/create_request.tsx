import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, Modal, FlatList, ActivityIndicator, 
  KeyboardAvoidingView, Platform, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateRequestScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [sites, setSites] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      // อัปเดต URL เพื่อดึงเฉพาะ project_status ที่เป็น active เท่านั้น
      const siteUrl = `${API_URL}/project-sites?filters[project_status][$eq]=active&pagination[pageSize]=100`;
      const productUrl = `${API_URL}/products?populate=*&pagination[pageSize]=1000`;

      const [resSites, resProducts] = await Promise.all([
        fetch(siteUrl, { headers }), 
        fetch(productUrl, { headers })
      ]);
      
      const jsonSites = await resSites.json();
      const jsonProducts = await resProducts.json();

      setSites(jsonSites.data || []);
      setProducts(jsonProducts.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setInitialLoading(false);
    }
  };

  const getName = (item: any) => {
    if (!item) return "";
    return item.name || item.attributes?.name || "ไม่ระบุชื่อ";
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(p => 
      getName(p).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const addToCart = (product: any) => {
    const stock = product.stock ?? product.attributes?.stock ?? 0;
    if (stock <= 0) {
      Alert.alert("สินค้าหมด", "ไม่สามารถเบิกสินค้าที่ไม่มีในสต็อกได้");
      return;
    }

    const productId = product.documentId || product.id;
    const isExisting = cart.some(item => (item.product.documentId || item.product.id) === productId);
    
    if (isExisting) {
      Alert.alert("แจ้งเตือน", "สินค้านี้อยู่ในรายการแล้ว");
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
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "บันทึกไม่สำเร็จ");
      }
    } catch (error: any) {
      Alert.alert("ผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, {justifyContent: 'center'}]}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={{textAlign: 'center', marginTop: 10}}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

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
              {selectedSite ? getName(selectedSite) : "-- เลือกไซท์งาน --"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          <Text style={styles.label}>📝 หมายเหตุ</Text>
          <TextInput 
            style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
            placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)" 
            value={note} 
            onChangeText={setNote} 
            multiline 
          />
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
              <Text style={styles.itemName}>{getName(item.product)}</Text>
              <Text style={styles.itemStock}>คงเหลือ: {item.product.stock ?? item.product.attributes?.stock} {item.product.unit || item.product.attributes?.unit || 'ชิ้น'}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TextInput 
                style={styles.qtyInput} 
                keyboardType="numeric" 
                value={item.qty.toString()} 
                onChangeText={(text) => updateQty(index, text)} 
              />
              <TouchableOpacity onPress={() => {
                const newCart = cart.filter((_, i) => i !== index);
                setCart(newCart);
              }}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {cart.length === 0 && (
          <Text style={{textAlign: 'center', color: '#94a3b8', marginTop: 20}}>ยังไม่มีรายการสินค้า</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, (loading || !selectedSite || cart.length === 0) && {backgroundColor: '#94a3b8'}]} 
          onPress={handleSubmit} 
          disabled={loading || !selectedSite || cart.length === 0}
        >
          {loading ? <ActivityIndicator color="white"/> : <Text style={styles.submitText}>ยืนยันส่งใบเบิก</Text>}
        </TouchableOpacity>
      </View>

      {/* Site Selection Modal - ดึงข้อมูลชื่อเฉพาะที่ active */}
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
            ListEmptyComponent={
              <View style={{padding: 20, alignItems: 'center'}}>
                <Text style={{color: '#64748b'}}>ไม่พบข้อมูลไซท์งานที่กำลังดำเนินการ</Text>
                <TouchableOpacity onPress={fetchInitialData} style={{marginTop: 10}}>
                  <Text style={{color: '#4f46e5'}}>ลองโหลดใหม่อีกครั้ง</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({item}) => (
              <TouchableOpacity 
                style={styles.modalItem} 
                onPress={() => { 
                  setSelectedSite(item); 
                  setShowSiteModal(false); 
                }}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Ionicons name="business-outline" size={20} color="#4f46e5" style={{marginRight: 10}} />
                  <Text style={styles.modalItemText}>{getName(item)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Product Selection Modal */}
      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={{flex:1, backgroundColor: 'white'}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProductModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกสินค้า</Text>
            <View style={{width: 28}} />
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput 
              style={styles.searchBar} 
              placeholder="ค้นหาชื่อสินค้า..." 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
            />
          </View>
          <FlatList 
            data={filteredProducts}
            keyExtractor={(item: any) => (item.documentId || item.id).toString()}
            renderItem={({item}) => {
              const stock = item.stock ?? item.attributes?.stock ?? 0;
              const isOut = stock <= 0;
              return (
                <TouchableOpacity 
                  style={[styles.productCard, isOut && {backgroundColor: '#f8fafc'}]} 
                  onPress={() => addToCart(item)}
                  disabled={isOut}
                >
                  <View style={{flex: 1}}>
                    <Text style={[styles.modalItemText, isOut && {color: '#94a3b8'}]}>{getName(item)}</Text>
                    <Text style={{color: isOut ? '#ef4444' : '#10b981', fontSize: 13, marginTop: 4}}>
                      {isOut ? "❌ สินค้าหมด" : `✅ คงเหลือ: ${stock} ${item.unit || item.attributes?.unit || 'ชิ้น'}`}
                    </Text>
                  </View>
                  {!isOut && <Ionicons name="add-circle" size={30} color="#00796B" />}
                </TouchableOpacity>
              );
            }}
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
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600', color: '#475569' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#f8fafc' },
  pickerBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 15, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' },
  pickerText: { fontSize: 16 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  addBtn: { backgroundColor: '#00796B', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25 },
  cartItem: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', elevation: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  itemStock: { fontSize: 12, color: '#64748b', marginTop: 2 },
  qtyInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, width: 60, textAlign: 'center', padding: 5, marginRight: 15, fontSize: 16, fontWeight: 'bold' },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  submitBtn: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalHeader: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalItem: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, color: '#334155' },
  productCard: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 15, paddingHorizontal: 15, borderRadius: 12 },
  searchBar: { flex: 1, padding: 12, fontSize: 16 }
});