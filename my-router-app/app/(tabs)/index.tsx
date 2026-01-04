import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

// Import หน้าจอ Dashboard ของแต่ละแผนก
import OwnerView from '../../components/dashboards/OwnerView';
import StoreKeeperView from '../../components/dashboards/StoreKeeperView';
import TechnicianView from '../../components/dashboards/TechnicianView';

export default function HomeScreen() {
  const router = useRouter();
  
  // ✅ ดึงค่า token ออกมาใช้ในหน้านี้
  const { user, token, logout, isLoading } = useAuth();

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
      
      {/* Header ส่วนกลาง */}
      <View style={styles.header}>
        <View>
            <Text style={styles.headerTitle}>My Inventory 🏗️</Text>
            <Text style={styles.headerSubtitle}>User: {user.username} ({user.position})</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      {/* 🎯 จุดตัดสินใจเลือกแสดง Dashboard */}
      {(() => {
        if (user.position === 'owner') {
          return <OwnerView user={user} />;
        } 
        
        if (user.position === 'store_keeper') {
          // ✅ ส่ง token ไปให้หน้า StoreKeeper
          return <StoreKeeperView token={token} />; 
        }

        return <TechnicianView user={user} />;
      })()}

    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    padding: 20, paddingTop: 60, backgroundColor: 'white', 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9' 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { color: '#64748b', fontSize: 14 },
  logoutBtn: { padding: 10, backgroundColor: '#fee2e2', borderRadius: 50 },
});