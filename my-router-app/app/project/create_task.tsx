import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateTaskScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams(); // รับ Job ID มา
  const { token } = useAuth();
  
  const [taskName, setTaskName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!taskName || !quantity) return Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อและจำนวน');

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/job-tasks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            task_name: taskName,
            quantity: Number(quantity),
            unit: unit || 'หน่วย',
            job_status: 'Pending',
            job: jobId // ผูกกับ Job นี้
          }
        })
      });

      if (response.ok) {
        Alert.alert('สำเร็จ', 'เพิ่มรายการเรียบร้อย');
        router.back();
      } else {
        const err = await response.json();
        console.log(err);
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
      <Stack.Screen options={{ title: 'เพิ่มรายการ (Task)', headerBackTitle: 'กลับ' }} />
      <View style={styles.form}>
        <Text style={styles.label}>รายการสิ่งที่ต้องทำ</Text>
        <TextInput style={styles.input} value={taskName} onChangeText={setTaskName} placeholder="เช่น เทปูน, มุงหลังคา" />
        
        <View style={{flexDirection:'row', gap: 10}}>
            <View style={{flex:1}}>
                <Text style={styles.label}>จำนวน</Text>
                <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="0" />
            </View>
            <View style={{flex:1}}>
                <Text style={styles.label}>หน่วย</Text>
                <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="ตร.ม., ชิ้น" />
            </View>
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>บันทึกรายการ</Text>}
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
  btn: { backgroundColor: '#10b981', padding: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});