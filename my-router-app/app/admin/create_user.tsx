import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// 1. ดึง Token มาใช้เพื่อยืนยันตัวตนว่าเป็น Owner
import { useAuth } from '../../contexts/AuthContext'; 
import { API_URL } from '../../constants/Config'; 

export default function CreateUserScreen() {
  const router = useRouter();
  const { token } = useAuth(); // 2. ขอ Token
  const [loading, setLoading] = useState(false);
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState('technician');

  const positions = [
    { label: 'Store Keeper (สโตร์)', value: 'store_keeper' },
    { label: 'Technician (ช่าง)', value: 'technician' },
    { label: 'Foreman (หัวหน้าช่าง)', value: 'foreman' },
    { label: 'Sales (ฝ่ายขาย)', value: 'sales' },
    { label: 'Owner (ผู้บริหาร)', value: 'owner' },
  ];

  const handleCreateUser = async () => {
    if (!username || !email || !password) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    setLoading(true);
    
    // Debug Log
    console.log("Creating User via Admin API...");

    try {
      // 3. ⭐ เปลี่ยน URL ไปที่ /users (ช่องทาง Admin)
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // 4. ⭐ แนบ Token
        },
        body: JSON.stringify({
          username,
          email,
          password,
          position,
          confirmed: true, // 5. ⭐ สั่งให้ยืนยันตัวตนทันที
          role: 1 // (Optional) ปกติ Strapi จะใส่ Role Default ให้ (Authenticated)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("Error Response:", JSON.stringify(data, null, 2));
        throw new Error(data.error?.message || 'Something went wrong');
      }

      Alert.alert('สำเร็จ ✅', `สร้างบัญชี "${username}" เรียบร้อยแล้ว`, [
        { text: 'ตกลง', onPress: () => router.back() } 
      ]);

    } catch (error: any) {
      console.error(error);
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถสร้าง User ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>เพิ่มพนักงานใหม่ 👤</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>ชื่อผู้ใช้งาน (Username)</Text>
        <TextInput 
          style={styles.input} placeholder="เช่น somchai01" 
          value={username} onChangeText={setUsername} autoCapitalize="none"
        />

        <Text style={styles.label}>อีเมล (Email)</Text>
        <TextInput 
          style={styles.input} placeholder="user@siriwong.com" 
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
        />

        <Text style={styles.label}>รหัสผ่าน (Password)</Text>
        <TextInput 
          style={styles.input} placeholder="อย่างน้อย 6 ตัวอักษร" 
          value={password} onChangeText={setPassword} secureTextEntry
        />

        <Text style={styles.label}>ตำแหน่ง (Position)</Text>
        <View style={styles.positionGrid}>
          {positions.map((pos) => (
            <TouchableOpacity
              key={pos.value}
              style={[styles.posButton, position === pos.value && styles.posButtonActive]}
              onPress={() => setPosition(pos.value)}
            >
              <Text style={[styles.posText, position === pos.value && styles.posTextActive]}>
                {pos.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleCreateUser} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>สร้างบัญชี</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 },
  backBtn: { padding: 8, marginRight: 10, backgroundColor: '#e2e8f0', borderRadius: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  form: { backgroundColor: 'white', padding: 20, borderRadius: 16, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 8, marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#f8fafc' },
  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  posButton: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white', marginBottom: 8, marginRight: 8 },
  posButtonActive: { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
  posText: { fontSize: 13, color: '#64748b' },
  posTextActive: { color: 'white', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 10 },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});