import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import StoreKeeperView from '../../components/dashboards/StoreKeeperView'; 
import TechnicianView from '../../components/dashboards/TechnicianView';
import PettyCashButton from '../../components/PettyCashButton'; // ⭐ กู้คืนปุ่ม Petty Cash
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user, token, logout } = useAuth();

  const getPositionLabel = (pos: string | undefined) => {
    if (pos === 'store_keeper') return 'Store Keeper (สโตร์)';
    if (pos === 'foreman') return 'Foreman (หัวหน้าช่าง)';
    return 'Staff (พนักงาน)';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Inventory 🏗️</Text>
          <Text style={styles.headerSubtitle}>
            User: {user?.username} ({getPositionLabel(user?.position)})
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="exit-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {user?.position === 'store_keeper' ? (
          <StoreKeeperView token={token} />
        ) : (
          <TechnicianView token={token} />
        )}
      </View>

      {/* 🟡 กู้คืนปุ่ม Floating Action Button สำหรับ Petty Cash */}
      <PettyCashButton /> 
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#00796B', fontWeight: '500' },
  logoutBtn: { padding: 8, backgroundColor: '#fee2e2', borderRadius: 12 },
});