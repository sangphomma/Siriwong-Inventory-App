import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, Modal, FlatList 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../constants/Config';

export default function CreateReturnScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Form State
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState<any[]>([]); 

  // Modal State
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [resSites, resProducts] = await Promise.all([
        fetch(`${API_URL}/project-sites`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/products`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const jsonSites = await resSites.json();
      const jsonProducts = await resProducts.json();

      setSites(jsonSites.data || []);
      setProducts(jsonProducts.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    }
  };

  // ⭐ Helper function: ช่วยดึงค่าออกมา ไม่ว่าจะเป็น v4 (attributes) หรือ v5 (flatten)
  const getValue = (item: any, key: string) => {
    if (!item) return '';
    // ลองหาในตัว item ตรงๆ ก่อน (v5) ถ้าไม่มีค่อยไปหาใน attributes (v4)
    return item[key] !== undefined ? item[key] : (item.attributes?.[key] || '');
  };

  const addToCart = (product: any) => {
    // เช็คว่า documentId หรือ id ตรงกันหรือไม่
    const productId = product.documentId || product.id;
    const existing = cart.find(item => (item.documentId || item.id) === productId);
    
    if (existing) {
      Alert.alert("ซ้ำ", "สินค้านี้อยู่ในรายการคืนแล้ว");
      return;
    }
    setCart([...cart, { ...product, qty_return: 1 }]);
    setShowProductModal(false);
  };

  const updateQty = (index: number, text: string) => {
    const qty = parseInt(text) || 0;
    const newCart = [...cart];
    newCart[index].qty_return = qty;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleSubmit = async () => {
    if (!selectedSite) return Alert.alert("แจ้งเตือน", "กรุณาเลือกไซท์งานที่จะคืนของ");
    if (cart.length === 0) return Alert.alert("แจ้งเตือน", "ยังไม่ได้เลือกสินค้าที่จะคืน");
    
    const invalidItem = cart.find(i => i.qty_return <= 0);
    if (invalidItem) return Alert.alert("แจ้งเตือน", `สินค้า ${getValue(invalidItem, 'name')} จำนวนต้องมากกว่า 0`);

    Alert.alert("ยืนยัน", "ต้องการส่งใบรับคืนของใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ยืนยัน", onPress: processSubmit }
    ]);
  };

const processSubmit = async () => {
    // 🛡️ เพิ่มตัวกัน Error: ถ้าไม่มี User ให้เด้งออกเลย
    if (!user) {
      Alert.alert("Error", "ไม่พบข้อมูลผู้ใช้งาน กรุณา Login ใหม่");
      return;
    }

    setLoading(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.floor(1000 + Math.random() * 9000);
      const jobNo = `RET-${dateStr}-${random}`;

      const payload = {
        data: {
          job_no: jobNo,
          return_status: 'pending',
          note: note,
          // ⭐ แก้ไขจุด Error: ใส่ (user as any) เพื่อข้ามการเช็ค Type ของ TypeScript
          return_by: (user as any).id || (user as any).documentId, 
          project_site: selectedSite.id || selectedSite.documentId,
          items: cart.map(item => ({
            product: item.documentId || item.id,
            qty_request: item.qty_return
          }))
        }
      };

      const res = await fetch(`${API_URL}/return-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Alert.alert("สำเร็จ", `ส่งใบคืนของเรียบร้อย\nเลขที่: ${jobNo}`);
        router.back();
      } else {
        const err = await res.json();
        throw new Error(err.error?.message || "ส่งข้อมูลไม่สำเร็จ");
      }

    } catch (error: any) {
      Alert.alert("ผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>📦 สร้างใบคืนของ (Return)</Text>

        {/* 1. เลือกไซท์งาน */}
        <Text style={styles.label}>เลือกไซท์งานที่คืนของ:</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setShowSiteModal(true)}>
          <Text style={{ color: selectedSite ? '#000' : '#aaa' }}>
            {selectedSite ? getValue(selectedSite, 'name') : "คลิกเพื่อเลือกไซท์งาน"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        {/* 2. รายการสินค้า */}
        <View style={styles.rowBetween}>
          <Text style={styles.label}>รายการวัสดุที่จะคืน:</Text>
          <TouchableOpacity onPress={() => setShowProductModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={16} color="white" />
            <Text style={styles.addBtnText}>เพิ่มสินค้า</Text>
          </TouchableOpacity>
        </View>

        {cart.map((item, index) => (
          <View key={index} style={styles.cartItem}>
            <View style={{flex: 1}}>
              {/* ⭐ ใช้ getValue เพื่อป้องกัน error */}
              <Text style={styles.itemName}>{getValue(item, 'name')}</Text>
              <Text style={styles.itemCode}>Stock: {getValue(item, 'stock')}</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
              <TextInput 
                style={styles.qtyInput} 
                keyboardType="numeric"
                value={item.qty_return?.toString()}
                onChangeText={(text) => updateQty(index, text)}
              />
              <Text>หน่วย</Text>
              <TouchableOpacity onPress={() => removeFromCart(index)}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {cart.length === 0 && <Text style={styles.emptyText}>ยังไม่มีรายการสินค้า</Text>}

        <Text style={[styles.label, { marginTop: 20 }]}>หมายเหตุ (ถ้ามี):</Text>
        <TextInput 
          style={styles.inputArea} 
          multiline 
          placeholder="ระบุสาเหตุการคืน..."
          value={note}
          onChangeText={setNote}
        />
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>ยืนยันการคืนของ</Text>}
        </TouchableOpacity>
      </View>

      {/* Modal: เลือก Site */}
      <Modal visible={showSiteModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>เลือกไซท์งาน</Text>
          <FlatList 
            data={sites}
            keyExtractor={(item) => (item.id || item.documentId).toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedSite(item); setShowSiteModal(false); }}>
                {/* ⭐ แก้ไขจุด Error ตรงนี้ */}
                <Text style={styles.modalItemText}>{getValue(item, 'name')}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSiteModal(false)}><Text style={{color:'white'}}>ปิด</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* Modal: เลือก Product */}
      <Modal visible={showProductModal} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>เลือกสินค้าที่จะคืน</Text>
          <FlatList 
            data={products}
            keyExtractor={(item) => (item.id || item.documentId).toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => addToCart(item)}>
                 {/* ⭐ แก้ไขจุด Error ตรงนี้ */}
                <Text style={styles.modalItemText}>{getValue(item, 'name')}</Text>
                <Text style={{color: '#666'}}>คงเหลือ: {getValue(item, 'stock')}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.closeBtn} onPress={() => setShowProductModal(false)}><Text style={{color:'white'}}>ปิด</Text></TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 20, marginTop: 10 },
  label: { fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 8 },
  selector: { backgroundColor: 'white', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemCode: { fontSize: 12, color: '#94a3b8' },
  qtyInput: { width: 60, height: 40, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, textAlign: 'center', fontSize: 16, marginRight: 8 },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginVertical: 20, fontStyle: 'italic' },
  inputArea: { backgroundColor: 'white', padding: 15, borderRadius: 10, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#e2e8f0' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  submitBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  modalContainer: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#f8fafc' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalItem: { padding: 15, backgroundColor: 'white', borderRadius: 10, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItemText: { fontSize: 16 },
  closeBtn: { marginTop: 20, backgroundColor: '#64748b', padding: 15, borderRadius: 10, alignItems: 'center' }
});