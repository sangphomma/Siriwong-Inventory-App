import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  Alert, ActivityIndicator, SafeAreaView, Modal, FlatList 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function TransferScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  
  const [products, setProducts] = useState<any[]>([]);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allStockData, setAllStockData] = useState<any[]>([]); // ⭐ เก็บสต็อกทั้งหมดเพื่อใช้กรอง
  const [stockAtLocations, setStockAtLocations] = useState<any[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [fromLocation, setFromLocation] = useState<any>(null);
  const [toLocation, setToLocation] = useState<any>(null);
  const [amount, setAmount] = useState("1");
  
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
        fetch(`${API_URL}/stock-locations?populate=*&pagination[pageSize]=2000`, { headers }) // ⭐ ดึงข้อมูลสต็อก
      ]);
      const jsonProd = await resProd.json();
      const jsonLoc = await resLoc.json();
      const jsonCat = await resCat.json();
      const jsonStock = await resStock.json();

      setProducts(jsonProd.data || []);
      setAllLocations(jsonLoc.data || []);
      setCategories(jsonCat.data || []);
      setAllStockData(jsonStock.data || []);
    } catch (error) {
      Alert.alert("Error", "โหลดข้อมูลพื้นฐานไม่สำเร็จ");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      fetchStockAtLocations(selectedProduct.documentId || selectedProduct.id);
      setFromLocation(null);
    }
  }, [selectedProduct]);

  const fetchStockAtLocations = async (productId: string) => {
    try {
      const query = `filters[product][documentId][$eq]=${productId}&populate=location`;
      const res = await fetch(`${API_URL}/stock-locations?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setStockAtLocations(json.data || []);
    } catch (error) {
      console.error("Fetch Stock Location Error:", error);
    }
  };

  // ⭐ Logic การกรองที่รวม Location เข้าไปด้วย
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const pId = p.documentId || p.id;
      const name = p.name || p.attributes?.name || "";
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
      const pCat = p.category?.documentId || p.category?.id;
      const matchesCategory = selectedCategory === "all" || pCat === selectedCategory;

      // 🔍 กรองตาม Location
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

  const handleTransfer = async () => {
    if (!selectedProduct || !fromLocation || !toLocation) {
      return Alert.alert("แจ้งเตือน", "กรุณาเลือก สินค้า, ต้นทาง และปลายทาง");
    }
    const qty = parseInt(amount);
    if (isNaN(qty) || qty <= 0) return Alert.alert("แจ้งเตือน", "จำนวนต้องมากกว่า 0");

    setIsLoading(true);
    try {
      // Logic การ Update API...
      Alert.alert("สำเร็จ ✅", `ย้ายเรียบร้อยแล้ว`, [{ text: "ตกลง", onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert("Error", "เกิดข้อผิดพลาด");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) return <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>🔄 โอนย้ายจุดจัดเก็บ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.label}>1. เลือกสินค้าที่จะย้าย</Text>
        <TouchableOpacity style={styles.productSelector} onPress={() => setShowProductModal(true)}>
          {selectedProduct ? (
            <View>
              <Text style={styles.selectedProdName}>{selectedProduct.name}</Text>
              <Text style={styles.selectedProdStock}>สต็อกรวม: {selectedProduct.stock}</Text>
            </View>
          ) : (
            <Text style={{color: '#94a3b8'}}>--- คลิกเพื่อค้นหาและเลือกสินค้า ---</Text>
          )}
          <Ionicons name="search" size={20} color="#8b5cf6" />
        </TouchableOpacity>

        <Text style={styles.label}>2. จุดจัดเก็บต้นทาง (เลือกจุดที่มีของ)</Text>
        <View style={styles.locContainer}>
          {stockAtLocations.length > 0 ? stockAtLocations.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.locBadge, fromLocation?.id === item.id && styles.activeFrom]}
              onPress={() => setFromLocation(item)}
            >
              <Text style={[styles.locText, fromLocation?.id === item.id && {color: 'white'}]}>
                {item.location?.name} ({item.on_hand_stock})
              </Text>
            </TouchableOpacity>
          )) : <Text style={styles.emptyText}>{selectedProduct ? "❌ สินค้านี้ยังไม่มีจุดจัดเก็บ" : "กรุณาเลือกสินค้าก่อน"}</Text>}
        </View>

        <Text style={styles.label}>3. จุดจัดเก็บปลายทาง</Text>
        <View style={styles.locContainer}>
          {allLocations.map((loc) => (
            <TouchableOpacity 
              key={loc.documentId} 
              style={[styles.locBadge, toLocation?.documentId === loc.documentId && styles.activeTo]}
              onPress={() => setToLocation(loc)}
            >
              <Text style={[styles.locText, toLocation?.documentId === loc.documentId && {color: 'white'}]}>{loc.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>4. ระบุจำนวนที่ต้องการย้าย</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={amount} onChangeText={setAmount} />
        <View style={{height: 100}} />
      </ScrollView>

      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProductModal(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
            <Text style={styles.modalTitle}>เลือกสินค้า</Text>
            <View style={{width: 28}} />
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput style={styles.searchBar} placeholder="ค้นหาชื่อสินค้า..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              <TouchableOpacity style={[styles.catChip, selectedCategory === "all" && styles.catChipActive]} onPress={() => setSelectedCategory("all")}>
                <Text style={[styles.catChipText, selectedCategory === "all" && {color: 'white'}]}>ทั้งหมด</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity key={cat.documentId} style={[styles.catChip, selectedCategory === cat.documentId && styles.catChipActive]} onPress={() => setSelectedCategory(cat.documentId)}>
                  <Text style={[styles.catChipText, selectedCategory === cat.documentId && {color: 'white'}]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.catScroll, {marginTop: 5}]}>
              <TouchableOpacity style={[styles.locFilterChip, filterLocation === "all" && styles.locFilterActive]} onPress={() => setFilterLocation("all")}>
                <Ionicons name="location" size={14} color={filterLocation === "all" ? "white" : "#64748b"} />
                <Text style={[styles.catChipText, filterLocation === "all" && {color: 'white'}]}> ทุกจุดเก็บ</Text>
              </TouchableOpacity>
              {allLocations.map(loc => (
                <TouchableOpacity key={loc.documentId} style={[styles.locFilterChip, filterLocation === loc.documentId && styles.locFilterActive]} onPress={() => setFilterLocation(loc.documentId)}>
                  <Text style={[styles.catChipText, filterLocation === loc.documentId && {color: 'white'}]}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <FlatList data={filteredProducts} keyExtractor={(item) => item.documentId} renderItem={({item}) => (
            <TouchableOpacity style={styles.productListItem} onPress={() => { setSelectedProduct(item); setShowProductModal(false); }}>
              <View><Text style={styles.prodItemName}>{item.name}</Text><Text style={styles.prodItemStock}>สต็อกรวม: {item.stock}</Text></View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )} />
        </SafeAreaView>
      </Modal>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitBtn, (isLoading || !fromLocation || !toLocation) && { backgroundColor: '#ccc' }]} onPress={handleTransfer} disabled={isLoading || !fromLocation || !toLocation}>
          {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.submitText}>ยืนยันการโอนย้าย</Text>}
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
  locContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  locBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  locText: { fontSize: 14, color: '#475569' },
  activeFrom: { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
  activeTo: { backgroundColor: '#10b981', borderColor: '#10b981' },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 22, textAlign: 'center', fontWeight: 'bold' },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  submitBtn: { backgroundColor: '#8b5cf6', padding: 18, borderRadius: 15, alignItems: 'center' },
  submitText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', padding: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 15, paddingHorizontal: 15, borderRadius: 12 },
  searchBar: { flex: 1, padding: 12, fontSize: 16 },
  catScroll: { paddingHorizontal: 15, marginBottom: 10 },
  catChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 10 },
  catChipActive: { backgroundColor: '#8b5cf6' },
  catChipText: { fontSize: 13, color: '#475569' },
  locFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  locFilterActive: { backgroundColor: '#64748b', borderColor: '#64748b' },
  productListItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  prodItemName: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  prodItemStock: { fontSize: 12, color: '#64748b' }
});