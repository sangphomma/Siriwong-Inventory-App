import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Import ไฟล์แยกที่เราสร้างไว้
import OwnerView from '../../components/dashboards/OwnerView';
import TechnicianView from '../../components/dashboards/TechnicianView';

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();

  // ระบบป้องกัน (เหมือนเดิม)
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading]);

  const handleLogout = () => {
    Alert.alert("ออกจากระบบ", "ต้องการออกใช่หรือไม่?", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ออก", style: "destructive", onPress: async () => { await logout(); router.replace('/login'); }}
    ]);
  };

  if (isLoading || !user) {
    return <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><ActivityIndicator /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      
      {/* Header ส่วนกลาง (โชว์ทุกหน้า) */}
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>My Inventory 🏗️</Text>
            <Text style={styles.headerSubtitle}>User: {user.username} ({user.position})</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      {/* 👇 จุดตัดเชือก! เลือกโชว์หน้าจอตามตำแหน่ง 👇 */}
      { (user.position === 'owner' || user.position === 'store_keeper') ? (
          <OwnerView user={user} />
      ) : (
          <TechnicianView user={user} />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 60, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { color: '#64748b', fontSize: 14 },
  logoutBtn: { padding: 10, backgroundColor: '#fee2e2', borderRadius: 50 },
});