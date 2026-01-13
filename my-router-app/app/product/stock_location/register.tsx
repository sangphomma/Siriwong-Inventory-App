import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, ScrollView, FlatList 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { API_URL } from '../../../constants/Config'; 
import { useAuth } from '../../../contexts/AuthContext';

export default function RegisterStockLocation() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams();
  
  // State หลัก
  const [productId, setProductId] = useState<string | null>(params.productId ? String(params.productId) : null);
  const [productData, setProductData] = useState<any>(null);
  
  // State สำหรับหน้าเลือกสินค้า
  const [products, setProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  // State สำหรับหน้า Form
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!productId) {
      fetchProductList();
    } else {
      fetchProductDetails(productId);
      fetchLocations();
    }
  }, [productId]);

  // --- API ---
  const fetchProductList = async () => {
    try {
      setLoadingList(true);
      const url = `${API_URL}/products?populate[stock_locations][fields][0]=on_hand_stock&pagination[pageSize]=100&sort=name:asc`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      setProducts(json.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingList(false); }
  };

  const fetchProductDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/products/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      setProductData(json.data);
      fetchLocations();
    } catch (err) { Alert.alert("Error", "หาข้อมูลสินค้าไม่เจอ"); }
    finally { setLoadingDetails(false); }
  };

  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_URL}/locations?sort=name:asc`, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      setLocations(json.data || []);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!productId || !selectedLocId || !qty) return Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบ");
    
    setSubmitting(true);
    try {
      const payload = {
        data: {
          product: productId,
          location: selectedLocId,
          on_hand_stock: parseInt(qty)
        }
      };

      const res = await fetch(`${API_URL}/stock-locations`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Alert.alert("สำเร็จ", "ลงทะเบียนเข้าจุดเก็บเรียบร้อย", [{ text: "ตกลง", onPress: () => router.back() }]);
      } else {
        throw new Error("Save failed");
      }
    } catch (err) {
      Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ (อาจมีการลงทะเบียนจุดนี้ไปแล้ว)");
    } finally {
      setSubmitting(false);
    }
  };

  // --- Helper ---
  const calculateRealStock = (item: any) => {
    const locs = item.stock_locations || [];
    return locs.reduce((sum: number, loc: any) => sum + (parseInt(loc.on_hand_stock) || 0), 0);
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);


  // ==========================================
  // VIEW 1: หน้าเลือกสินค้า (✅ ปลดล็อกให้เลือกได้ทุกตัว)
  // ==========================================
  if (!productId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
            <Text style={styles.title}>เลือกสินค้าที่จะเติมเข้าชั้น</Text>
            <View style={{width: 24}} />
        </View>

        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput 
              style={styles.searchBar} 
              placeholder="ค้นหาชื่อสินค้า..." 
              value={searchQuery} 
              onChangeText={setSearchQuery} 
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                </TouchableOpacity>
            )}
        </View>

        {loadingList ? (
            <ActivityIndicator style={{marginTop: 20}} size="large" color="#00796B" />
        ) : (
            <FlatList 
                data={filteredProducts}
                keyExtractor={(item) => (item.documentId || item.id).toString()}
                contentContainerStyle={{paddingBottom: 20}}
                renderItem={({item}) => {
                    const realStock = calculateRealStock(item);
                    const isZero = realStock <= 0;
                    
                    return (
                        <TouchableOpacity 
                            style={styles.productCard} 
                            onPress={() => setProductId(item.documentId || item.id)}
                            // 🔓 เอา disabled ออกแล้วครับ กดได้ทุกตัว
                        >
                            <View style={{flex: 1}}>
                                <Text style={styles.productNameList}>{item.name}</Text>
                                <Text style={{
                                    color: isZero ? '#f59e0b' : '#10b981', // สีส้มถ้า 0, สีเขียวถ้ามีของ
                                    fontSize: 13, 
                                    marginTop: 4, 
                                    fontWeight: 'bold'
                                }}>
                                    {isZero ? "🟠 สต็อกปัจจุบัน: 0 (พร้อมรับเข้า)" : `✅ มีในคลังแล้ว: ${realStock} ${item.unit || 'ชิ้น'}`}
                                </Text>
                            </View>
                            {/* แสดงปุ่มบวกเสมอ */}
                            <Ionicons name="add-circle" size={32} color="#00796B" />
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={<Text style={{textAlign:'center', marginTop: 20, color:'#999'}}>ไม่พบสินค้า</Text>}
            />
        )}
      </SafeAreaView>
    );
  }

  // ==========================================
  // VIEW 2: Form ลงทะเบียน (เหมือนเดิม)
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
            if (params.productId) router.back();
            else setProductId(null);
        }}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>ลงทะเบียนจุดเก็บ</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={{padding: 20}}>
        <View style={styles.infoCard}>
            <Text style={styles.label}>สินค้าที่เลือก:</Text>
            {loadingDetails ? <ActivityIndicator /> : (
                <Text style={styles.productNameHighlight}>{productData?.name || "..."}</Text>
            )}
        </View>

        <Text style={styles.label}>เลือกจุดจัดเก็บ *</Text>
        <View style={styles.grid}>
            {locations.length > 0 ? locations.map((loc) => {
                const isActive = String(selectedLocId) === String(loc.documentId || loc.id);
                return (
                    <TouchableOpacity 
                        key={loc.documentId || loc.id}
                        style={[styles.chip, isActive && styles.chipActive]}
                        onPress={() => setSelectedLocId(loc.documentId || loc.id)}
                    >
                        <Text style={[styles.chipText, isActive && {color: 'white'}]}>{loc.name}</Text>
                    </TouchableOpacity>
                );
            }) : <Text style={{color: '#999'}}>ยังไม่มี Master จุดเก็บ</Text>}
        </View>

        <Text style={[styles.label, {marginTop: 20}]}>จำนวนที่ต้องการเติม *</Text>
        <TextInput 
            style={styles.qtyInput}
            keyboardType="numeric"
            value={qty}
            onChangeText={setQty}
            placeholder="0"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
             {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 15, paddingHorizontal: 15, borderRadius: 12 },
  searchBar: { flex: 1, padding: 12, fontSize: 16 },
  productCard: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  productNameList: { fontSize: 16, color: '#334155', fontWeight: '500' },
  infoCard: { backgroundColor: '#E0F2F1', padding: 15, borderRadius: 12, marginBottom: 20 },
  productNameHighlight: { fontSize: 18, fontWeight: 'bold', color: '#00796B', marginTop: 5 },
  label: { fontSize: 14, color: '#64748b', marginBottom: 10, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#00796B', borderColor: '#00796B' },
  chipText: { color: '#333' },
  qtyInput: { backgroundColor: '#f8fafc', fontSize: 24, textAlign: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', color: '#00796B', fontWeight: 'bold' },
  saveBtn: { marginTop: 30, backgroundColor: '#00796B', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});