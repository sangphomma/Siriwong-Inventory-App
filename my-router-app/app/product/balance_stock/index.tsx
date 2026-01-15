import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, 
  Modal, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_URL } from '../../../constants/Config';
import { useAuth } from '../../../contexts/AuthContext';
import { createTransaction } from '../../../utils/transactionHelper';

export default function BalanceStockScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  
  // --- Data ---
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // --- Flow State ---
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // --- Selection State ---
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedStockLocation, setSelectedStockLocation] = useState<any>(null);

  // --- Adjust Logic State ---
  const [actualQtyStr, setActualQtyStr] = useState("");
  const [reason, setReason] = useState("Audit (ตรวจนับประจำรอบ)");
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // ดึงสินค้า พร้อม stock_locations และ location ของมัน เพื่อเอามาแสดงให้เลือก
      const res = await fetch(`${API_URL}/products?populate[stock_locations][populate]=location&sort=name:asc&pagination[pageSize]=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setProducts(json.data || []);
    } catch (e) { 
      Alert.alert("Error", "โหลดข้อมูลสินค้าไม่สำเร็จ"); 
    } finally { 
      setLoading(false); 
    }
  };

  // 1. ฟังก์ชันเลือกสินค้า
  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    setShowProductModal(false);
    setShowLocationModal(true); // ไปเลือก Location ต่อเลย
  };

  // 2. ฟังก์ชันเลือก Location (เพื่อเตรียมปรับยอด)
  const handleSelectLocation = (stockLoc: any) => {
    setSelectedStockLocation(stockLoc);
    setActualQtyStr(stockLoc.on_hand_stock.toString()); // ตั้งค่าเริ่มต้นเป็นยอดปัจจุบัน
    setReason("Audit (ตรวจนับประจำรอบ)");
    setShowLocationModal(false);
    setShowAdjustModal(true); // เปิดหน้าปรับยอด
  };

  // 3. ฟังก์ชันบันทึกการปรับยอด (Logic ใหม่: in/out + Remark)
  const handleAdjust = async () => {
    // เช็ค token กันเหนียว (แก้ error TypeScript)
    if (!selectedStockLocation || !token) return;

    const actualQty = parseFloat(actualQtyStr);
    if (isNaN(actualQty) || actualQty < 0) return Alert.alert("แจ้งเตือน", "กรุณาระบุจำนวนที่ถูกต้อง");

    const diff = actualQty - selectedStockLocation.on_hand_stock;
    if (diff === 0) return Alert.alert("แจ้งเตือน", "ยอดตรงกัน ไม่จำเป็นต้องปรับ");

    setAdjusting(true);
    try {
      // A. Update Stock Location (PUT)
      await fetch(`${API_URL}/stock-locations/${selectedStockLocation.documentId || selectedStockLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ data: { on_hand_stock: actualQty } })
      });

      // B. Create Transaction (Logic แก้ไขเพื่อรองรับ Strapi Production)
      // ถ้า diff เป็นบวก = เจอของเกิน (in)
      // ถ้า diff เป็นลบ = ของหาย (out)
      const type = diff > 0 ? 'in' : 'out'; 
      const amount = Math.abs(diff);

      await createTransaction({
        token,
        productId: selectedProduct.id, 
        locationId: selectedStockLocation.location.id,
        type: type, // ✅ ส่ง 'in' หรือ 'out' แทน 'adjust' (เพื่อให้ผ่าน Validation ของ Strapi)
        amount: amount,
        docNo: `ADJ-${new Date().getTime()}`,
        userId: user?.id,
        // ✅ ใช้ Remark ระบุว่าเป็น Audit แทน
        remark: `[Audit] ${reason} (เดิม: ${selectedStockLocation.on_hand_stock} -> ใหม่: ${actualQty})`
      });

      Alert.alert("สำเร็จ", "ปรับยอดเรียบร้อยแล้ว");
      
      // Reset Flow
      setShowAdjustModal(false);
      setSelectedStockLocation(null);
      setSelectedProduct(null);
      
      // Refresh Data (เผื่อนับตัวอื่นต่อ)
      fetchProducts(); 

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "เกิดข้อผิดพลาด");
    } finally {
      setAdjusting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
        <Text style={styles.headerTitle}>⚖️ ปรับปรุงยอดสต็อก (Balance)</Text>
        <View style={{width:24}}/>
      </View>

      <View style={styles.content}>
        {/* กล่องใหญ่ตรงกลาง ชวนให้เริ่มนับ */}
        <View style={styles.actionBox}>
            <Ionicons name="scan-circle-outline" size={80} color="#db2777" />
            <Text style={styles.actionTitle}>เริ่มการตรวจสอบ</Text>
            <Text style={styles.actionSub}>เลือกสินค้าเพื่อทำการนับและปรับยอด</Text>
            
            <TouchableOpacity style={styles.startBtn} onPress={() => setShowProductModal(true)}>
                <Ionicons name="search" size={24} color="white" />
                <Text style={styles.startBtnText}>ค้นหาสินค้าที่จะนับ</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 คำแนะนำ:</Text>
            <Text style={styles.tipText}>• เดินไปที่จุดเก็บของก่อน แล้วค่อยเลือกสินค้า</Text>
            <Text style={styles.tipText}>• หากไม่พบจุดเก็บในรายการ แสดงว่ายังไม่เคยมีการลงทะเบียนสินค้านั้นเข้าจุดเก็บ (ให้ไปเมนูลงทะเบียนก่อน)</Text>
        </View>
      </View>

      {/* --------------------------------------------------------- */}
      {/* MODAL 1: เลือกสินค้า */}
      {/* --------------------------------------------------------- */}
      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={styles.modalFull}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowProductModal(false)}><Ionicons name="close" size={28} color="#333"/></TouchableOpacity>
                <Text style={styles.modalTitle}>1. เลือกสินค้า</Text>
                <View style={{width:28}}/>
            </View>
            
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput 
                    style={styles.searchInput} 
                    placeholder="พิมพ์ชื่อสินค้า..." 
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus
                />
            </View>

            {loading ? <ActivityIndicator style={{marginTop:20}} color="#db2777"/> : (
                <FlatList
                    data={filteredProducts}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{padding: 15}}
                    renderItem={({item}) => (
                        <TouchableOpacity style={styles.productRow} onPress={() => handleSelectProduct(item)}>
                            <View>
                                <Text style={styles.prodName}>{item.name}</Text>
                                <Text style={styles.prodCode}>{item.unit || 'ชิ้น'}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#ccc" />
                        </TouchableOpacity>
                    )}
                />
            )}
        </SafeAreaView>
      </Modal>

      {/* --------------------------------------------------------- */}
      {/* MODAL 2: เลือก Location */}
      {/* --------------------------------------------------------- */}
      <Modal visible={showLocationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitleCenter}>2. เลือกจุดที่จะนับ</Text>
                <Text style={styles.selectedProdName}>{selectedProduct?.name}</Text>
                
                <ScrollView style={{maxHeight: 300, width: '100%'}}>
                    {selectedProduct?.stock_locations?.length > 0 ? (
                        selectedProduct.stock_locations.map((loc: any) => (
                            <TouchableOpacity key={loc.id} style={styles.locRow} onPress={() => handleSelectLocation(loc)}>
                                <View style={{flexDirection:'row', alignItems:'center'}}>
                                    <Ionicons name="location-sharp" size={24} color="#db2777" />
                                    <Text style={styles.locName}>{loc.location?.name || 'Unknown'}</Text>
                                </View>
                                <View style={{alignItems:'flex-end'}}>
                                    <Text style={{fontSize:10, color:'#64748b'}}>ระบบมี</Text>
                                    <Text style={styles.locStock}>{loc.on_hand_stock}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={{padding:20, alignItems:'center'}}>
                            <Text style={{color:'#94a3b8'}}>สินค้านี้ยังไม่ได้ลงทะเบียนเข้าจุดเก็บใดๆ</Text>
                        </View>
                    )}
                </ScrollView>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowLocationModal(false)}>
                    <Text style={{color:'#64748b'}}>ย้อนกลับ</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {/* --------------------------------------------------------- */}
      {/* MODAL 3: ปรับยอด */}
      {/* --------------------------------------------------------- */}
      <Modal visible={showAdjustModal} transparent animationType="slide">
         <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitleCenter}>3. ปรับยอดคงเหลือ</Text>
                <Text style={{textAlign:'center', marginBottom:10, color:'#64748b'}}>
                    {selectedProduct?.name} @ {selectedStockLocation?.location?.name}
                </Text>
                
                <View style={styles.compareRow}>
                    <View style={styles.col}>
                        <Text style={styles.label}>ยอดเดิม</Text>
                        <Text style={styles.valSystem}>{selectedStockLocation?.on_hand_stock}</Text>
                    </View>
                    <Ionicons name="arrow-forward" size={24} color="#cbd5e1" />
                    <View style={styles.col}>
                        <Text style={styles.label}>นับได้จริง</Text>
                        <TextInput 
                            style={styles.inputQty} 
                            value={actualQtyStr} 
                            onChangeText={setActualQtyStr}
                            keyboardType="numeric"
                            selectTextOnFocus
                            autoFocus
                        />
                    </View>
                </View>

                {/* Diff Display */}
                <View style={styles.diffBox}>
                    <Text>ผลต่าง (Diff): </Text>
                    <Text style={{
                        fontWeight:'bold', 
                        color: (parseFloat(actualQtyStr) - selectedStockLocation?.on_hand_stock) === 0 ? '#64748b' : 
                               (parseFloat(actualQtyStr) - selectedStockLocation?.on_hand_stock) < 0 ? '#ef4444' : '#10b981'
                    }}>
                            {isNaN(parseFloat(actualQtyStr)) ? 0 : parseFloat(actualQtyStr) - selectedStockLocation?.on_hand_stock}
                    </Text>
                </View>

                <Text style={[styles.label, {marginTop:15, alignSelf:'flex-start'}]}>สาเหตุ:</Text>
                <View style={styles.reasons}>
                    {['Audit (ตรวจนับ)', 'ของหาย/ชำรุด', 'พบของเกิน', 'ปรับปรุงข้อมูล'].map(r => (
                        <TouchableOpacity key={r} onPress={() => setReason(r)} style={[styles.reasonChip, reason===r && styles.reasonActive]}>
                            <Text style={[styles.reasonText, reason===r && {color:'white'}]}>{r}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.btnRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdjustModal(false)}>
                        <Text>ยกเลิก</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.saveBtn, adjusting && {backgroundColor:'#94a3b8'}]} onPress={handleAdjust} disabled={adjusting}>
                        {adjusting ? <ActivityIndicator color="white"/> : <Text style={{color:'white', fontWeight:'bold'}}>ยืนยันปรับยอด</Text>}
                    </TouchableOpacity>
                </View>
            </View>
         </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#db2777', padding: 20, paddingTop: 50, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  actionBox: { backgroundColor: 'white', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 3 },
  actionTitle: { fontSize: 22, fontWeight: 'bold', color: '#db2777', marginTop: 15 },
  actionSub: { fontSize: 14, color: '#64748b', marginTop: 5, marginBottom: 25, textAlign: 'center' },
  startBtn: { flexDirection: 'row', backgroundColor: '#db2777', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 30, alignItems: 'center', gap: 10, elevation: 5 },
  startBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  tipBox: { marginTop: 30, padding: 20, backgroundColor: '#fdf2f8', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#db2777' },
  tipTitle: { fontWeight: 'bold', color: '#db2777', marginBottom: 5 },
  tipText: { fontSize: 13, color: '#4b5563', marginBottom: 3 },

  // --- Modal Styles ---
  modalFull: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 15, paddingHorizontal: 15, borderRadius: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  
  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  prodName: { fontSize: 16, color: '#333' },
  prodCode: { fontSize: 12, color: '#94a3b8' },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalCard: { backgroundColor:'white', width:'90%', padding:20, borderRadius:15, alignItems:'center' },
  modalTitleCenter: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  selectedProdName: { fontSize: 16, color: '#db2777', marginBottom: 15, fontWeight: '600' },
  
  locRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff1f2', borderRadius: 8, marginBottom: 8 },
  locName: { fontSize: 16, color: '#333', marginLeft: 10, fontWeight: '500' },
  locStock: { fontSize: 18, fontWeight: 'bold', color: '#db2777' },

  compareRow: { flexDirection:'row', alignItems:'center', justifyContent:'space-around', width:'100%', marginBottom:15 },
  col: { alignItems:'center' },
  label: { fontSize:12, color:'#64748b', marginBottom:5 },
  valSystem: { fontSize:24, fontWeight:'bold', color:'#64748b' },
  inputQty: { borderWidth:2, borderColor:'#db2777', borderRadius:8, width:80, height:50, textAlign:'center', fontSize:24, fontWeight:'bold', color:'#333' },
  diffBox: { flexDirection:'row', backgroundColor:'#f8fafc', padding:10, borderRadius:8, width:'100%', justifyContent:'center' },
  reasons: { flexDirection:'row', flexWrap:'wrap', gap:8, marginTop:10, marginBottom:20 },
  reasonChip: { paddingHorizontal:10, paddingVertical:6, borderRadius:15, backgroundColor:'#f1f5f9' },
  reasonActive: { backgroundColor:'#db2777' },
  reasonText: { fontSize:12, color:'#64748b' },
  btnRow: { flexDirection:'row', gap:10, width:'100%' },
  cancelBtn: { flex:1, padding:12, borderRadius:8, backgroundColor:'#f1f5f9', alignItems:'center' },
  saveBtn: { flex:1, padding:12, borderRadius:8, backgroundColor:'#db2777', alignItems:'center' }
});