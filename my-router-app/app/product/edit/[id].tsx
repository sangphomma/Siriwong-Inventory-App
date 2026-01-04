import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { MaterialIcons } from '@expo/vector-icons';

import { API_URL, BASE_URL } from '../../../constants/Config';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();

  const [name, setName] = useState('');
  const [stock, setStock] = useState('');
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [categoriesList, setCategoriesList] = useState<any[]>([]); 
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);

  // --- Fetch Data ---
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        setIsError(false);
        await fetchCategories();
        await fetchProductData();
      } catch (error) {
        console.error("Init Error:", error);
        setIsError(true);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`); 
      const json = await response.json();
      const data = json.data;
      if (data) {
        const formatted = data.map((item: any) => ({
          id: item.documentId || item.id, 
          name: item.attributes?.name || item.name 
        }));
        setCategoriesList(formatted);
      }
    } catch (error) {
      console.log("Failed to fetch categories", error);
    }
  };

  const fetchProductData = async () => {
    const url = `${API_URL}/products/${id}?populate=*`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Server status: ${response.status}`);

    const json = await response.json();
    const data = json.data;
    if (!data) throw new Error("No data found");

    const attr = data.attributes || data;

    setName(attr.name || '');
    setStock(attr.stock ? attr.stock.toString() : '0');

    const catObj = attr.category?.data || attr.category; 
    if (catObj) {
      setSelectedCategoryId(catObj.documentId || catObj.id);
    }

    const imageData = attr.image?.data?.attributes || attr.image; 
    if (imageData?.url) {
      const fullImageUrl = imageData.url.startsWith('http') 
        ? imageData.url 
        : `${BASE_URL}${imageData.url}`;
      setImageUri(fullImageUrl);
    }
  };

  // --- Image Handling ---
  const handleImageAction = () => {
    Alert.alert("เลือกรูปภาพ", "เลือกแหล่งที่มาของรูปภาพ", [
      { text: "ถ่ายรูปใหม่", onPress: launchCamera },
      { text: "เลือกจากอัลบั้ม", onPress: launchLibrary },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'ขออนุญาตใช้กล้องถ่ายรูป');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) processImage(result.assets[0].uri);
  };

  const launchLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) processImage(result.assets[0].uri);
  };

  const processImage = async (uri: string) => {
    const resizedImage = await ImageManipulator.manipulateAsync(
      uri, [{ resize: { width: 800 } }], 
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } 
    );
    setImageUri(resizedImage.uri);
  };

  // --- Save / Update (แบบ 2 Steps: Upload -> Update) ---
  const handleSave = async () => {
    if (isError) return;
    if (!name || !stock) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อสินค้าและจำนวน");
      return;
    }

    try {
      setSubmitting(true);
      
      const isNewImage = imageUri && !imageUri.startsWith('http');
      let uploadedImageId = null;

      // 1. ถ้ามีรูปใหม่ -> อัปโหลดก่อนเลย!
      if (isNewImage) {
        console.log("Step 1: Uploading Image...");
        const uploadFormData: any = new FormData();
        
        const filename = imageUri.split('/').pop() || "image.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // Field สำหรับ upload ปกติคือ 'files'
        uploadFormData.append('files', { 
          uri: imageUri, 
          name: filename, 
          type 
        } as any);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadRes.ok) throw new Error("Image Upload Failed");
        
        const uploadJson = await uploadRes.json();
        // ได้ ID รูปมาแล้ว! (อาจจะเป็น id หรือ documentId แล้วแต่เวอร์ชั่น แต่ id มักใช้ได้เสมอในช่อง upload)
        uploadedImageId = uploadJson[0].id; 
        console.log("Image Uploaded! ID:", uploadedImageId);
      }

      // 2. เตรียมข้อมูลสินค้า (Payload)
      const payload: any = {
        name: name,
        stock: Number(stock) || 0,
      };
      
      if (selectedCategoryId) {
        payload.category = selectedCategoryId;
      }
      
      // ถ้าเพิ่งอัปรูปเสร็จ ให้เอา ID รูปไปผูกด้วย
      if (uploadedImageId) {
        payload.image = uploadedImageId;
      }

      // 3. ส่งข้อมูลสินค้าเป็น JSON (วิธีที่เสถียรที่สุด)
      console.log("Step 2: Updating Product Data (JSON)...");
      const updateRes = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: payload }),
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        console.error("Update Failed:", errorData);
        throw new Error(errorData.error?.message || "Update Failed");
      }

      Alert.alert("สำเร็จ", "แก้ไขข้อมูลเรียบร้อย", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error: any) {
      console.error("Save Error:", error);
      Alert.alert("บันทึกไม่สำเร็จ", error.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  // ... (ส่วน UI เหมือนเดิม) ...
  const handleDelete = () => {
    Alert.alert("ยืนยัน", "ต้องการลบสินค้านี้ใช่หรือไม่?", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบ", style: "destructive", onPress: async () => {
            try {
                await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
                router.back();
            } catch (e) {
                Alert.alert("ลบไม่สำเร็จ");
            }
        }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00796B" />
        <Text style={{ marginTop: 10 }}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ 
          title: 'แก้ไขสินค้า',
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete}>
              <MaterialIcons name="delete" size={24} color="#D32F2F" />
            </TouchableOpacity>
          )
      }} />

      <ScrollView style={styles.container}>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={handleImageAction} style={styles.imageWrapper}>
             {imageUri ? (
               <Image source={{ uri: imageUri }} style={styles.image} />
             ) : (
               <View style={styles.placeholder}>
                 <Text style={{color: '#888'}}>แตะเพื่อเพิ่มรูป</Text>
               </View>
             )}
          </TouchableOpacity>
          <Text style={styles.changeImgText}>แตะเพื่อเปลี่ยนรูป (กล้อง/อัลบั้ม)</Text>
        </View>

        <Text style={styles.label}>ชื่อสินค้า</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="ระบุชื่อสินค้า" />

        <Text style={styles.label}>จำนวน (Stock)</Text>
        <TextInput style={styles.input} value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="0" />

        <Text style={styles.label}>หมวดหมู่</Text>
        <View style={styles.categoryContainer}>
          {categoriesList.length > 0 ? (
            categoriesList.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategoryId === cat.id && styles.categoryChipSelected 
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}
              >
                <Text style={[
                  styles.categoryText,
                  selectedCategoryId === cat.id && styles.categoryTextSelected
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={{color: '#999'}}>กำลังโหลดหมวดหมู่...</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isError || submitting} 
          style={[styles.saveButton, (isError || submitting) && styles.saveButtonDisabled]}
        >
          {submitting ? (
             <ActivityIndicator color="#fff" />
          ) : (
             <Text style={styles.saveButtonText}>
               {isError ? "ไม่สามารถบันทึกได้" : "บันทึกการแก้ไข"}
             </Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { alignItems: 'center', marginBottom: 20 },
  imageWrapper: {
    width: 150, height: 150, borderRadius: 10, backgroundColor: '#f0f0f0',
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed'
  },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  changeImgText: { marginTop: 8, color: '#00796B', fontSize: 14 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12,
    fontSize: 16, marginBottom: 20, backgroundColor: '#f9f9f9',
  },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 100 },
  categoryChip: {
    paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
    borderColor: '#ddd', marginRight: 8, marginBottom: 8, backgroundColor: '#fff',
  },
  categoryChipSelected: { backgroundColor: '#00796B', borderColor: '#00796B' },
  categoryText: { color: '#666' },
  categoryTextSelected: { color: '#fff', fontWeight: 'bold' },
  footer: {
    padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  saveButton: { backgroundColor: '#00796B', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonDisabled: { backgroundColor: '#B0BEC5' },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});