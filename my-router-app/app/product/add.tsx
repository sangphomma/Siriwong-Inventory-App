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
  
  // ✅ เปลี่ยนจาก stock ธรรมดา เป็น initial stock (ถ้ามี)
  const [stock, setStock] = useState(""); 
  // ✅ เพิ่ม State สำหรับ Min Stock
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
      setCategories(json.data);
    } catch (error) {}
  };

  // ... (Code ส่วน Image Processing คงเดิม) ...
  const processImage = async (uri) => { /* ...เหมือนเดิม... */ return uri; };
  const pickImage = async () => { /* ...เหมือนเดิม... */ };
  const openCamera = async () => { /* ...เหมือนเดิม... */ };
  const openGallery = async () => { /* ...เหมือนเดิม... */ };
  const uploadImageToStrapi = async (uri) => { /* ...เหมือนเดิม... */ };

  const handleSave = async () => {
    if (!name || !selectedCategory) return Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อและเลือกหมวดหมู่");
    
    setIsLoading(true);
    try {
      let imageId = null;
      if (imageUri) {
         try {
            imageId = await uploadImageToStrapi(imageUri);
         } catch (uploadErr) {
            throw new Error("อัปรูปไม่ผ่าน: " + uploadErr.message);
         }
      }

      const payload = {
        data: { 
            name: name, 
            // stock: parseInt(stock) || 0, // อันนี้อาจจะไม่ใช้แล้วในระบบ Multi-loc แต่ใส่ไว้ก่อนได้
            min_stock: parseInt(minStock) || 0, // ✅ ส่งค่า min_stock ไปด้วย
            category: selectedCategory, 
            image: imageId 
        }
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
      setIsLoading(false);
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

        <Text style={styles.label}>ชื่อสินค้า *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ระบุชื่อสินค้า..." />

        {/* ✅ จัด Layout ให้ Stock กับ Min Stock อยู่คู่กัน */}
        <View style={{flexDirection:'row', gap:10}}>
            <View style={{flex:1}}>
                <Text style={styles.label}>Min Stock (แจ้งเตือน)</Text>
                <TextInput 
                    style={[styles.input, {borderColor: '#fca5a5'}]} // ใส่สีแดงอ่อนๆ ให้รู้ว่าเป็นจุดเตือน
                    keyboardType="numeric" 
                    value={minStock} 
                    onChangeText={setMinStock} 
                    placeholder="เช่น 10" 
                />
            </View>
             {/* Note: ช่อง Stock เริ่มต้นอาจจะไม่จำเป็นต้องใส่ตรงนี้แล้ว เพราะเราไปลงทะเบียนเข้า Location ทีหลัง 
               แต่ถ้าอยากใส่ไว้เป็น Field 'stock' (legacy) ก็ใส่ได้ครับ 
             */}
        </View>

        <Text style={styles.label}>หมวดหมู่ *</Text>
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