import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
// Import BASE_URL มาใช้
import { API_URL, BASE_URL } from '../../constants/Config';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, login } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  useEffect(() => {
    // เช็คว่ามีรูปไหม และ log ออกมาดู
    console.log("User in Context:", JSON.stringify(user, null, 2));
    
    if (user?.avatar?.url) {
      // ต่อ URL ให้สมบูรณ์: BASE_URL + relative path
      const fullUrl = `${BASE_URL}${user.avatar.url}`;
      console.log("Setting Image URL:", fullUrl);
      setCurrentImage(fullUrl);
    }
  }, [user]);

  const optimizeImage = async (uri: string) => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 800 } }], 
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri; 
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'ขออนุญาตใช้กล้องถ่ายรูป');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [1, 1],      
      quality: 0.8,        
    });

    if (!result.canceled && result.assets[0].uri) {
      // โชว์รูป Local ทันที
      setCurrentImage(result.assets[0].uri);
      processAndUpload(result.assets[0].uri);
    }
  };

  const processAndUpload = async (rawUri: string) => {
    if (!token || !user) return;
    setUploading(true);

    try {
      console.log("1. Optimizing...");
      const optimizedUri = await optimizeImage(rawUri);

      console.log("2. Uploading...");
      const formData = new FormData();
      const fileName = optimizedUri.split('/').pop();
      formData.append('files', {
        uri: optimizedUri, 
        name: fileName || 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      // Upload ยิงไปที่ API_URL (/api/upload)
      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const imageId = uploadData[0].id;
      console.log(">> Uploaded ID:", imageId);

      console.log("3. Linking...");
      const updateUserRes = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: imageId }),
      });

      if (!updateUserRes.ok) throw new Error('Update user failed');

      console.log("4. Fetching fresh user...");
      const refreshRes = await fetch(`${API_URL}/users/${user.id}?populate=avatar`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!refreshRes.ok) throw new Error('Fetch fresh user failed');
      
      const freshUser = await refreshRes.json();
      console.log(">> Fresh User Data:", JSON.stringify(freshUser, null, 2));

      await login(token, freshUser);
      
      // อัปเดต state เป็นรูปใหม่จาก Server
      if (freshUser.avatar?.url) {
         setCurrentImage(`${BASE_URL}${freshUser.avatar.url}?t=${new Date().getTime()}`);
      }

      Alert.alert('สำเร็จ', 'บันทึกรูปโปรไฟล์เรียบร้อยแล้ว ✅');

    } catch (error) {
      console.error(error);
      Alert.alert('ผิดพลาด', 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>โปรไฟล์ของฉัน</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          {currentImage ? (
            <Image 
                source={{ uri: currentImage }} 
                style={styles.avatar} 
                onError={(e) => console.log("Image Load Error:", e.nativeEvent.error)} // ดัก Error รูป
            />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={60} color="#cbd5e1" />
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.cameraIcon} 
            onPress={takePhoto} 
            disabled={uploading}
          >
            {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Ionicons name="camera-reverse" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.username}>{user?.username}</Text>
        <Text style={styles.email}>{user?.email}</Text>


        <View style={styles.divider} />

        <View style={styles.infoRow}>
            <Text style={styles.label}>วันที่สมัครสมาชิก</Text>
            <Text style={styles.value}>
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-'}
            </Text>
        </View>
        <View style={styles.infoRow}>
            <Text style={styles.label}>รหัสพนักงาน (ID)</Text>
            <Text style={styles.value}>#{user?.id}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 20, paddingTop: 60,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  backBtn: { marginRight: 15, padding: 5 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  content: { alignItems: 'center', padding: 30 },
  avatarContainer: { position: 'relative', marginBottom: 20 },
  avatar: { 
    width: 140, height: 140, borderRadius: 70, 
    borderWidth: 4, borderColor: 'white', backgroundColor: '#f1f5f9',
    shadowColor: "#000", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5
  },
  placeholderAvatar: { justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { 
    position: 'absolute', bottom: 5, right: 5, 
    backgroundColor: '#0ea5e9', width: 40, height: 40, 
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'white', elevation: 2
  },
  username: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginTop: 10 },
  email: { fontSize: 14, color: '#64748b', marginBottom: 15 },
  divider: { width: '100%', height: 1, backgroundColor: '#e2e8f0', marginVertical: 30 },
  infoRow: { 
    flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  label: { color: '#64748b', fontSize: 14 },
  value: { fontWeight: '600', color: '#333', fontSize: 14 }
});