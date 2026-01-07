// components/PettyCashButton.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PettyCashButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      {isOpen && (
        <TouchableOpacity 
          style={[styles.fab, styles.menuItem]} 
          onPress={() => { setIsOpen(false); router.push('/product/petty_cash'); }}
        >
          <View style={styles.labelContainer}><Text style={styles.menuLabel}>บันทึกเงินสดย่อย</Text></View>
          <View style={styles.iconCircle}><Ionicons name="cash-outline" size={20} color="white" /></View>
        </TouchableOpacity>
      )}

      {/* 🟡 ปุ่มหลัก: สีเหลืองทอง + แสงฟุ้ง (Glow) */}
      <TouchableOpacity 
        activeOpacity={0.8}
        style={[styles.fab, styles.mainButton]} 
        onPress={() => setIsOpen(!isOpen)}
      >
        <Ionicons name={isOpen ? "close" : "add"} size={38} color="#1e293b" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 100, right: 25, alignItems: 'flex-end', zIndex: 9999 },
  fab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  mainButton: { 
    width: 70, height: 70, borderRadius: 35, 
    backgroundColor: '#FFD700', // สีเหลืองทอง
    borderWidth: 3, borderColor: '#FFF',
    // ✨ Outer Glow Effect
    elevation: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  menuItem: { marginBottom: 20 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  labelContainer: { backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 10, elevation: 2 },
  menuLabel: { color: '#1e293b', fontSize: 14, fontWeight: 'bold' }
});