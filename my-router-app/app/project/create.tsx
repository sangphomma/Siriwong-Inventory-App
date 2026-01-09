import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateProjectScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !location) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อโครงการและสถานที่');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/project-sites`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            name: name,
            location: location,
            project_status: 'pending', // ตั้งค่าเริ่มต้น
            overall_progress: 0
          }
        })
      });

      if (response.ok) {
        Alert.alert('สำเร็จ', 'สร้างโครงการเรียบร้อยแล้ว');
        router.back(); // กลับไปหน้า Dashboard
      } else {
        Alert.alert('Error', 'ไม่สามารถสร้างโครงการได้');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'สร้างโครงการใหม่', headerBackTitle: 'กลับ' }} />
      
      <View style={styles.form}>
        <Text style={styles.label}>ชื่อโครงการ</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="เช่น บ้านคุณสมชาย" />

        <Text style={styles.label}>สถานที่ตั้ง (Location)</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="เช่น หมู่บ้าน..." />

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>บันทึกโครงการ</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  form: { backgroundColor: 'white', padding: 20, borderRadius: 12 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },
  btn: { backgroundColor: '#6366f1', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});