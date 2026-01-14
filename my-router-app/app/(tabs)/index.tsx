import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext'; 
// เช็ค Path ตรงนี้: ถ้ามันฟ้อง Error ให้ลองลบ ../ ออกตัวนึง หรือเช็คว่าโฟลเดอร์ components อยู่ที่ไหน
import StoreKeeperView from '../../components/dashboards/StoreKeeperView'; 
import TechnicianView from '../../components/dashboards/TechnicianView';
import OwnerView from '../../components/dashboards/OwnerView'; 
import PettyCashButton from '../../components/PettyCashButton';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user, token, logout } = useAuth();

  // ฟังก์ชันแปลงชื่อตำแหน่ง
  const getPositionLabel = (pos: string | undefined) => {
    switch(pos) {
        case 'owner': return 'Owner (เจ้าของ)';
        case 'store_keeper': return 'Store Keeper (สโตร์)';
        case 'technician': return 'Technician (ช่าง)';
        case 'foreman': return 'Foreman (หัวหน้าช่าง)';
        case 'sales': return 'Sales (ฝ่ายขาย)';
        case 'super_admin': return 'Super Admin';
        default: return 'Staff';
    }
  };

  // Logic เลือกหน้าจอ Dashboard
  const renderDashboard = () => {
    const position = user?.position; 

    // 1. กลุ่มบริหาร
    if (position === 'owner' || position === 'super_admin') {
      return <OwnerView user={user} />;
    } 
    
    // 2. กลุ่มสโตร์
    if (position === 'store_keeper') {
      return <StoreKeeperView token={token} />;
    }
    
    // 3. กลุ่มอื่นๆ (Technician, Foreman, Sales)
    return <TechnicianView token={token} />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Inventory 🏗️</Text>
          <Text style={styles.headerSubtitle}>
            ผู้ใช้งาน: {user?.username} 
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getPositionLabel(user?.position)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="exit-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {renderDashboard()}
      </View>

      <PettyCashButton /> 
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 20, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', elevation: 2
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 2 },
  badge: { 
    backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 4, 
    borderRadius: 6, alignSelf: 'flex-start', marginTop: 6
  },
  badgeText: { color: '#0284c7', fontSize: 12, fontWeight: 'bold' },
  logoutBtn: { padding: 10, backgroundColor: '#fee2e2', borderRadius: 12 },
});