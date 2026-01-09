import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateJobScreen() {
  const router = useRouter();
  const { projectId } = useLocalSearchParams(); // รับ Project ID มา
  const { token } = useAuth();
  
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) return Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่องาน');

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            name: name,
            progress: 0,
            project_site: projectId // ผูกกับ Project นี้
          }
        })
      });

      if (response.ok) {
        Alert.alert('สำเร็จ', 'เพิ่มหมวดงานเรียบร้อย');
        router.back();
      } else {
        Alert.alert('Error', 'ไม่สามารถบันทึกได้');
      }
    } catch (error) {
      Alert.alert('Error', 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'เพิ่มหมวดงาน', headerBackTitle: 'กลับ' }} />
      <View style={styles.form}>
        <Text style={styles.label}>ชื่อหมวดงาน (Job Name)</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="เช่น งานหลังคา, งานปูกระเบื้อง" />
        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>บันทึกงาน</Text>}
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
  btn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});