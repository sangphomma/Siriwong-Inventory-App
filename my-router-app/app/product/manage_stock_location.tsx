import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  Alert, ActivityIndicator, SafeAreaView, Modal, FlatList 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageStockLocationScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams(); 
  const { token } = useAuth();
  
  const [products, setProducts] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allStockData, setAllStockData] = useState<any[]>([]); 

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [amount, setAmount] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [showProductModal, setShowProductModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all"); 

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setIsFetching(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resProd, resLoc, resCat, resStock] = await Promise.all([
        fetch(`${API_URL}/products?populate=*&pagination[pageSize]=1000`, { headers }),
        fetch(`${API_URL}/locations?sort=name:asc`, { headers }),
        fetch(`${API_URL}/categories`, { headers }),
        fetch(`${API_URL}/stock-locations?populate=*&pagination[pageSize]=2000`, { headers })
      ]);
      const jsonProd = await resProd.json();
      const jsonLoc = await resLoc.json();
      const jsonCat = await resCat.json();
      const jsonStock = await resStock.json();

      const prodData = jsonProd.data || [];
      setProducts(prodData);
      setLocations(jsonLoc.data || []);
      setCategories(jsonCat.data || []);
      setAllStockData(jsonStock.data || []);

      // ⭐ แก้ไข Error 'p' by adding type: any
      if (productId) {
        const found = prodData.find((p: any) => (p.documentId === productId || p.id.toString() === productId));
        if (found) setSelectedProduct(found);
      }

    } catch (error) {
      Alert.alert("Error", "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setIsFetching(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const pId = p.documentId || p.id;
      const name = p.name || p.attributes?.name || "";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const pCat = p.category?.documentId || p.category?.id;
      const matchesCategory = selectedCategory === "all" || pCat === selectedCategory;

      let matchesLocation = true;
      if (filterLocation !== "all") {
        matchesLocation = allStockData.some(stock => 
          (stock.product?.documentId === pId || stock.product?.id === pId) && 
          (stock.location?.documentId === filterLocation || stock.location?.id === filterLocation)
        );
      }
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [products, searchQuery, selectedCategory, filterLocation, allStockData]);

  const handleSave = async () => {
    if (!selectedProduct || !selectedLocation || !amount) {
      return Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วน");
    }
    setIsLoading(true);
    try {
      const checkQuery = `filters[product][documentId][$eq]=${selectedProduct.documentId}&filters[location][documentId][$eq]=${selectedLocation.documentId}`;
      const resCheck = await fetch(`${API_URL}/stock-locations?${checkQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const jsonCheck = await resCheck.json();
      if (jsonCheck.data && jsonCheck.data.length > 0) {
        return Alert.alert("มีข้อมูลแล้ว", "สินค้านี้ถูกลงทะเบียนในจุดนี้ไปแล้ว");
      }
      const payload = {
        data: {
          product: selectedProduct.documentId,
          location: selectedLocation.documentId,
          on_hand_stock: parseInt(amount)
        }
      };
      const res = await fetch(`${API_URL}/stock-locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        Alert.alert("สำเร็จ ✅", "ลงทะเบียนจุดจัดเก็บเรียบร้อยแล้ว", [{ text: "ตกลง", onPress: () => router.back() }]);
      }
    } catch (error) { Alert.alert("Error", "เกิดข้อผิดพลาดในการบันทึก"); } finally { setIsLoading(false); }
  };

  if (isFetching) return <View style={styles.center}><ActivityIndicator size="large" color="#06b6d4" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>📍 ลงทะเบียนจุดจัดเก็บ</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={styles.content}>
        <Text style={styles.label}>1. สินค้าที่เลือก</Text>
        <TouchableOpacity style={styles.productSelector} onPress={() => setShowProductModal(true)}>
          {selectedProduct ? (
            <View><Text style={styles.selectedProdName}>{selectedProduct.name}</Text><Text style={styles.selectedProdStock}>สต็อกรวมปัจจุบัน: {selectedProduct.stock}</Text></View>
          ) : ( <Text style={{color: '#94a3b8'}}>--- คลิกเพื่อค้นหาและเลือกสินค้า ---</Text> )}
          <Ionicons name="search" size={20} color="#06b6d4" />
        </TouchableOpacity>

        <Text style={styles.label}>2. เลือกจุดจัดเก็บ (Location)</Text>
        <View style={styles.locGrid}>
          {locations.map((loc) => (
            <TouchableOpacity key={loc.documentId} style={[styles.locBadge, selectedLocation?.documentId === loc.documentId && styles.activeLoc]} onPress={() => setSelectedLocation(loc)}>
              <Text style={[styles.locText, selectedLocation?.documentId === loc.documentId && { color: 'white' }]}>{loc.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>3. จำนวนที่นำเข้าจุดเก็บนี้</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={amount} onChangeText={setAmount} />
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProductModal(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกสินค้า</Text>
            <View style={{width: 28}} />
          </View>
          <View style={styles.searchContainer}><Ionicons name="search" size={20} color="#94a3b8" /><TextInput style={styles.searchBar} placeholder="ค้นหาชื่อสินค้า..." value={searchQuery} onChangeText={setSearchQuery} /></View>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <TouchableOpacity style={[styles.catChip, selectedCategory === "all" && styles.catChipActive]} onPress={() => setSelectedCategory("all")}><Text style={[styles.catChipText, selectedCategory === "all" && {color: 'white'}]}>ทั้งหมด</Text></TouchableOpacity>
              {categories.map(cat => ( <TouchableOpacity key={cat.documentId} style={[styles.catChip, selectedCategory === cat.documentId && styles.catChipActive]} onPress={() => setSelectedCategory(cat.documentId)}><Text style={[styles.catChipText, selectedCategory === cat.documentId && {color: 'white'}]}>{cat.name}</Text></TouchableOpacity> ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.catScroll, {marginTop: 5}]}>
              <TouchableOpacity style={[styles.locFilterChip, filterLocation === "all" && styles.locFilterActive]} onPress={() => setFilterLocation("all")}><Ionicons name="location" size={14} color={filterLocation === "all" ? "white" : "#64748b"} /><Text style={[styles.catChipText, filterLocation === "all" && {color: 'white'}]}> ทุกจุดเก็บ</Text></TouchableOpacity>
              {locations.map(loc => ( <TouchableOpacity key={loc.documentId} style={[styles.locFilterChip, filterLocation === loc.documentId && styles.locFilterActive]} onPress={() => setFilterLocation(loc.documentId)}><Text style={[styles.catChipText, filterLocation === loc.documentId && {color: 'white'}]}>{loc.name}</Text></TouchableOpacity> ))}
            </ScrollView>
          </View>
          <FlatList data={filteredProducts} keyExtractor={(item) => item.documentId} renderItem={({item}) => (
            <TouchableOpacity style={styles.productListItem} onPress={() => { setSelectedProduct(item); setShowProductModal(false); }}>
              <View><Text style={styles.prodItemName}>{item.name}</Text><Text style={styles.prodItemStock}>คงเหลือรวม: {item.stock}</Text></View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )} />
        </SafeAreaView>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitBtn, (isLoading || !selectedProduct || !selectedLocation) && { backgroundColor: '#ccc' }]} onPress={handleSave} disabled={isLoading || !selectedProduct || !selectedLocation}>
          {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>ลงทะเบียนสต็อกเข้าจุดเก็บ</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  content: { flex: 1, padding: 20 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 10, color: '#334155' },
  productSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15 },
  selectedProdName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  selectedProdStock: { fontSize: 12, color: '#64748b' },
  locGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  locBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  activeLoc: { backgroundColor: '#06b6d4', borderColor: '#06b6d4' },
  locText: { fontSize: 14, color: '#475569' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 22, textAlign: 'center', fontWeight: 'bold' },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  submitBtn: { backgroundColor: '#06b6d4', padding: 18, borderRadius: 15, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 15, paddingHorizontal: 15, borderRadius: 12 },
  searchBar: { flex: 1, padding: 12, fontSize: 16 },
  catScroll: { paddingHorizontal: 15, marginBottom: 10 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 10 },
  catChipActive: { backgroundColor: '#06b6d4' },
  catChipText: { fontSize: 13, color: '#475569' },
  locFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  locFilterActive: { backgroundColor: '#64748b', borderColor: '#64748b' },
  productListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  prodItemName: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  prodItemStock: { fontSize: 12, color: '#64748b' }
});