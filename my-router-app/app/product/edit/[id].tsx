import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, ScrollView, 
  Alert, ActivityIndicator, StyleSheet, SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { API_URL, BASE_URL } from '../../../constants/Config';
import { useAuth } from '../../../contexts/AuthContext';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  const { token } = useAuth(); 

  const [name, setName] = useState('');
  const [unit, setUnit] = useState(''); 
  const [minStock, setMinStock] = useState(''); // ✅ ยังคงไว้ เพื่อตั้งค่าแจ้งเตือน

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]); 
  const [stockLocations, setStockLocations] = useState<any[]>([]); 
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // คำนวณสต็อกรวมอัตโนมัติ (ไว้โชว์เฉยๆ)
  const calculatedStock = useMemo(() => {
    return stockLocations.reduce((sum, item) => {
        return sum + (parseInt(item.on_hand_stock) || 0);
    }, 0);
  }, [stockLocations]);

  useEffect(() => {
    if (id && token) { initData(); }
  }, [id, token]);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const initData = async () => {
    try {
      setLoading(true);
      await fetchCategories();
      await fetchProductData();
    } catch (error) {
      console.error("Init Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`, { headers: getHeaders() }); 
      const json = await response.json();
      setCategoriesList(json.data || []);
    } catch (error) { console.log("Failed categories", error); }
  };

  const fetchProductData = async () => {
    try {
      const queryString = [
        'populate[image][fields][0]=url',
        'populate[category][fields][0]=name',
        'populate[category][fields][1]=documentId',
        'populate[stock_locations][populate][location][fields][0]=name',
        'populate[stock_locations][fields][0]=on_hand_stock',
        'populate[stock_locations][fields][1]=documentId'
      ].join('&');

      const url = `${API_URL}/products/${id}?${queryString}`;
      const response = await fetch(url, { headers: getHeaders() }); 
      const json = await response.json();
      const data = json.data;
      
      if (!data) return;

      setName(data.name || '');
      setUnit(data.unit || ''); 
      setMinStock(data.min_stock ? data.min_stock.toString() : ''); // ดึงค่า min_stock
      
      if (data.category) {
        const catData = data.category.data || data.category; 
        const targetId = catData.documentId || catData.id;
        setSelectedCategoryId(targetId);
      }

      setStockLocations(data.stock_locations || []);
      
      if (data.image?.url) {
        const fullImageUrl = data.image.url.startsWith('http') ? data.image.url : `${BASE_URL}${data.image.url}`;
        setImageUri(fullImageUrl);
      }
    } catch (error) { console.error("Fetch Data Error:", error); }
  };

  // --- Image Logic (เหมือนเดิม) ---
  const processImage = async (uri: string) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri, [{ resize: { width: 800 } }], 
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } 
      );
      setImageUri(result.uri);
    } catch (error) { Alert.alert("ผิดพลาด", "ย่อไฟล์รูปไม่สำเร็จ"); }
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตกล้อง');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const launchLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const handleImageAction = () => {
    Alert.alert("รูปภาพสินค้า", "เลือกแหล่งที่มา", [
      { text: "📸 ถ่ายภาพใหม่", onPress: launchCamera },
      { text: "🖼️ เลือกจากอัลบั้ม", onPress: launchLibrary },
      { text: "ยกเลิก", style: "cancel" }
    ]);
  };
  // ------------------------------

  // ✅ ฟังก์ชันบันทึก (Safe Mode)
  const handleSave = async () => {
    if (!name) return Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อสินค้า");
    try {
      setSubmitting(true);
      let uploadedImageId = null;
      
      if (imageUri && !imageUri.startsWith('http')) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'upload.jpg';
        formData.append('files', { uri: imageUri, name: filename, type: 'image/jpeg' } as any);
        
        const uploadRes = await fetch(`${API_URL}/upload`, { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData 
        });
        const uploadJson = await uploadRes.json();
        uploadedImageId = uploadJson[0].id;
      }

      // ⚠️ PAYLOAD นี้ส่งเฉพาะข้อมูลที่เกี่ยวกับตัวสินค้า ไม่แตะต้อง Stock/Location
      const payload = { 
        data: { 
            name, 
            unit, 
            min_stock: parseInt(minStock) || 0, // อัปเดตแค่ค่าแจ้งเตือน
            category: selectedCategoryId, 
            image: uploadedImageId || undefined 
        } 
      };
      
      const res = await fetch(`${API_URL}/products/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload) });
      if (res.ok) { 
          Alert.alert("สำเร็จ", "แก้ไขข้อมูลเรียบร้อย", [{ text: "ตกลง", onPress: () => router.back() }]); 
      } else { 
          throw new Error("Save Failed"); 
      }
    } catch (error) { Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ"); } finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#00796B" /></View>;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
      <Stack.Screen options={{ title: 'แก้ไขรายละเอียดสินค้า' }} />

      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 120}}>
        {/* Image */}
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={handleImageAction} style={styles.imageWrapper}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <Ionicons name="camera" size={40} color="#ccc" />}
          </TouchableOpacity>
          <Text style={{fontSize: 12, color: '#999', marginTop: 5}}>แตะเพื่อเปลี่ยนรูป</Text>
        </View>

        {/* Info Form */}
        <Text style={styles.label}>ชื่อสินค้า *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        
        <View style={{flexDirection: 'row', gap: 15}}>
           {/* Read Only Stock Display */}
          <View style={{flex: 1}}>
            <Text style={styles.label}>สต็อกรวม (ปัจจุบัน)</Text>
            <View style={[styles.input, { backgroundColor: '#f1f5f9', justifyContent:'center' }]}>
                 <Text style={{color: '#64748b', fontWeight: 'bold', fontSize:16}}>
                    {calculatedStock}
                 </Text>
            </View>
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.label}>หน่วยนับ</Text>
            <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
          </View>
        </View>

        {/* Min Stock Setting */}
        <View style={{marginTop: 15}}>
            <Text style={styles.label}>จำนวนแจ้งเตือนขั้นต่ำ (Min Stock)</Text>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <TextInput 
                    style={[styles.input, {flex:1, borderColor: '#fca5a5', borderWidth: 1}]} 
                    value={minStock} 
                    onChangeText={setMinStock} 
                    keyboardType="numeric"
                    placeholder="0"
                />
                <Text style={{marginLeft:10, color:'#666', fontSize: 14}}>
                    {unit || 'หน่วย'}
                </Text>
            </View>
            <Text style={{fontSize:11, color:'#ef4444', marginTop:4}}>* หากสต็อกต่ำกว่าค่านี้ รายงานจะแจ้งเตือน (แต่ไม่มีผลต่อจำนวนของ)</Text>
        </View>

        <Text style={styles.label}>หมวดหมู่</Text>
        <View style={styles.categoryGrid}>
          {categoriesList.map((cat) => {
            const isActive = String(selectedCategoryId) === String(cat.documentId) || String(selectedCategoryId) === String(cat.id);
            return (
                <TouchableOpacity key={cat.documentId || cat.id} 
                    style={[styles.chip, isActive && styles.chipActive]} 
                    onPress={() => setSelectedCategoryId(cat.documentId || cat.id)}>
                    <Text style={[styles.chipText, isActive && {color: 'white'}]}>{cat.name}</Text>
                </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.divider} />
        
        {/* Location Display (Read Only) */}
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:15}}>
            <Text style={styles.sectionTitle}>📍 ตำแหน่งจัดเก็บ (View Only)</Text>
            <TouchableOpacity onPress={() => router.push({ pathname: '/product/stock_location/register', params: { productId: id } })}>
                <Text style={{color:'#00796B', fontWeight:'bold', fontSize:12}}>+ เพิ่มจุดเก็บใหม่</Text>
            </TouchableOpacity>
        </View>

        {stockLocations.length === 0 ? (
             <Text style={{color: '#999', fontStyle: 'italic', marginBottom: 10, textAlign:'center'}}>ยังไม่มีข้อมูลจุดจัดเก็บ</Text>
        ) : (
            stockLocations.map((item) => (
              <View key={item.documentId || item.id} style={styles.locCardReadOnly}>
                <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                   <Ionicons name="location-sharp" size={20} color="#64748b" />
                   <Text style={styles.locName}>{item.location?.name || 'Unknown'}</Text>
                </View>
                <View style={{backgroundColor:'#f0fdf4', paddingHorizontal:10, paddingVertical:4, borderRadius:6}}>
                    <Text style={{fontWeight:'bold', color:'#15803d'}}>{item.on_hand_stock} {unit}</Text>
                </View>
              </View>
            ))
        )}
        
        <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={{fontSize:12, color:'#334155', flex:1, marginLeft:8}}>
                หากต้องการปรับปรุงยอดคงเหลือ กรุณาใช้เมนู <Text style={{fontWeight:'bold'}}>Audit (ปรับยอดสต็อก)</Text> หรือทำรายการ เบิก/รับคืน
            </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
            {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>บันทึกข้อมูลทั่วไป</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  imageSection: { alignItems: 'center', marginBottom: 10 },
  imageWrapper: { width: 120, height: 120, borderRadius: 15, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#475569', marginTop: 15 },
  input: { backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#00796B', borderColor: '#00796B' },
  chipText: { fontSize: 12, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  
  // New Read-Only Styles
  locCardReadOnly: { flexDirection: 'row', justifyContent:'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  locName: { fontSize: 14, fontWeight: '500', color: '#334155' },
  infoBox: { flexDirection:'row', backgroundColor:'#eff6ff', padding:15, borderRadius:10, marginTop:15, alignItems:'center' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  saveBtn: { backgroundColor: '#00796B', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});