import React, { useState, useCallback, useMemo } from 'react'; 
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router'; 
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjectDetails = async () => {
    try {
      // ดึง Jobs และ JobTasks มาเพื่อคำนวณ Progress ที่แม่นยำที่สุด
      const query = `populate[jobs][populate]=job_tasks`; 
      const response = await fetch(`${API_URL}/project-sites/${id}?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      if (json.data) setProject(json.data);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { if (id && token) fetchProjectDetails(); }, [id, token]));

  // --- 🟢 ส่วนที่แก้ไข: คำนวณ Overall Progress ของโครงการ ---
  const calculatedOverallProgress = useMemo(() => {
    if (!project?.jobs || project.jobs.length === 0) return 0;

    const totalJobs = project.jobs.length;
    const sumProgress = project.jobs.reduce((acc: number, job: any) => {
      // คำนวณ progress ของแต่ละ job จาก job_tasks
      if (!job.job_tasks || job.job_tasks.length === 0) return acc;
      const completedTasks = job.job_tasks.filter((t: any) => t.job_status === 'Completed').length;
      const jobProgress = (completedTasks / job.job_tasks.length) * 100;
      return acc + jobProgress;
    }, 0);

    return Math.round(sumProgress / totalJobs);
  }, [project?.jobs]);

  const handleDeleteProject = async () => {
    if (project?.jobs && project.jobs.length > 0) {
      Alert.alert('ไม่สามารถลบได้', 'กรุณาลบหมวดงาน (Jobs) ทั้งหมดในโครงการนี้ออกก่อน');
      return;
    }

    Alert.alert('ยืนยันการลบ', 'คุณต้องการลบโครงการนี้ใช่หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      { 
        text: 'ลบโครงการ', 
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${API_URL}/project-sites/${project.documentId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              Alert.alert('สำเร็จ', 'ลบโครงการเรียบร้อยแล้ว');
              router.replace('/'); 
            }
          } catch (error) { Alert.alert('Error', 'ไม่สามารถลบโครงการได้'); }
        }
      }
    ]);
  };

  if (loading && !project) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;
  if (!project) return <View style={styles.center}><Text>ไม่พบข้อมูลโครงการ</Text></View>;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'รายละเอียดโครงการ', 
        headerRight: () => (
          <TouchableOpacity onPress={handleDeleteProject} style={{ marginRight: 15 }}>
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        )
      }} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProjectDetails} />}
      >
        <View style={styles.headerCard}>
          <View style={styles.iconContainer}><Ionicons name="business" size={40} color="#6366f1" /></View>
          <View style={styles.headerInfo}>
            <Text style={styles.projectTitle}>{project.name}</Text>
            <Text style={styles.projectLocation}>📍 {project.location}</Text>
          </View>
        </View>

        <View style={styles.statCard}>
           <Text style={styles.sectionHeader}>ความคืบหน้าโครงการรวม</Text>
           {/* เปลี่ยนมาใช้ค่าที่คำนวณได้ */}
           <Text style={styles.bigPercent}>{calculatedOverallProgress}%</Text>
           <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${calculatedOverallProgress}%` }]} />
           </View>
        </View>

        <View style={styles.sectionHeaderRow}>
            <Text style={styles.listHeader}>รายการหมวดงาน (Jobs)</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => router.push({ pathname: '/project/create_job', params: { projectId: id } })}
            >
               <Ionicons name="add" size={16} color="white" />
               <Text style={styles.addButtonText}>เพิ่มงาน</Text>
            </TouchableOpacity>
        </View>
        
        {project.jobs?.map((job: any) => {
          // คำนวณ progress ราย job เพื่อแสดงในลิสต์
          const completed = job.job_tasks?.filter((t: any) => t.job_status === 'Completed').length || 0;
          const total = job.job_tasks?.length || 0;
          const jobPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <TouchableOpacity 
              key={job.id} 
              style={styles.jobCard}
              onPress={() => router.push(`/project/job/${job.documentId}`)}
            >
              <View style={styles.jobInfo}>
                <Text style={styles.jobName}>{job.name}</Text>
                <Text style={styles.jobProgressText}>{jobPercent}% เสร็จสิ้น</Text>
                <View style={[styles.miniProgressBarBg, {marginTop: 8}]}>
                   <View style={[styles.miniProgressBarFill, { width: `${jobPercent}%` }]} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
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
  headerCard: { flexDirection: 'row', backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 15, alignItems: 'center', elevation: 2 },
  iconContainer: { width: 60, height: 60, backgroundColor: '#e0e7ff', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  headerInfo: { flex: 1 },
  projectTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  projectLocation: { fontSize: 14, color: '#64748b', marginTop: 4 },
  statCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, marginBottom: 25, elevation: 2 },
  sectionHeader: { fontSize: 14, color: '#64748b', marginBottom: 5 },
  bigPercent: { fontSize: 36, fontWeight: 'bold', color: '#6366f1', marginBottom: 10 },
  progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  listHeader: { fontSize: 18, fontWeight: 'bold', color: '#334155' },
  addButton: { flexDirection: 'row', backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', gap: 4 },
  addButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  jobCard: { flexDirection: 'row', backgroundColor: 'white', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 1 },
  jobInfo: { flex: 1 },
  jobName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  jobProgressText: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  miniProgressBarBg: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden', width: '60%' },
  miniProgressBarFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 2 },
});