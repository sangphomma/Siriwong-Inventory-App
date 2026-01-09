import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Image 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../../constants/Config';
import { useAuth } from '../../../contexts/AuthContext';

export default function JobDetailScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const { token } = useAuth();

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // ดึงข้อมูล Job และ Tasks
  const fetchJobDetails = useCallback(async () => {
    if (!jobId || !token) return;
    try {
      const query = `populate[job_tasks][populate]=evidence_image`;
      const response = await fetch(`${API_URL}/jobs/${jobId}?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json && json.data) setJob(json.data);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, [jobId, token]);

  useFocusEffect(useCallback(() => { fetchJobDetails(); }, [fetchJobDetails]));

  // คำนวณ Progress แบบ Real-time
  const calculatedProgress = useMemo(() => {
    if (!job?.job_tasks || job.job_tasks.length === 0) return 0;
    const completedTasks = job.job_tasks.filter((t: any) => t.job_status === 'Completed').length;
    return Math.round((completedTasks / job.job_tasks.length) * 100);
  }, [job?.job_tasks]);

  // ฟังก์ชันสลับสถานะ Checkbox
  const toggleTaskStatus = async (task: any) => {
    try {
      setUpdating(true);
      const newStatus = task.job_status === 'Completed' ? 'Pending' : 'Completed';
      const res = await fetch(`${API_URL}/job-tasks/${task.documentId}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ data: { job_status: newStatus } })
      });
      if (res.ok) await fetchJobDetails();
    } catch (error) {
      Alert.alert('Error', 'ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setUpdating(false);
    }
  };

  // ลบรายการ
  const handleDeleteTask = (taskDocId: string, taskName: string) => {
    Alert.alert('ลบรายการ', `ยืนยันการลบ "${taskName}"?`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ลบ', 
        style: 'destructive', 
        onPress: async () => {
          await fetch(`${API_URL}/job-tasks/${taskDocId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          fetchJobDetails();
        } 
      }
    ]);
  };

  if (loading && !job) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: job?.name || 'รายละเอียดงาน' }} />
      {updating && <View style={styles.updatingOverlay}><ActivityIndicator color="#fff" /></View>}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>{job?.name}</Text>
          <View style={[styles.badge, { backgroundColor: calculatedProgress === 100 ? '#10b98120' : '#6366f120' }]}>
            <Text style={[styles.badgeText, { color: calculatedProgress === 100 ? '#10b981' : '#6366f1' }]}>
              ความคืบหน้า: {calculatedProgress}%
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${calculatedProgress}%` }]} />
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

        {job?.job_tasks?.map((task: any) => {
          const isDone = task.job_status === 'Completed';
          const imgData = task.evidence_image;
          const imageUrl = Array.isArray(imgData) ? imgData[0]?.url : imgData?.url;

          return (
            <TouchableOpacity 
              key={task.id} 
              style={[styles.taskCard, isDone && styles.taskCardDone]}
              onLongPress={() => router.push(`/project/task/${task.documentId}`)} // กดค้างเพื่อเปิดหน้า Detail
              delayLongPress={500} // ตั้งเวลาในการกดค้าง 0.5 วินาที
            >
              <TouchableOpacity 
                style={[styles.checkbox, isDone && styles.checkboxChecked]} 
                onPress={() => toggleTaskStatus(task)}
              >
                {isDone && <Ionicons name="checkmark" size={18} color="white" />}
              </TouchableOpacity>

              <View style={styles.taskInfo}>
                <Text style={[styles.taskName, isDone && styles.textDone]}>{task.task_name}</Text>
                <Text style={styles.taskDetail}>จำนวน: {task.quantity} {task.unit}</Text>
                {imageUrl && (
                  <Image source={{ uri: `${API_URL.replace('/api', '')}${imageUrl}` }} style={styles.previewImg} />
                )}
                <Text style={styles.hintText}>กดค้างเพื่อจัดการรูปภาพและรายละเอียด</Text>
              </View>

              <View style={styles.actionColumn}>
                <TouchableOpacity onPress={() => handleDeleteTask(task.documentId, task.task_name)}>
                  <Ionicons name="trash-outline" size={22} color="#fca5a5" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  headerCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 25, elevation: 2 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 10, marginBottom: 12 },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  progressBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10b981' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748b' },
  addTaskButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addTaskText: { color: '#10b981', fontWeight: 'bold', fontSize: 14 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 15, marginBottom: 12, elevation: 1 },
  taskCardDone: { backgroundColor: '#f8fafc' },
  checkbox: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, borderColor: '#cbd5e1', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#10b981', borderColor: '#10b981' },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 16, color: '#334155', fontWeight: '600' },
  textDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  taskDetail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  previewImg: { width: 80, height: 60, borderRadius: 8, marginTop: 10, backgroundColor: '#f1f5f9' },
  hintText: { fontSize: 10, color: '#cbd5e1', marginTop: 6, fontStyle: 'italic' },
  actionColumn: { paddingLeft: 10 },
  updatingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10, justifyContent: 'center', alignItems: 'center' }
});