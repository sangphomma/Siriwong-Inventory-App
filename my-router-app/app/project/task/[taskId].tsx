import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert, ScrollView, Dimensions } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../../../constants/Config';
import { useAuth } from '../../../contexts/AuthContext';

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams();
  const { token } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/job-tasks/${taskId}?populate=evidence_image`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.data) setTask(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [taskId, token]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      const newStatus = task.job_status === 'Completed' ? 'Pending' : 'Completed';
      const res = await fetch(`${API_URL}/job-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { job_status: newStatus } })
      });
      if (res.ok) await fetchTask();
    } catch (e) {
      Alert.alert('Error', 'ไม่สามารถเปลี่ยนสถานะได้');
    } finally {
      setUpdating(false);
    }
  };

// ... (ส่วนบนคงเดิม) ...
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'ต้องการสิทธิ์เข้าถึงกล้อง');

    let result = await ImagePicker.launchCameraAsync({ 
      mediaTypes: 'images', // แก้ไขให้รองรับเวอร์ชันใหม่
      allowsEditing: true, 
      quality: 0.5 
    });

    if (!result.canceled) {
      try {
        setUpdating(true);
        const formData = new FormData();
        // ส่งไฟล์รูปภาพ
        // @ts-ignore
        formData.append('files', { 
          uri: result.assets[0].uri, 
          name: `evidence_${task.id}.jpg`, 
          type: 'image/jpeg' 
        });
        
        // ผูกรูปภาพกับ JobTask โดยใช้ id (ที่เป็น Number)
        formData.append('ref', 'api::job-task.job-task');
        formData.append('refId', task.id.toString()); 
        formData.append('field', 'evidence_image');

        const res = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (res.ok) {
          await fetchTask(); // ดึงข้อมูลใหม่เพื่อแสดงรูปที่เพิ่งอัปโหลด
        } else {
          const err = await res.json();
          console.error("Upload Error:", err);
          Alert.alert('Error', 'ไม่สามารถอัปโหลดรูปภาพได้');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setUpdating(false);
      }
    }
  };
  // ... (ส่วนที่เหลือคงเดิม) ...

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;

  const imgData = task?.evidence_image;
  const imageUrl = Array.isArray(imgData) ? imgData[0]?.url : imgData?.url;

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'จัดการรายการงาน', headerBackTitle: 'กลับ' }} />
      
      <View style={styles.card}>
        <Text style={styles.label}>ชื่อรายการ</Text>
        <Text style={styles.taskName}>{task?.task_name}</Text>
        <Text style={styles.taskQty}>จำนวน: {task?.quantity} {task?.unit}</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>สถานะการทำงาน</Text>
        <TouchableOpacity 
          style={[styles.statusBtn, { backgroundColor: task?.job_status === 'Completed' ? '#10b981' : '#f59e0b' }]}
          onPress={handleUpdateStatus}
          disabled={updating}
        >
          <Ionicons name={task?.job_status === 'Completed' ? "checkmark-circle" : "time"} size={24} color="white" />
          <Text style={styles.statusText}>
            {task?.job_status === 'Completed' ? 'เสร็จสิ้น (Completed)' : 'รอดำเนินการ (Pending)'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.hint}>* แตะที่ปุ่มด้านบนเพื่อเปลี่ยนสถานะ</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>รูปภาพหลักฐาน</Text>
        {imageUrl ? (
          <Image source={{ uri: `${API_URL.replace('/api', '')}${imageUrl}` }} style={styles.mainImg} resizeMode="cover" />
        ) : (
          <View style={styles.emptyImg}>
            <Ionicons name="image-outline" size={50} color="#cbd5e1" />
            <Text style={{color: '#94a3b8', marginTop: 10}}>ยังไม่มีรูปภาพหลักฐาน</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto} disabled={updating}>
          {updating ? <ActivityIndicator color="white" /> : (
            <>
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.cameraBtnText}>{imageUrl ? 'ถ่ายรูปใหม่' : 'ถ่ายรูปหลักฐาน'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05 },
  label: { fontSize: 12, color: '#64748b', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  taskName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  taskQty: { fontSize: 16, color: '#64748b', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
  statusBtn: { flexDirection: 'row', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 10 },
  statusText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  hint: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 10 },
  mainImg: { width: '100%', height: 250, borderRadius: 12, marginTop: 10 },
  emptyImg: { width: '100%', height: 200, backgroundColor: '#f8fafc', borderRadius: 12, marginTop: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  cameraBtn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 15 },
  cameraBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});