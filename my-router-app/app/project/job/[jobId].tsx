import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Image, 
  Modal, 
  Dimensions 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../../../constants/Config';
import { useAuth } from '../../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

export default function JobDetailScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const { token } = useAuth();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // States สำหรับ Image Preview
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);

  const fetchJobDetails = useCallback(async () => {
    if (!jobId || !token) return;

    try {
      setLoading(true);
      // Strapi v5: Populate job_tasks และ evidence_image
      const query = `populate[job_tasks][populate]=evidence_image`;
      const response = await fetch(`${API_URL}/jobs/${jobId}?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const json = await response.json();

      // การเช็คโครงสร้างข้อมูล Strapi v5
      if (json && json.data) {
        setJob(json.data);
      } else {
        setJob(null);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      setJob(null);
    } finally {
      setLoading(false);
    }
  }, [jobId, token]);

  useFocusEffect(useCallback(() => { fetchJobDetails(); }, [fetchJobDetails]));

  // --- ฟังก์ชันลบ Task (Long Press) ---
  const handleDeleteTask = (taskDocId: string, taskName: string) => {
    Alert.alert('ยืนยันการลบ', `คุณต้องการลบรายการ "${taskName}" ใช่หรือไม่?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ',
        style: 'destructive',
        onPress: async () => {
          try {
            setUpdating(true);
            const res = await fetch(`${API_URL}/job-tasks/${taskDocId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              fetchJobDetails(); // โหลดข้อมูลใหม่เพื่อให้ Progress อัปเดต
            }
          } catch (e) {
            Alert.alert('Error', 'ลบไม่สำเร็จ');
          } finally {
            setUpdating(false);
          }
        }
      }
    ]);
  };

  // --- ฟังก์ชันจัดการสถานะ Task (Check/Uncheck) ---
  const toggleTaskStatus = async (taskDocId: string, currentStatus: string) => {
    try {
      setUpdating(true);
      const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
      const res = await fetch(`${API_URL}/job-tasks/${taskDocId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ data: { job_status: newStatus } })
      });
      if (res.ok) fetchJobDetails();
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  // --- ฟังก์ชันถ่ายรูปและอัปโหลด ---
  const takeTaskPhoto = async (id: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'ต้องการสิทธิ์เข้าถึงกล้อง');

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadTaskImage(id, result.assets[0].uri);
    }
  };

  const uploadTaskImage = async (id: number, uri: string) => {
    try {
      setUpdating(true);
      const formData = new FormData();
      // @ts-ignore
      formData.append('files', { uri, name: `task_${id}.jpg`, type: 'image/jpeg' });
      formData.append('ref', 'api::job-task.job-task');
      formData.append('refId', id.toString());
      formData.append('field', 'evidence_image');

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        Alert.alert('สำเร็จ', 'บันทึกรูปภาพหลักฐานแล้ว');
        fetchJobDetails();
      }
    } catch (error) {
      Alert.alert('Error', 'อัปโหลดล้มเหลว');
    } finally {
      setUpdating(false);
    }
  };

  // --- ฟังก์ชันเปิดดูรูปใหญ่ ---
  const openImagePreview = (url: string) => {
    setSelectedImage(`${API_URL.replace('/api', '')}${url}`);
    setIsPreviewVisible(true);
  };

  if (loading && !job) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={50} color="#cbd5e1" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>ไม่พบข้อมูลงาน</Text>
        <TouchableOpacity onPress={fetchJobDetails} style={styles.retryBtn}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>ลองใหม่อีกครั้ง</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: job?.name || 'รายละเอียดงาน' }} />

      {updating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator color="#fff" />
          <Text style={{ color: 'white', marginTop: 10 }}>กำลังอัปเดต...</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{job?.name}</Text>
          <View style={[styles.badge, { backgroundColor: job?.progress === 100 ? '#10b98120' : '#6366f120' }]}>
            <Text style={[styles.badgeText, { color: job?.progress === 100 ? '#10b981' : '#6366f1' }]}>
              ความคืบหน้า: {job?.progress || 0}%
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>รายการ Checklist</Text>
          <TouchableOpacity
            style={styles.addTaskButton}
            onPress={() => router.push({ pathname: '/project/create_task', params: { jobId: jobId } })}
          >
            <Ionicons name="add-circle" size={22} color="#10b981" />
            <Text style={styles.addTaskText}>เพิ่มรายการ</Text>
          </TouchableOpacity>
        </View>

        {job?.job_tasks && job.job_tasks.length > 0 ? (
          job.job_tasks.map((task: any) => {
            const isDone = task.job_status === 'Completed';
            const imgData = task.evidence_image;
            const imageUrl = Array.isArray(imgData) ? imgData[0]?.url : imgData?.url;

            return (
              <View key={task.id} style={[styles.taskCard, isDone && styles.taskCardDone]}>
                <TouchableOpacity
                  style={[styles.checkbox, isDone && styles.checkboxChecked]}
                  onPress={() => toggleTaskStatus(task.documentId, task.job_status)}
                >
                  {isDone && <Ionicons name="checkmark" size={18} color="white" />}
                </TouchableOpacity>

                <View style={styles.taskInfo}>
                  <TouchableOpacity onLongPress={() => handleDeleteTask(task.documentId, task.task_name)}>
                    <Text style={[styles.taskName, isDone && styles.textDone]}>{task.task_name}</Text>
                  </TouchableOpacity>
                  <Text style={styles.taskDetail}>จำนวน: {task.quantity} {task.unit}</Text>

                  {imageUrl && (
                    <TouchableOpacity onPress={() => openImagePreview(imageUrl)}>
                      <Image 
                        source={{ uri: `${API_URL.replace('/api', '')}${imageUrl}` }} 
                        style={styles.previewImg} 
                      />
                      <Text style={styles.tapToView}>แตะเพื่อดูรูปขยาย</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity onPress={() => takeTaskPhoto(task.id)} style={styles.cameraBtn}>
                  <Ionicons name="camera" size={26} color={imageUrl ? "#10b981" : "#cbd5e1"} />
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyBox}>
            <Ionicons name="list" size={40} color="#cbd5e1" />
            <Text style={{ color: '#94a3b8', marginTop: 10 }}>ยังไม่มีรายการสิ่งที่ต้องทำ</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal สำหรับแสดงรูปภาพขนาดใหญ่ */}
      <Modal visible={isPreviewVisible} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity 
            style={styles.closeModal} 
            onPress={() => setIsPreviewVisible(false)}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </TouchableOpacity>
          
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.fullImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  headerCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 25, elevation: 2 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 10 },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748b' },
  addTaskButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addTaskText: { color: '#10b981', fontWeight: 'bold', fontSize: 14 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 15, marginBottom: 12, elevation: 1 },
  taskCardDone: { backgroundColor: '#f1f5f9' },
  checkbox: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#10b981', borderColor: '#10b981' },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 16, color: '#334155', fontWeight: '600' },
  textDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  taskDetail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  previewImg: { width: 120, height: 90, borderRadius: 8, marginTop: 10, backgroundColor: '#f1f5f9' },
  tapToView: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  cameraBtn: { padding: 10 },
  retryBtn: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#6366f1', borderRadius: 8 },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  updatingOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    zIndex: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  // Modal Styles
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: width, height: height * 0.8 },
  closeModal: { position: 'absolute', top: 50, right: 20, zIndex: 11 }
});