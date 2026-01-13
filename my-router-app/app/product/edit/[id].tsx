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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]); 
  const [stockLocations, setStockLocations] = useState<any[]>([]); 
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ✅ คำนวณสต็อกรวมอัตโนมัติ (Derived State)
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

  const handleLocalStockChange = (locId: string | number, text: string) => {
    setStockLocations(prev => prev.map(item => {
        if ((item.documentId || item.id) === locId) return { ...item, on_hand_stock: text };
        return item;
    }));
  };

  const handleUpdateLocationStock = async (stockLocId: string, newQty: string) => {
    const val = parseInt(newQty);
    if (isNaN(val)) return; 
    try {
      const res = await fetch(`${API_URL}/stock-locations/${stockLocId}`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ data: { on_hand_stock: val } })
      });
      if (!res.ok) throw new Error("Update Failed");
    } catch (error) { 
        Alert.alert("Error", "อัปเดตไม่สำเร็จ");
        fetchProductData(); 
    }
  };

  // ==========================================
  // 📸 ส่วนจัดการรูปภาพ (Camera & Gallery)
  // ==========================================

  // พระเอกของเรา: ฟังก์ชันย่อรูปแก้ A9 ค้าง
  const processImage = async (uri: string) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // บีบความกว้างไม่เกิน 800px (ตามสูตร)
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } // คุณภาพ 60%
      );
      setImageUri(result.uri);
    } catch (error) {
      console.log("Resize Error:", error);
      Alert.alert("ผิดพลาด", "ย่อไฟล์รูปไม่สำเร็จ");
    }
  };

  const launchCamera = async () => {
    // 1. ขอสิทธิ์กล้อง
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้แอพเข้าถึงกล้องถ่ายรูป');
      return;
    }

    // 2. เปิดกล้อง
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7, // รับมา 70% ก่อนส่งไปย่อต่อ
    });

    if (!result.canceled) {
      await processImage(result.assets[0].uri);
    }
  };

  const launchLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      await processImage(result.assets[0].uri);
    }
  };

  const handleImageAction = () => {
    Alert.alert("รูปภาพสินค้า", "เลือกแหล่งที่มา", [
      { text: "📸 ถ่ายภาพใหม่", onPress: launchCamera },
      { text: "🖼️ เลือกจากอัลบั้ม", onPress: launchLibrary },
      { text: "ยกเลิก", style: "cancel" }
    ]);
  };

  // ==========================================

  const handleSave = async () => {
    if (!name) return Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อสินค้า");
    try {
      setSubmitting(true);
      let uploadedImageId = null;
      
      // Upload Image
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

      // Update Product
      const payload = { 
        data: { 
            name, 
            unit, 
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
      <Stack.Screen options={{ 
        title: 'แก้ไขสินค้า & จุดจัดเก็บ',
        headerRight: () => (
          <TouchableOpacity onPress={() => Alert.alert("ยืนยัน", "ลบสินค้านี้?", [
            {text: "ยกเลิก"}, {text: "ลบ", style: 'destructive', onPress: async () => {
              await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getHeaders() });
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
          <Text style={{fontSize: 12, color: '#999', marginTop: 5}}>แตะเพื่อเปลี่ยนรูป</Text>
        </View>

        <Text style={styles.label}>ชื่อสินค้า *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
        
        <View style={{flexDirection: 'row', gap: 15}}>
          <View style={{flex: 1}}>
            <Text style={styles.label}>สต็อกรวม (นับจริง)</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: '#f1f5f9', color: '#00796B', fontWeight: 'bold' }]} 
              value={calculatedStock.toString()} 
              editable={false} 
            />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.label}>หน่วยนับ</Text>
            <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
          </View>
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
        <Text style={styles.sectionTitle}>📍 สต็อกแยกตามจุดจัดเก็บ</Text>
        
        {stockLocations.length === 0 && (
             <Text style={{color: '#999', fontStyle: 'italic', marginBottom: 10}}>ยังไม่มีข้อมูลจุดจัดเก็บ</Text>
        )}

        {stockLocations.map((item) => {
            const currentId = item.documentId || item.id;
            return (
              <View key={currentId} style={styles.locCard}>
                <View style={{flex: 1}}>
                  <Text style={styles.locName}>{item.location?.name || 'จุดจัดเก็บ (รอระบุ)'}</Text>
                  <Text style={styles.locSub}>จำนวนปัจจุบัน:</Text>
                </View>
                <TextInput 
                  style={styles.locInput} 
                  keyboardType="numeric"
                  value={item.on_hand_stock?.toString() || '0'} 
                  onChangeText={(text) => handleLocalStockChange(currentId, text)}
                  onEndEditing={(e) => handleUpdateLocationStock(currentId, e.nativeEvent.text)}
                />
              </View>
            );
        })}
        
        <TouchableOpacity 
          style={styles.addLocBtn} 
          onPress={() => router.push({
            //pathname: '/product/manage_stock_location',
            pathname: '/product/stock_location/register', // ชี้ไปไฟล์ใหม่
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
  locInput: { backgroundColor: '#f1f5f9', width: 80, padding: 8, borderRadius: 8, textAlign: 'center', fontWeight: 'bold', fontSize: 16, color: '#00796B' },
  addLocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, padding: 10 },
  addLocText: { color: '#00796B', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  saveBtn: { backgroundColor: '#00796B', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});