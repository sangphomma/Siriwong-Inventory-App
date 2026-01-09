import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../constants/Config';

interface TechnicianProps {
  token: string | null;
}

export default function TechnicianView({ token }: TechnicianProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/project-sites?sort=updatedAt:desc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      setProjects(json.data || []);
    } catch (error) {
      console.error("Fetch Projects Error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return '#10b981';    // ปิดงาน (สีเขียว)
      case 'active': return '#3b82f6';    // กำลังทำ (สีฟ้า)
      case 'pending': return '#f59e0b';   // รอเริ่ม (สีส้ม) - สถานะใหม่
      default: return '#94a3b8';          // สีเทา
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProjects} />}
    >
      <Text style={styles.sectionTitle}>เมนูจัดการสต็อก 🛠️</Text>
      
      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuCard} onPress={() => router.push('/product/create_request')}>
          <Ionicons name="add-circle" size={32} color="#6366f1" />
          <Text style={styles.menuTitle}>สร้างใบเบิก</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/product/my_requests' as any)}
        >
          <Ionicons name="time" size={32} color="#0ea5e9" />
          <Text style={styles.menuTitle}>ประวัติของฉัน</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.menuGrid, { marginTop: 15 }]}>
        <TouchableOpacity 
          style={styles.menuCard} 
          onPress={() => router.push('/product/create_return' as any)}
        >
          <Ionicons name="return-down-back" size={32} color="#f59e0b" />
          <Text style={styles.menuTitle}>คืนของเข้า Store</Text>
        </TouchableOpacity>
        <View style={[styles.menuCard, { backgroundColor: 'transparent', elevation: 0 }]} />
      </View>

      {/* --- ส่วนที่ 2: โครงการที่ดูแล --- */}
      <View style={styles.projectSection}>
        
        {/* 🟢 แก้ไข: เพิ่มปุ่ม (+) สำหรับสร้างโครงการใหม่ */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>โครงการที่ดูแล 🏗️</Text>
          <TouchableOpacity 
            onPress={() => router.push('/project/create')} 
            style={styles.addButton}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>สร้างใหม่</Text>
          </TouchableOpacity>
        </View>
        
        {loading && projects.length === 0 ? (
           <ActivityIndicator size="large" color="#6366f1" />
        ) : (
          projects.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.projectCard}
              onPress={() => router.push(`/project/${item.documentId}`)}
            >
              <View style={styles.projectHeader}>
                <View>
                    <Text style={styles.projectName}>{item.name}</Text>
                    <Text style={styles.projectLocation}>📍 {item.location || 'ไม่ระบุพิกัด'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(item.project_status) + '20' }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(item.project_status) }]}>
                        {item.project_status || 'Unknown'}
                    </Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                  <Text style={styles.progressLabel}>ความคืบหน้าภาพรวม</Text>
                  <Text style={styles.progressValue}>{item.overall_progress || 0}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${item.overall_progress || 0}%` }]} />
              </View>
            </TouchableOpacity>
          ))
        )}

        {!loading && projects.length === 0 && (
            <View style={styles.emptyContainer}>
               <Text style={styles.emptyText}>ยังไม่มีโครงการ</Text>
               <Text style={styles.emptySubText}>กดปุ่ม "สร้างใหม่" เพื่อเริ่มโครงการแรก</Text>
            </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 5 }, // ลด margin เพราะมี row มาครอบ
  
  // Header Row ใหม่ที่มีปุ่มสร้าง
  sectionHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15,
    marginTop: 30
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4
  },
  addButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  menuGrid: { flexDirection: 'row', gap: 15 },
  menuCard: { 
    flex: 1, 
    backgroundColor: 'white', 
    padding: 20, 
    borderRadius: 15, 
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
  },
  menuTitle: { marginTop: 10, fontWeight: 'bold', color: '#475569', fontSize: 14 },

  projectSection: { marginTop: 0 }, // ย้าย margin ไปที่ header row แทน
  projectCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05,
    borderLeftWidth: 5,
    borderLeftColor: '#6366f1'
  },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  projectName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  projectLocation: { fontSize: 12, color: '#64748b', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 },
  progressLabel: { fontSize: 12, color: '#64748b' },
  progressValue: { fontSize: 12, fontWeight: 'bold', color: '#6366f1' },
  progressBarBg: { height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 3 },
  
  emptyContainer: { alignItems: 'center', marginTop: 20 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
  emptySubText: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginTop: 4 }
});