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

// *** 1. Import ทั้ง API_URL และ BASE_URL มาใช้ ***
// (ต้องแน่ใจว่าไฟล์ชื่อ Config.ts ตัว C ใหญ่ตามจริงนะครับ)
import { API_URL, BASE_URL } from '../../../constants/Config'; 

const CATEGORIES = [
  "คอมพิวเตอร์", 
  "กล้อง", 
  "แท็บเล็ต", 
  "อุปกรณ์คอมพิวเตอร์", 
  "โทรศัพท์มือถือ"
];

export default function EditProductScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // --- State Management ---
  const [name, setName] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  
  // แก้ Type Error: ระบุว่าเป็น string หรือ null ก็ได้
  const [imageUri, setImageUri] = useState<string | null>(null); 
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isError, setIsError] = useState(false);

  // --- 2. Fetch Data ---
  useEffect(() => {
    fetchProductData();
  }, [id]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setIsError(false);

      // *** แก้จุดที่ 1: ลบ /api ออก (เพราะ API_URL มีให้อยู่แล้ว) ***
      const url = `${API_URL}/products/${id}?populate=*`;
      console.log("Fetching URL:", url); 

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Server status: ${response.status}`);
      }

      const json = await response.json();
      const data = json.data; 

      if (!data) throw new Error("No data found");

      const attr = data.attributes || data; 

      setName(attr.name || '');
      setStock(attr.stock ? attr.stock.toString() : '0');
      setCategory(attr.category || '');

      // จัดการรูปภาพ
      const imageData = attr.image?.data?.attributes || attr.image; 
      if (imageData?.url) {
        // *** แก้จุดที่ 2: ใช้ BASE_URL สำหรับรูปภาพ (เพราะรูปไม่ได้อยู่ใน /api) ***
        const fullImageUrl = imageData.url.startsWith('http') 
          ? imageData.url 
          : `${BASE_URL}${imageData.url}`;
        
        setImageUri(fullImageUrl);
      }

    } catch (error) {
      console.error("Fetch Error:", error);
      setIsError(true); 
      Alert.alert("โหลดข้อมูลไม่สำเร็จ", "กรุณาเช็คอินเทอร์เน็ต หรือ Server");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. Image Picker & Compressor ---
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('ต้องการสิทธิ์', 'ขออนุญาตเข้าถึงคลังรูปภาพ');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        // แก้ Warning สีเหลือง และ Type Error
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, 
      });

      if (!result.canceled) {
        // ย่อรูปเพื่อช่วย Samsung A9
        const resizedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }], 
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG } 
        );
        
        setImageUri(resizedImage.uri);
      }
    } catch (error) {
      console.log("Image Error:", error);
      Alert.alert("Error", "เกิดข้อผิดพลาดในการเลือกรูป");
    }
  };

  // --- 4. Save / Update ---
  const handleSave = async () => {
    if (isError) return;

    if (!name || !stock) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกชื่อสินค้าและจำนวน");
      return;
    }

    try {
      setSubmitting(true);

      // แก้ Type Error: ประกาศเป็น any
      const formData: any = new FormData();
      
      // Strapi v4 ปกติ
      formData.append('data', JSON.stringify({
        name: name,
        stock: parseInt(stock),
        category: category,
      }));
      
      if (imageUri && !imageUri.startsWith('http')) {
        // แก้ Type Error: ใส่ default name กันเหนียว
        const filename = imageUri.split('/').pop() || "image.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        
        formData.append('files.image', {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      // *** แก้จุดที่ 3: ลบ /api ออก ***
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text(); 
        console.error("Server Error:", errorData);
        throw new Error('Update failed');
      }

      Alert.alert("สำเร็จ", "แก้ไขข้อมูลเรียบร้อย", [
        { text: "OK", onPress: () => router.back() }
      ]);

    } catch (error) {
      console.error(error);
      Alert.alert("ผิดพลาด", "บันทึกข้อมูลไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("ยืนยัน", "ต้องการลบสินค้านี้ใช่หรือไม่?", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ลบ", style: "destructive", onPress: async () => {
            try {
                // *** แก้จุดที่ 4: ลบ /api ออก ***
                await fetch(`${API_URL}/products/${id}`, { method: 'DELETE' });
                router.back();
            } catch (e) {
                Alert.alert("ลบไม่สำเร็จ");
            }
        }}
    ]);
  };

  // --- UI Render ---
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
          <TouchableOpacity onPress={pickImage} style={styles.imageWrapper}>
             {imageUri ? (
               <Image source={{ uri: imageUri }} style={styles.image} />
             ) : (
               <View style={styles.placeholder}>
                 <Text style={{color: '#888'}}>แตะเพื่อเพิ่มรูป</Text>
               </View>
             )}
          </TouchableOpacity>
          <Text style={styles.changeImgText}>แตะเพื่อเปลี่ยนรูป</Text>
        </View>

        <Text style={styles.label}>ชื่อสินค้า</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="ระบุชื่อสินค้า"
        />

        <Text style={styles.label}>จำนวน (Stock)</Text>
        <TextInput
          style={styles.input}
          value={stock}
          onChangeText={setStock}
          keyboardType="numeric"
          placeholder="0"
        />

        <Text style={styles.label}>หมวดหมู่</Text>
        <View style={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                category === cat && styles.categoryChipSelected
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[
                styles.categoryText,
                category === cat && styles.categoryTextSelected
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isError || submitting} 
          style={[
            styles.saveButton,
            (isError || submitting) && styles.saveButtonDisabled
          ]}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageWrapper: {
    width: 150,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed'
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
  },
  changeImgText: {
    marginTop: 8,
    color: '#00796B',
    fontSize: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 100, 
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  categoryChipSelected: {
    backgroundColor: '#00796B', 
    borderColor: '#00796B',
  },
  categoryText: {
    color: '#666',
  },
  categoryTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  saveButton: {
    backgroundColor: '#00796B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#B0BEC5', 
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});