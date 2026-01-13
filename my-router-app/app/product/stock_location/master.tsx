import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, FlatList, 
  StyleSheet, Alert, ActivityIndicator, SafeAreaView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// ⚠️ สังเกตการถอย path ../../../
import { API_URL } from '../../../constants/Config'; 
import { useAuth } from '../../../contexts/AuthContext';

export default function LocationMasterScreen() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [newLocName, setNewLocName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, [token]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/locations?sort=name:asc`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setLocations(json.data || []);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocName.trim()) return Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อจุดจัดเก็บ");
    
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/locations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: { name: newLocName } })
      });

      if (res.ok) {
        setNewLocName('');
        fetchLocations(); 
        Alert.alert("สำเร็จ", "เพิ่มจุดจัดเก็บเรียบร้อย");
      } else {
        throw new Error("Add failed");
      }
    } catch (error) {
      Alert.alert("ผิดพลาด", "ไม่สามารถเพิ่มข้อมูลได้");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string | number) => {
    Alert.alert("ยืนยันการลบ", "คุณแน่ใจหรือไม่? (หากมีสินค้าผูกอยู่ อาจเกิดปัญหาข้อมูลได้)", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: 'destructive', onPress: async () => {
          try {
             await fetch(`${API_URL}/locations/${id}`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${token}` }
             });
             fetchLocations();
          } catch (e) { Alert.alert("Error", "ลบไม่สำเร็จ"); }
      }}
    ]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name="cube-outline" size={24} color="#00796B" />
      </View>
      <Text style={styles.locName}>{item.name}</Text>
      <TouchableOpacity onPress={() => handleDelete(item.documentId || item.id)}>
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>Master รายชื่อจุดเก็บ</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.inputSection}>
         <TextInput 
            style={styles.input} 
            placeholder="ชื่อจุดเก็บ (เช่น ชั้น A-01, โกดัง 2)" 
            value={newLocName}
            onChangeText={setNewLocName}
         />
         <TouchableOpacity style={styles.addBtn} onPress={handleAddLocation} disabled={submitting}>
            {submitting ? <ActivityIndicator color="white" /> : <Ionicons name="add" size={24} color="white" />}
         </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" style={{marginTop: 20}} /> : (
        <FlatList
          data={locations}
          keyExtractor={(item) => (item.documentId || item.id).toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={{textAlign: 'center', color: '#999', marginTop: 20}}>ยังไม่มีข้อมูล</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', elevation: 2 },
  title: { fontSize: 18, fontWeight: 'bold' },
  inputSection: { flexDirection: 'row', padding: 15, gap: 10, backgroundColor: 'white', marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, height: 45, backgroundColor: '#f9f9f9' },
  addBtn: { width: 45, height: 45, backgroundColor: '#00796B', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 8, elevation: 1 },
  iconBox: { width: 40, height: 40, backgroundColor: '#E0F2F1', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  locName: { flex: 1, fontSize: 16, color: '#333' }
});