import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, TextInput 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
// Import BASE_URL มาใช้
import { API_URL, BASE_URL } from '../../constants/Config';

// --- Component ย่อย: ส่วนเปลี่ยนรหัสผ่าน ---
const ChangePasswordSection = ({ token }: { token: string | null }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // State สำหรับควบคุมการเปิด/ปิดลูกตา
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    // 1. Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      // 2. เรียก API Strapi
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          password: newPassword,
          passwordConfirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // จัดการ Error message จาก Strapi
        throw new Error(data?.error?.message || 'เกิดข้อผิดพลาด');
      }

      // 3. สำเร็จ
      Alert.alert('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ✅', [
        {
          text: 'ตกลง',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error: any) {
      console.log('Change Password Error:', error);
      Alert.alert('ผิดพลาด', 'รหัสผ่านปัจจุบันไม่ถูกต้อง หรือระบบขัดข้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.passwordSection}>
      <Text style={styles.sectionHeader}>เปลี่ยนรหัสผ่าน</Text>
      
      {/* 1. รหัสผ่านปัจจุบัน */}
      <Text style={styles.inputLabel}>รหัสผ่านปัจจุบัน</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          secureTextEntry={!showCurrentPassword} // สลับโหมดซ่อน/โชว์
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="กรอกรหัสปัจจุบัน"
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowCurrentPassword(!showCurrentPassword)}
        >
          <Ionicons 
            name={showCurrentPassword ? "eye" : "eye-off"} 
            size={20} 
            color="#64748b" 
          />
        </TouchableOpacity>
      </View>

      {/* 2. รหัสผ่านใหม่ */}
      <Text style={styles.inputLabel}>รหัสผ่านใหม่</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          secureTextEntry={!showNewPassword}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="กรอกรหัสใหม่ (ขั้นต่ำ 6 ตัว)"
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowNewPassword(!showNewPassword)}
        >
          <Ionicons 
            name={showNewPassword ? "eye" : "eye-off"} 
            size={20} 
            color="#64748b" 
          />
        </TouchableOpacity>
      </View>

      {/* 3. ยืนยันรหัสผ่านใหม่ */}
      <Text style={styles.inputLabel}>ยืนยันรหัสผ่านใหม่</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="ยืนยันรหัสใหม่อีกครั้ง"
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons 
            name={showConfirmPassword ? "eye" : "eye-off"} 
            size={20} 
            color="#64748b" 
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, loading && { opacity: 0.7 }]}
        onPress={handleChangePassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>บันทึกรหัสผ่านใหม่</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

// --- Main Screen ---
export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, login } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  useEffect(() => {
    console.log("User in Context:", JSON.stringify(user, null, 2));
    
    if (user?.avatar?.url) {
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
      setCurrentImage(result.assets[0].uri);
      processAndUpload(result.assets[0].uri);
    }
  };

  const processAndUpload = async (rawUri: string) => {
    if (!token || !user) return;
    setUploading(true);

    try {
      const optimizedUri = await optimizeImage(rawUri);

      const formData = new FormData();
      const fileName = optimizedUri.split('/').pop();
      formData.append('files', {
        uri: optimizedUri, 
        name: fileName || 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();
      const imageId = uploadData[0].id;

      const updateUserRes = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar: imageId }),
      });

      if (!updateUserRes.ok) throw new Error('Update user failed');

      const refreshRes = await fetch(`${API_URL}/users/${user.id}?populate=avatar`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!refreshRes.ok) throw new Error('Fetch fresh user failed');
      
      const freshUser = await refreshRes.json();
      await login(token, freshUser);
      
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
                onError={(e) => console.log("Image Load Error:", e.nativeEvent.error)} 
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

        {/* ส่วนเปลี่ยนรหัสผ่าน */}
        <View style={styles.divider} />
        <ChangePasswordSection token={token} />
        
        {/* พื้นที่ว่างด้านล่างเพื่อให้ Scroll ได้สุด */}
        <View style={{ marginBottom: 40 }} />

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
  value: { fontWeight: '600', color: '#333', fontSize: 14 },
  
  // Styles สำหรับส่วนเปลี่ยนรหัสผ่าน
  passwordSection: {
    width: '100%',
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 5,
  },
  // ปรับ InputContainer ให้ซ้อนไอคอนลูกตาได้
  inputContainer: {
    position: 'relative', // เพื่อให้วางลูกตาแบบ absolute ได้
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    paddingRight: 40, // เว้นที่ด้านขวาไม่ให้ตัวหนังสือทับรูปลูกตา
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    position: 'absolute',
    right: 10,
    top: 12, // ปรับให้กึ่งกลางตามความสูง input
    zIndex: 1,
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});