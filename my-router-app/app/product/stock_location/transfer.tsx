import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, FlatList, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { API_URL } from '../../../constants/Config'; 
import { useAuth } from '../../../contexts/AuthContext';

export default function TransferStock() {
  const router = useRouter();
  const { token } = useAuth();

  // State Flow
  const [step, setStep] = useState(1); // 1=Select Product, 2=Select Source, 3=Target & Qty

  // Data State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [sourceLoc, setSourceLoc] = useState<any>(null);
  const [targetLocs, setTargetLocs] = useState<any[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [transferQty, setTransferQty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // 1. ดึงรายการสินค้าทั้งหมด (พร้อม Stock)
  const fetchProducts = async () => {
    try {
      setLoadingList(true);
      const url = `${API_URL}/products?populate[stock_locations][populate]=location&pagination[pageSize]=100&sort=name:asc`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const json = await res.json();
      setProducts(json.data || []);
    } catch(e) { console.error(e); }
    finally { setLoadingList(false); }
  };

  // Helper: คำนวณสต็อกจริง
  const calculateRealStock = (item: any) => {
    const locs = item.stock_locations || [];
    return locs.reduce((sum: number, loc: any) => sum + (parseInt(loc.on_hand_stock) || 0), 0);
  };

  // กรองสินค้า
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);


  // Action: เลือกสินค้า
  const handleSelectProduct = (item: any) => {
    setSelectedProduct(item);
    setStep(2);
  };

  // Action: เลือกต้นทาง
  const handleSelectSource = async (loc: any) => {
    setSourceLoc(loc);
    // โหลด Master Locations มารอสำหรับเป็นปลายทาง
    try {
        const res = await fetch(`${API_URL}/locations?sort=name:asc`, { headers: { 'Authorization': `Bearer ${token}` } });
        const json = await res.json();
        setTargetLocs(json.data || []);
        setStep(3);
    } catch(e) { Alert.alert("Error", "โหลดรายชื่อจุดเก็บไม่สำเร็จ"); }
  };

  // Action: บันทึกการย้าย
  const handleTransfer = async () => {
    const qty = parseInt(transferQty);
    if (!selectedTargetId || isNaN(qty) || qty <= 0) return Alert.alert("แจ้งเตือน", "กรุณาระบุจำนวนที่ถูกต้อง");
    if (qty > sourceLoc.on_hand_stock) return Alert.alert("แจ้งเตือน", "ยอดคงเหลือต้นทางไม่พอ");

    setSubmitting(true);
    try {
        // A. ตัดยอดต้นทาง
        const newSourceQty = sourceLoc.on_hand_stock - qty;
        await fetch(`${API_URL}/stock-locations/${sourceLoc.documentId || sourceLoc.id}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { on_hand_stock: newSourceQty } })
        });

        // B. เพิ่มยอดปลายทาง (Create New Entry Logic for MVP)
        const payload = {
            data: {
                product: selectedProduct.documentId || selectedProduct.id,
                location: selectedTargetId,
                on_hand_stock: qty
            }
        };

        const res = await fetch(`${API_URL}/stock-locations`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            Alert.alert("สำเร็จ", "โอนย้ายสินค้าเรียบร้อย", [{ text: "ตกลง", onPress: () => router.back() }]);
        } else {
            Alert.alert("แจ้งเตือน", "ตัดยอดต้นทางแล้ว แต่ปลายทางอาจขัดข้อง (กรุณาเช็คสต็อก)");
        }
    } catch (e) { Alert.alert("Error", "เกิดข้อผิดพลาด"); }
    finally { setSubmitting(false); }
  };


  // --- STEP 1: เลือกสินค้า (สไตล์ Create Request) ---
  if (step === 1) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="#333"/></TouchableOpacity>
                <Text style={styles.title}>1. เลือกสินค้าที่จะย้าย</Text>
                <View style={{width: 24}}/>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput style={styles.searchBar} placeholder="ค้นหาสินค้า..." value={searchQuery} onChangeText={setSearchQuery} />
                {searchQuery.length>0 && <TouchableOpacity onPress={()=>setSearchQuery('')}><Ionicons name="close-circle" size={20} color="#94a3b8"/></TouchableOpacity>}
            </View>

            {loadingList ? <ActivityIndicator size="large" color="#8b5cf6" style={{marginTop:20}}/> : (
                <FlatList data={filteredProducts} keyExtractor={i=>(i.documentId||i.id).toString()} renderItem={({item}) => {
                    const realStock = calculateRealStock(item);
                    const isOut = realStock <= 0;
                    return (
                        <TouchableOpacity 
                            style={[styles.productCard, isOut && {backgroundColor: '#f8fafc', opacity: 0.7}]} 
                            onPress={() => handleSelectProduct(item)}
                            disabled={isOut} // 🔒 ห้ามกดถ้าไม่มีของ
                        >
                            <View style={{flex: 1}}>
                                <Text style={[styles.productNameList, isOut && {color: '#94a3b8'}]}>{item.name}</Text>
                                <Text style={{color: isOut ? '#ef4444' : '#10b981', fontSize: 13, marginTop: 4, fontWeight: 'bold'}}>
                                    {isOut ? "❌ สินค้าหมด (ไม่สามารถย้ายได้)" : `✅ คงเหลือรวม: ${realStock} ${item.unit || 'ชิ้น'}`}
                                </Text>
                            </View>
                            {!isOut && <Ionicons name="swap-horizontal" size={28} color="#8b5cf6" />}
                        </TouchableOpacity>
                    );
                }} />
            )}
        </SafeAreaView>
    );
  }

  // --- STEP 2: เลือกต้นทาง ---
  if (step === 2) {
     const locations = selectedProduct.stock_locations || [];
     // กรองเฉพาะจุดที่มีของ > 0 ถึงจะย้ายออกได้
     const availableLocations = locations.filter((l:any) => l.on_hand_stock > 0);

     return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={()=>setStep(1)}><Ionicons name="arrow-back" size={24} color="#333"/></TouchableOpacity>
                <Text style={styles.title}>2. ย้ายออกจากจุดไหน?</Text>
                <View style={{width: 24}}/>
            </View>
            
            <View style={{padding: 20, backgroundColor:'#f5f3ff'}}>
                <Text style={{fontSize:18, fontWeight:'bold', color:'#5b21b6'}}>{selectedProduct.name}</Text>
                <Text style={{color:'#666'}}>เลือกจุดจัดเก็บต้นทาง ที่ต้องการเอาของออก</Text>
            </View>

            {availableLocations.length === 0 ? (
                <View style={{padding:20, alignItems:'center'}}>
                    <Ionicons name="alert-circle-outline" size={50} color="#ccc"/>
                    <Text style={{color:'#999', marginTop:10}}>ไม่พบจุดจัดเก็บที่มีสินค้า (สต็อกเป็น 0)</Text>
                </View>
            ) : (
                <FlatList data={availableLocations} keyExtractor={i=>(i.documentId||i.id).toString()} renderItem={({item}) => (
                    <TouchableOpacity style={styles.locItem} onPress={() => handleSelectSource(item)}>
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <Ionicons name="location-outline" size={24} color="#8b5cf6" />
                            <Text style={styles.locName}>{item.location?.name || 'ไม่ระบุ'}</Text>
                        </View>
                        <Text style={styles.stockBadge}>มี: {item.on_hand_stock}</Text>
                    </TouchableOpacity>
                )} />
            )}
        </SafeAreaView>
     );
  }

  // --- STEP 3: ปลายทาง & จำนวน ---
  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={()=>setStep(2)}><Ionicons name="arrow-back" size={24} color="#333"/></TouchableOpacity>
            <Text style={styles.title}>3. ปลายทาง & จำนวน</Text>
            <View style={{width: 24}}/>
        </View>

        <ScrollView contentContainerStyle={{padding: 20}}>
            <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>สรุปการโอนย้าย</Text>
                <Text style={styles.summaryText}>📦 สินค้า: {selectedProduct.name}</Text>
                <Text style={styles.summaryText}>📤 จาก: {sourceLoc.location?.name}</Text>
                <Text style={[styles.summaryText, {color: '#d97706', fontWeight:'bold'}]}>⚡ โควต้าสูงสุด: {sourceLoc.on_hand_stock}</Text>
            </View>

            <Text style={styles.label}>ย้ายไปที่ไหน (ปลายทาง) *</Text>
            <View style={styles.grid}>
                {targetLocs.map((loc) => {
                     // ห้ามย้ายไปที่เดิม
                     const isSelf = String(loc.documentId||loc.id) === String(sourceLoc.location?.documentId||sourceLoc.location?.id);
                     if (isSelf) return null; 
                     
                     const isActive = String(selectedTargetId) === String(loc.documentId||loc.id);
                     return (
                        <TouchableOpacity key={loc.id} style={[styles.chip, isActive && styles.chipActive]} onPress={() => setSelectedTargetId(loc.documentId||loc.id)}>
                            <Text style={[styles.chipText, isActive && {color:'white'}]}>{loc.name}</Text>
                        </TouchableOpacity>
                     );
                })}
            </View>

            <Text style={[styles.label, {marginTop:25}]}>จำนวนที่ต้องการย้าย *</Text>
            <TextInput 
                style={styles.qtyInput} 
                keyboardType="numeric" 
                placeholder="ระบุจำนวน" 
                value={transferQty} 
                onChangeText={setTransferQty} 
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleTransfer} disabled={submitting}>
                {submitting ? <ActivityIndicator color="white"/> : <Text style={styles.saveBtnText}>ยืนยันการย้าย</Text>}
            </TouchableOpacity>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  
  // Style: List & Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 15, paddingHorizontal: 15, borderRadius: 12 },
  searchBar: { flex: 1, padding: 12, fontSize: 16 },
  productCard: { flexDirection: 'row', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  productNameList: { fontSize: 16, color: '#334155', fontWeight: '500' },

  // Style: Source Select
  locItem: { flexDirection:'row', justifyContent:'space-between', padding: 20, borderBottomWidth:1, borderBottomColor:'#f1f5f9', alignItems:'center' },
  locName: { fontSize:16, marginLeft: 10, color:'#333' },
  stockBadge: { backgroundColor:'#eef2ff', color:'#6366f1', paddingHorizontal:10, paddingVertical:4, borderRadius:8, fontWeight:'bold', overflow:'hidden' },

  // Style: Form
  summaryBox: { backgroundColor:'#f5f3ff', padding:20, borderRadius:12, marginBottom:20 },
  summaryTitle: { fontSize:16, fontWeight:'bold', color:'#5b21b6', marginBottom:10 },
  summaryText: { fontSize:14, color:'#4b5563', marginBottom:4 },
  label: { fontSize: 14, color: '#64748b', marginBottom: 10, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }, // สีม่วงสำหรับ Transfer
  chipText: { color: '#333' },
  qtyInput: { backgroundColor: '#f8fafc', fontSize: 24, textAlign: 'center', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', color: '#8b5cf6', fontWeight: 'bold' },
  saveBtn: { marginTop: 30, backgroundColor: '#8b5cf6', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});