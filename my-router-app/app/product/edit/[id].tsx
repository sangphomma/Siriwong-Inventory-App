import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, ScrollView, 
  Alert, ActivityIndicator, StyleSheet, SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { API_URL, BASE_URL } from '../../../constants/Config';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();

  const [name, setName] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState(''); 
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]); 
  const [stockLocations, setStockLocations] = useState<any[]>([]); 
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) { initData(); }
  }, [id]);

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
      const response = await fetch(`${API_URL}/categories`); 
      const json = await response.json();
      setCategoriesList(json.data || []);
    } catch (error) { console.log("Failed to fetch categories", error); }
  };

  const fetchProductData = async () => {
    try {
      const url = `${API_URL}/products/${id}?populate=image&populate=category&populate[stock_locations][populate]=location`;
      const response = await fetch(url);
      const json = await response.json();
      const data = json.data;
      if (!data) return;

      setName(data.name || '');
      setStock(data.stock?.toString() || '0');
      setUnit(data.unit || ''); 
      if (data.category) {
        setSelectedCategoryId(data.category.documentId || data.category.id);
      }
      setStockLocations(data.stock_locations || []);
      if (data.image?.url) {
        const fullImageUrl = data.image.url.startsWith('http') 
          ? data.image.url 
          : `${BASE_URL}${data.image.url}`;
        setImageUri(fullImageUrl);
      }
    } catch (error) { console.error("Fetch Data Error:", error); }
  };

  const handleUpdateLocationStock = async (stockLocId: string, newQty: string) => {
    const val = parseInt(newQty);
    if (isNaN(val)) return;
    try {
      const res = await fetch(`${API_URL}/stock-locations/${stockLocId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { on_hand_stock: val } })
      });
      if (res.ok) fetchProductData();
    } catch (error) { Alert.alert("Error", "อัปเดตไม่สำเร็จ"); }
  };

  const handleImageAction = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.6,
    });
    if (!result.canceled) {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri, [{ resize: { width: 600 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );
      setImageUri(manipResult.uri);
    }
  };

  const handleSave = async () => {
    if (!name || !stock) return Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบ");
    try {
      setSubmitting(true);
      let uploadedImageId = null;
      if (imageUri && !imageUri.startsWith('http')) {
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'upload.jpg';
        formData.append('files', { uri: imageUri, name: filename, type: 'image/jpeg' } as any);
        const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
        const uploadJson = await uploadRes.json();
        uploadedImageId = uploadJson[0].id;
      }
      const payload = {
        data: { name, stock: parseInt(stock), unit, category: selectedCategoryId, image: uploadedImageId || undefined }
      };
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        Alert.alert("สำเร็จ", "แก้ไขข้อมูลเรียบร้อย", [{ text: "ตกลง", onPress: () => router.back() }]);
      }
    } catch (error) { Alert.alert("ผิดพลาด", "บันทึกไม่สำเร็จ"); } finally { setSubmitting(false); }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color="#00796B" /><Text style={{marginTop: 10}}>กำลังโหลด...</Text></View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
      <Stack.Screen options={{ 
        title: 'แก้ไขสินค้า & จุดจัดเก็บ',
        headerRight: () => (
          <TouchableOpacity onPress={() => Alert.alert("ยืนยัน", "ลบสินค้านี้?", [
            {text: "ยกเลิก"}, {text: "ลบ", style: 'destructive', onPress: async () => {
              await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
              router.back();
            }}
          ])}><MaterialIcons name="delete" size={24} color="#ef4444" /></TouchableOpacity>
        )
      }} />

      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 120}}>
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={handleImageAction} style={styles.imageWrapper}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <Ionicons name="camera" size={40} color="#ccc" />}
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>ชื่อสินค้า *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        <View style={{flexDirection: 'row', gap: 15}}>
          <View style={{flex: 1}}><Text style={styles.label}>สต็อกรวม</Text><TextInput style={styles.input} value={stock} keyboardType="numeric" onChangeText={setStock} /></View>
          <View style={{flex: 1}}><Text style={styles.label}>หน่วยนับ</Text><TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="เส้น, มัด" /></View>
        </View>
        <Text style={styles.label}>หมวดหมู่</Text>
        <View style={styles.categoryGrid}>
          {categoriesList.map((cat) => (
            <TouchableOpacity key={cat.documentId || cat.id} style={[styles.chip, selectedCategoryId === (cat.documentId || cat.id) && styles.chipActive]} onPress={() => setSelectedCategoryId(cat.documentId || cat.id)}>
              <Text style={[styles.chipText, selectedCategoryId === (cat.documentId || cat.id) && {color: 'white'}]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>📍 สต็อกแยกตามจุดจัดเก็บ</Text>
        {stockLocations.map((item) => (
          <View key={item.id} style={styles.locCard}>
            <View style={{flex: 1}}><Text style={styles.locName}>{item.location?.name || 'จุดจัดเก็บ'}</Text><Text style={styles.locSub}>จำนวนปัจจุบัน:</Text></View>
            <TextInput style={styles.locInput} keyboardType="numeric" defaultValue={item.on_hand_stock?.toString()} onEndEditing={(e) => handleUpdateLocationStock(item.documentId || item.id, e.nativeEvent.text)} />
          </View>
        ))}
        
        {/* ⭐ ปรับปรุงส่วน onPress ให้ส่ง ID ของสินค้าไปด้วย */}
        <TouchableOpacity 
          style={styles.addLocBtn} 
          onPress={() => router.push({
            pathname: '/product/manage_stock_location',
            params: { productId: id } 
          })}
        >
          <Ionicons name="add-circle" size={20} color="#00796B" /><Text style={styles.addLocText}> ลงทะเบียนเข้าจุดเก็บเพิ่ม</Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitting}>
          {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>บันทึกข้อมูลหลัก</Text>}
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
  input: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', fontSize: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#00796B', borderColor: '#00796B' },
  chipText: { fontSize: 12, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  locCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  locName: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  locSub: { fontSize: 11, color: '#94a3b8' },
  locInput: { backgroundColor: '#f1f5f9', width: 70, padding: 8, borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: '#00796B' },
  addLocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, padding: 10 },
  addLocText: { color: '#00796B', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  saveBtn: { backgroundColor: '#00796B', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});