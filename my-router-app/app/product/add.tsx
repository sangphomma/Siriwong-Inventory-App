// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  Alert, Image, ActivityIndicator, SafeAreaView, Keyboard 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { API_URL } from '../../constants/Config'; 
import { useAuth } from '../../contexts/AuthContext'; 

export default function AddProductScreen() {
  const router = useRouter();
  const { token } = useAuth(); 

  const [name, setName] = useState("");
  const [minStock, setMinStock] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  // --- ส่วนของระบบแนะนำชื่อสินค้า (Smart Suggestion) ---
  const [allProducts, setAllProducts] = useState([]); // เก็บ {name, documentId}
  const [suggestions, setSuggestions] = useState([]); 
  const [showSuggestions, setShowSuggestions] = useState(false); 
  const [isDuplicate, setIsDuplicate] = useState(false); 
  const [duplicateId, setDuplicateId] = useState(null); // เก็บ ID ตัวที่ซ้ำไว้ลิงก์ไปหน้า Edit

  const [imageUri, setImageUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { 
      fetchCategories(); 
      fetchExistingProducts(); 
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      const json = await res.json();
      setCategories(json.data || []);
    } catch (error) {
        console.log("Fetch Cat Error", error);
    }
  };

  // ดึงชื่อและ ID สินค้าทั้งหมดมาเก็บไว้ (เบามาก เพราะดึงแค่ 2 fields)
  const fetchExistingProducts = async () => {
      try {
          const res = await fetch(`${API_URL}/products?fields[0]=name&fields[1]=documentId&pagination[pageSize]=1000`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const json = await res.json();
          setAllProducts(json.data || []); 
      } catch (error) {
          console.log("Fetch Products Error", error);
      }
  };

  // ฟังก์ชันเมื่อ User พิมพ์ชื่อ
  const handleNameChange = (text) => {
      setName(text);
      
      if (text.length > 0) {
          // กรองหาชื่อที่คล้าย
          const filtered = allProducts.filter(item => 
              item.name.toLowerCase().includes(text.toLowerCase())
          );
          
          // เช็คว่าชื่อซ้ำเป๊ะหรือไม่
          const match = allProducts.find(item => 
              item.name.toLowerCase() === text.toLowerCase()
          );

          setSuggestions(filtered.slice(0, 5)); // แสดงสูงสุด 5 รายการ
          setShowSuggestions(true);
          
          if (match) {
              setIsDuplicate(true);
              setDuplicateId(match.documentId); // จำ ID ไว้ลิงก์
          } else {
              setIsDuplicate(false);
              setDuplicateId(null);
          }
      } else {
          setShowSuggestions(false);
          setIsDuplicate(false);
      }
  };

  // เมื่อเลือกจากรายการแนะนำ
  const handleSelectSuggestion = (item) => {
      setName(item.name);
      setShowSuggestions(false);
      setIsDuplicate(true);
      setDuplicateId(item.documentId);
      
      // ซ่อนคีย์บอร์ดก่อนเพื่อให้ Alert ดูง่าย
      Keyboard.dismiss();

      Alert.alert(
        "สินค้านี้มีอยู่แล้ว", 
        `คุณต้องการแก้ไข "${item.name}" แทนการสร้างใหม่หรือไม่?`,
        [
          { text: "สร้างใหม่ (ชื่อซ้ำ)", style: 'cancel' }, 
          { 
            text: "ไปหน้าสินค้า", 
            onPress: () => {
                // ลิงก์ไปหน้า Edit ตามโครงสร้างที่คุณให้มา
                router.push(`/product/edit/${item.documentId}`); 
            }
          } 
        ]
      );
  };

  // --- ส่วนจัดการรูปภาพ ---
  const processImage = async (uri) => {
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

  // --- บันทึกข้อมูล ---
  const handleSave = async () => {
    if (!name || !selectedCategory) return Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อและเลือกหมวดหมู่");
    
    // ดักจับอีกรอบถ้ากด Save ทั้งที่ชื่อซ้ำ
    if (isDuplicate && duplicateId) {
        return Alert.alert(
            "ชื่อสินค้าซ้ำ!", 
            `มีสินค้าชื่อ "${name}" ในระบบแล้ว`,
            [
                { text: "ยืนยันสร้างซ้ำ", onPress: processSave, style: "destructive" },
                { 
                    text: "ไปหน้าสินค้าเดิม", 
                    onPress: () => router.push(`/product/edit/${duplicateId}`) 
                }
            ]
        );
    }

    processSave();
  };

  const processSave = async () => {
    setIsLoading(true);
    try {
      let uploadedImageId = null;

      if (imageUri) {
         const formData = new FormData();
         const filename = imageUri.split('/').pop() || 'new_product.jpg';
         // @ts-ignore
         formData.append('files', { uri: imageUri, name: filename, type: 'image/jpeg' });

         const uploadRes = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
         });

         if (!uploadRes.ok) throw new Error("อัปโหลดรูปไม่สำเร็จ");
         const uploadJson = await uploadRes.json();
         uploadedImageId = uploadJson[0].id;
      }

      const payload = {
        data: { 
            name: name, 
            min_stock: parseInt(minStock) || 0,
            category: selectedCategory, 
            image: uploadedImageId
        }
      };

      const res = await fetch(`${API_URL}/products`, {
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("สำเร็จ ✅", "เพิ่มสินค้าเรียบร้อยแล้ว!", [{ text: "ตกลง", onPress: () => router.back() }]);
      } else { throw new Error("บันทึกข้อมูลไม่สำเร็จ"); }

    } catch (error) {
      console.log(error);
      Alert.alert("ผิดพลาด ❌", error.message);
    } finally { setIsLoading(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>📦 เพิ่มสินค้าใหม่</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
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
        
        {/* Container สำหรับ Input และ Suggestion Box */}
        <View style={{zIndex: 20, position: 'relative'}}> 
            
            {/* Suggestion Box: ลอยขึ้นด้านบน (bottom: 100%) */}
            {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionBox}>
                    <Text style={styles.suggestionHeader}>สินค้าที่มีอยู่แล้ว (แตะเพื่อเลือก):</Text>
                    {suggestions.map((item, index) => (
                        <TouchableOpacity key={item.documentId || index} style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item)}>
                            <Ionicons name="cube-outline" size={16} color="#666" style={{marginRight: 8}} />
                            <Text style={styles.suggestionText}>{item.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <TextInput 
                style={[styles.input, isDuplicate && {borderColor: 'red', backgroundColor: '#FEF2F2'}]} 
                value={name} 
                onChangeText={handleNameChange} 
                placeholder="ระบุชื่อสินค้า..." 
            />
            
            {isDuplicate && (
                <Text style={{color:'red', fontSize:12, marginTop:-5, marginBottom:10}}>
                    ⚠️ มีสินค้านี้ในระบบแล้ว (โปรดตรวจสอบ)
                </Text>
            )}
        </View>

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
        
        <View style={{height: 50}} /> 
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
  header: { flexDirection: 'row', padding: 20, paddingTop: 20, backgroundColor: 'white', alignItems: 'center', justifyContent:'space-between' },
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
  saveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // --- Styles สำหรับกล่องแนะนำ (ลอยขึ้นบน) ---
  suggestionBox: {
      position: 'absolute',
      bottom: '100%', // ดันขึ้นไปอยู่เหนือ Input
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      marginBottom: 8, // เว้นระยะห่างนิดหน่อย
      zIndex: 50, // ลอยทับ element อื่น
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
  },
  suggestionHeader: {
      fontSize: 12,
      color: '#999',
      padding: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6'
  },
  suggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6'
  },
  suggestionText: {
      color: '#374151',
      fontSize: 14
  }
});