// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Image, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { uploadAsync } from 'expo-file-system/legacy';
import { API_URL } from '../../constants/Config'; 

interface Category { documentId: string; name: string; }

export default function AddProductScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [stock, setStock] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      const json = await res.json();
      setCategories(json.data);
    } catch (error) {}
  };

  // 🖼️ ปรับสูตรย่อรูปใหม่ (เพื่อ A9/A55 โดยเฉพาะ)
  const processImage = async (uri) => {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            // 1. ลดขนาดลงอีก เหลือ 600px (พอสำหรับดูในมือถือเหลือเฟือ)
            [{ resize: { width: 600 } }], 
            // 2. ลดคุณภาพลงเหลือ 0.5 (ไฟล์จะเล็กมาก 50KB - 100KB)
            { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        return manipResult.uri;
    } catch (error) {
        console.log("Resize Error", error);
        return uri;
    }
  };

  const pickImage = async () => {
    Alert.alert("อัปโหลดรูป", "เลือกแหล่งที่มา", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "📸 ถ่ายรูปใหม่", onPress: openCamera },
        { text: "🖼️ เลือกจากเครื่อง", onPress: openGallery }
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 0.5, 
    });

    if (!result.canceled) {
      // ย่อรูปทันที
      const resizedUri = await processImage(result.assets[0].uri);
      setImageUri(resizedUri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 0.5,
    });

    if (!result.canceled) {
      // ย่อรูปทันที
      const resizedUri = await processImage(result.assets[0].uri);
      setImageUri(resizedUri);
    }
  };

  const uploadImageToStrapi = async (uri) => {
    const uploadUrl = `${API_URL.replace('/api', '')}/api/upload`;
    let finalUri = uri;

    if (Platform.OS === 'android') {
        try {
            const newPath = FileSystem.cacheDirectory + 'upload.jpg';
            await FileSystem.copyAsync({ from: uri, to: newPath });
            finalUri = newPath; 
        } catch (e) { console.log("Copy error", e); }
    }

    const response = await uploadAsync(uploadUrl, finalUri, {
        httpMethod: 'POST', uploadType: 1, fieldName: 'files', mimeType: 'image/jpeg',
    });

    if (response.status < 200 || response.status >= 300) {
        // ให้ส่ง Error กลับไปเลย เพื่อให้ catch ทำงาน
        throw new Error(`Upload Failed Status: ${response.status}`);
    }
    
    const json = JSON.parse(response.body);
    return json[0].id;
  }

  const handleSave = async () => {
    if (!name || !stock || !selectedCategory) return Alert.alert("แจ้งเตือน", "กรอกข้อมูลให้ครบ");
    
    setIsLoading(true);
    try {
      let imageId = null;
      if (imageUri) {
         // ดัก error ตรงนี้ ถ้าอัปรูปไม่ผ่าน ให้หยุดเลย ไม่ต้องไปบันทึก data
         try {
            imageId = await uploadImageToStrapi(imageUri);
         } catch (uploadErr) {
            throw new Error("อัปรูปไม่ผ่าน: " + uploadErr.message);
         }
      }

      const payload = {
        data: { name: name, stock: parseInt(stock), category: selectedCategory, image: imageId }
      };

      const res = await fetch(`${API_URL}/products`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("สำเร็จ ✅", "เพิ่มสินค้าเรียบร้อยแล้ว!");
        router.back();
      } else { 
        throw new Error("บันทึกข้อมูลไม่สำเร็จ"); 
      }

    } catch (error) {
      console.log(error);
      Alert.alert("ผิดพลาด ❌", error.message);
    } finally { 
      setIsLoading(false); // สำคัญมาก: ต้องปิด Loading เสมอ
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>📦 เพิ่มสินค้าใหม่</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : 
            <View style={styles.imagePlaceholder}><Ionicons name="camera" size={40} color="#ccc" /><Text style={{color:'#999'}}>แตะเพื่อเพิ่มรูป</Text></View>}
        </TouchableOpacity>

        <Text style={styles.label}>ชื่อสินค้า</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ระบุชื่อสินค้า..." />

        <Text style={styles.label}>จำนวน (Stock)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={stock} onChangeText={setStock} placeholder="0" />

        <Text style={styles.label}>หมวดหมู่</Text>
        <View style={styles.categoryContainer}>
            {categories.map((cat) => (
                <TouchableOpacity key={cat.documentId} style={[styles.catBadge, selectedCategory === cat.documentId && styles.catBadgeActive]} onPress={() => setSelectedCategory(cat.documentId)}>
                    <Text style={[styles.catText, selectedCategory === cat.documentId && styles.catTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
            ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.saveBtn, isLoading && { backgroundColor: '#ccc' }]} onPress={handleSave} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>💾 บันทึกสินค้า</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', padding: 20, paddingTop: 50, backgroundColor: 'white', alignItems: 'center', justifyContent:'space-between' },
  title: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  imagePicker: { alignItems: 'center', marginBottom: 20 },
  imagePlaceholder: { width: 150, height: 150, backgroundColor: '#e5e7eb', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderStyle:'dashed', borderWidth:2, borderColor:'#ccc' },
  previewImage: { width: 150, height: 150, borderRadius: 15, backgroundColor: '#ddd' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#374151', marginTop: 10 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 16, marginBottom: 10 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catBadge: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, backgroundColor: 'white', borderWidth:1, borderColor:'#e5e7eb' },
  catBadgeActive: { backgroundColor: '#10b981', borderColor:'#10b981' },
  catText: { color: '#374151' },
  catTextActive: { color: 'white', fontWeight: 'bold' },
  bottomBar: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  saveBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, alignItems: 'center', height: 55, justifyContent: 'center' },
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});