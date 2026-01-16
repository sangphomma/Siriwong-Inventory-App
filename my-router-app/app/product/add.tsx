// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  Alert, Image, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { API_URL } from '../../constants/Config'; 
import { useAuth } from '../../contexts/AuthContext'; // อย่าลืม import Auth เพื่อเอา Token

export default function AddProductScreen() {
  const router = useRouter();
  const { token } = useAuth(); // ใช้ Token ในการ Upload

  const [name, setName] = useState("");
  const [minStock, setMinStock] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [imageUri, setImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      const json = await res.json();
      setCategories(json.data || []);
    } catch (error) {
        console.log("Fetch Cat Error", error);
    }
  };

  // --- 1. ส่วนจัดการรูปภาพ (ยกมาจากหน้า Edit) ---
  const processImage = async (uri) => {
    try {
      // ย่อรูปก่อนอัปโหลด เพื่อไม่ให้ Server หนักเกินไป
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
    const result = await ImagePicker.launchCameraAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [1, 1], 
        quality: 0.7 
    });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const launchLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [1, 1], 
        quality: 0.7 
    });
    if (!result.canceled) await processImage(result.assets[0].uri);
  };

  const handleImageAction = () => {
    Alert.alert("รูปภาพสินค้า", "เลือกแหล่งที่มา", [
      { text: "📸 ถ่ายภาพใหม่", onPress: launchCamera },
      { text: "🖼️ เลือกจากอัลบั้ม", onPress: launchLibrary },
      { text: "ยกเลิก", style: "cancel" }
    ]);
  };

  // --- 2. ส่วนบันทึกข้อมูล ---
  const handleSave = async () => {
    if (!name || !selectedCategory) return Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อและเลือกหมวดหมู่");
    
    setIsLoading(true);
    try {
      let uploadedImageId = null;

      // 2.1 อัปโหลดรูปภาพ (ถ้ามีการเลือกรูป)
      if (imageUri) {
         const formData = new FormData();
         const filename = imageUri.split('/').pop() || 'new_product.jpg';
         
         // @ts-ignore
         formData.append('files', {
             uri: imageUri,
             name: filename,
             type: 'image/jpeg'
         });

         const uploadRes = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                // ไม่ต้องใส่ Content-Type: multipart/form-data นะครับ fetch จะจัดการให้เอง
            },
            body: formData
         });

         if (!uploadRes.ok) throw new Error("อัปโหลดรูปไม่สำเร็จ");
         const uploadJson = await uploadRes.json();
         uploadedImageId = uploadJson[0].id; // ได้ ID รูปมาแล้ว
      }

      // 2.2 สร้างสินค้า
      const payload = {
        data: { 
            name: name, 
            min_stock: parseInt(minStock) || 0,
            category: selectedCategory, 
            image: uploadedImageId // เอา ID รูปมาผูก
        }
      };

      const res = await fetch(`${API_URL}/products`, {
        method: "POST", 
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("สำเร็จ ✅", "เพิ่มสินค้าเรียบร้อยแล้ว!", [
            { text: "ตกลง", onPress: () => router.back() }
        ]);
      } else { 
        throw new Error("บันทึกข้อมูลไม่สำเร็จ"); 
      }

    } catch (error) {
      console.log(error);
      Alert.alert("ผิดพลาด ❌", error.message);
    } finally { 
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>📦 เพิ่มสินค้าใหม่</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        {/* เปลี่ยน onPress เป็น handleImageAction */}
        <TouchableOpacity style={styles.imagePicker} onPress={handleImageAction}>
            {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
                <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={40} color="#ccc" />
                    <Text style={{color:'#999', marginTop: 5}}>แตะเพื่อเพิ่มรูป</Text>
                </View>
            )}
        </TouchableOpacity>

        <Text style={styles.label}>ชื่อสินค้า *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ระบุชื่อสินค้า..." />

        <View style={{flexDirection:'row', gap:10}}>
            <View style={{flex:1}}>
                <Text style={styles.label}>Min Stock (แจ้งเตือน)</Text>
                <TextInput 
                    style={[styles.input, {borderColor: '#fca5a5'}]}
                    keyboardType="numeric" 
                    value={minStock} 
                    onChangeText={setMinStock} 
                    placeholder="เช่น 10" 
                />
            </View>
        </View>

        <Text style={styles.label}>หมวดหมู่ *</Text>
        <View style={styles.categoryContainer}>
            {categories.map((cat) => {
                const docId = cat.documentId || cat.id;
                return (
                    <TouchableOpacity key={docId} style={[styles.catBadge, selectedCategory === docId && styles.catBadgeActive]} onPress={() => setSelectedCategory(docId)}>
                        <Text style={[styles.catText, selectedCategory === docId && styles.catTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                )
            })}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.saveBtn, isLoading && { backgroundColor: '#ccc' }]} onPress={handleSave} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>💾 บันทึกสินค้า</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', padding: 20, paddingTop: 20, backgroundColor: 'white', alignItems: 'center', justifyContent:'space-between' }, // ปรับ paddingTop นิดหน่อยให้สวยใน Expo
  title: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  imagePicker: { alignItems: 'center', marginBottom: 20 },
  imagePlaceholder: { width: 150, height: 150, backgroundColor: '#fff', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderStyle:'dashed', borderWidth:2, borderColor:'#ccc' },
  previewImage: { width: 150, height: 150, borderRadius: 15, backgroundColor: '#ddd' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#374151', marginTop: 10 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 16, marginBottom: 10 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catBadge: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, backgroundColor: 'white', borderWidth:1, borderColor:'#e5e7eb' },
  catBadgeActive: { backgroundColor: '#00796B', borderColor:'#00796B' },
  catText: { color: '#374151' },
  catTextActive: { color: 'white', fontWeight: 'bold' },
  bottomBar: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  saveBtn: { backgroundColor: '#00796B', padding: 15, borderRadius: 10, alignItems: 'center', height: 55, justifyContent: 'center' },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});