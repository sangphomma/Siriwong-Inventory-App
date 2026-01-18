import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../constants/Config';

export default function PettyCashAddProductScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  
  // Data State
  const [projectSites, setProjectSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Preview State
  const [previews, setPreviews] = useState<{
    slip_image: string | null;
    receipt_image: string | null;
    product_image: string | null;
  }>({ slip_image: null, receipt_image: null, product_image: null });

  useEffect(() => {
    fetch(`${API_URL}/tags`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(json => setAllTags(json.data || []));

    // ดึง Site ทั้งหมดแล้ว Filter Active เอง (วิธีนี้ชัวร์สุด)
    fetch(`${API_URL}/project-sites?sort=name:asc`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    })
      .then(res => res.json())
      .then(json => {
        const sites = json.data || [];
        const activeSites = sites.filter((s: any) => 
            (s.project_status || "").toLowerCase() === 'active'
        );
        setProjectSites(activeSites);
      })
      .catch(err => console.log("Site Fetch Error:", err));
  }, []);

  // --- Helpers ---
  const handleTagTyping = (text: string) => {
    setTagInput(text);
    if (text.trim().length > 0) {
      const filtered = allTags.filter(t => (t.tagName || t.attributes?.tagName || "").toLowerCase().includes(text.toLowerCase()));
      setSuggestions(filtered);
    } else { setSuggestions([]); }
  };

  const addTag = (name: string) => {
    const cleanName = name.trim().replace('#', '');
    if (cleanName && !selectedTagNames.includes(cleanName)) { setSelectedTagNames([...selectedTagNames, cleanName]); }
    setTagInput(''); setSuggestions([]);
  };

  const takePhoto = async (field: keyof typeof previews) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("ขอสิทธิ์เข้าถึงกล้องครับ");
    
    try {
        let result = await ImagePicker.launchCameraAsync({ 
            allowsEditing: false, // ปิด Edit กันแอปเด้ง
            quality: 0.5 
        });
        if (!result.canceled) setPreviews(prev => ({ ...prev, [field]: result.assets[0].uri }));
    } catch (e) { Alert.alert("Error", "เปิดกล้องไม่สำเร็จ"); }
  };

  // ฟังก์ชันย่อและอัปโหลด (ใช้ภายใน handleSave)
  const uploadImage = async (uri: string | null) => {
    if (!uri) return null; // ถ้าไม่มีรูป ก็ส่งกลับเป็น null
    try {
        // 1. ย่อรูป
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1000 } }], 
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 2. อัปโหลด
        const formData = new FormData();
        const fileName = uri.split('/').pop() || 'upload.jpg';
        // @ts-ignore
        formData.append('files', { uri: manipResult.uri, name: fileName, type: 'image/jpeg' });
        
        const res = await fetch(`${API_URL}/upload`, { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` }, 
            body: formData 
        });
        
        if (!res.ok) return null;
        const data = await res.json(); 
        return data[0]?.id; // คืนค่า ID รูปที่ได้จาก Server
    } catch (e) {
        console.log("Upload Error:", e);
        return null;
    }
  };

  // ✅ All-in-One Save Logic (กลับสู่สามัญ แต่ทรงพลัง)
  const handleSave = async () => {
    if (!amount || !description) return Alert.alert("กรุณากรอกข้อมูลให้ครบ");
    
    setLoading(true);
    try {
      // 1. จัดการ Tags
      const finalTagIds: number[] = [];
      for (const name of selectedTagNames) {
        const existing = allTags.find(t => (t.tagName || t.attributes?.tagName) === name);
        if (existing) finalTagIds.push(existing.id);
        else {
          try {
             const tagRes = await fetch(`${API_URL}/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ data: { tagName: name } }) });
             const newTag = await tagRes.json(); if (newTag.data) finalTagIds.push(newTag.data.id);
          } catch(e){}
        }
      }

      // 2. 🚀 อัปโหลดรูปทั้งหมดพร้อมกัน (Parallel Upload)
      // ใช้ Promise.all เพื่อความเร็วสูงสุด ไม่ต้องรอทีละรูป
      const [slipId, receiptId, productId] = await Promise.all([
          uploadImage(previews.slip_image),
          uploadImage(previews.receipt_image),
          uploadImage(previews.product_image)
      ]);

      // 3. 📦 สร้างรายการ (POST ทีเดียวจบ)
      const payload = {
        data: {
            amount: parseFloat(amount),
            description,
            date: new Date().toISOString().split('T')[0],
            // ยัด ID รูปที่ได้ใส่เข้าไปเลย
            slip_image: slipId,
            receipt_image: receiptId,
            product_image: productId,
            requested_bies: [user?.id],
            tags: finalTagIds,
            project_sites: selectedSite ? [selectedSite.id] : [],
            publishedAt: new Date().toISOString(), // สำคัญสำหรับ Strapi v5
        }
      };

      const res = await fetch(`${API_URL}/petty-cashes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
         const errJson = await res.json();
         throw new Error(errJson?.error?.message || "บันทึกข้อมูลไม่สำเร็จ");
      }

      Alert.alert("สำเร็จ ✅", "บันทึกข้อมูลเรียบร้อยแล้ว", [{ text: "ตกลง", onPress: () => router.back() }]);

    } catch (e: any) { 
        Alert.alert("เกิดข้อผิดพลาด", e.message || "ระบบขัดข้อง");
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <View style={styles.card}>
        <Text style={styles.label}>💰 ยอดเงิน (บาท)</Text>
        <TextInput style={styles.input} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        
        <Text style={styles.label}>📝 รายละเอียด</Text>
        <TextInput style={[styles.input, { height: 70 }]} placeholder="ระบุรายละเอียด..." multiline value={description} onChangeText={setDescription} />

        <Text style={styles.label}>📍 Site งาน (Active Only)</Text>
        <TouchableOpacity style={styles.siteSelector} onPress={() => setShowSiteModal(true)}>
          <Text style={{ color: selectedSite ? '#1e293b' : '#94a3b8' }}>
            {selectedSite ? `📍 ${selectedSite.name}` : "กดเพื่อเลือกไซด์งาน..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>

        <Text style={styles.label}>🏷️ ป้ายกำกับ</Text>
        <View style={styles.tagInputContainer}>
          <View style={styles.tagDisplayArea}>
            {selectedTagNames.map(name => (
              <View key={name} style={styles.chip}><Text style={styles.chipText}>#{name}</Text>
                <TouchableOpacity onPress={() => setSelectedTagNames(selectedTagNames.filter(t => t !== name))}><Ionicons name="close-circle" size={18} color="#059669" /></TouchableOpacity>
              </View>
            ))}
            <TextInput style={styles.innerInput} placeholder="พิมพ์ที่นี่..." value={tagInput} onChangeText={handleTagTyping} onSubmitEditing={() => addTag(tagInput)} />
          </View>
        </View>

        <Text style={styles.label}>📸 หลักฐาน (ครบ 3 ใบ)</Text>
        <View style={styles.photoRow}>
          {(['slip_image', 'receipt_image', 'product_image'] as const).map((f, i) => (
            <TouchableOpacity key={f} style={styles.photoBox} onPress={() => takePhoto(f)}>
              {previews[f] ? <Image source={{ uri: previews[f]! }} style={styles.previewImage} /> : (
                <View style={styles.placeholderBox}>
                  <Ionicons name="camera" size={24} color="#94a3b8" />
                  <Text style={styles.photoLabel}>{i === 0 ? "สลิป" : i === 1 ? "ใบเสร็จ" : "สินค้า"}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.saveBtn, loading && { backgroundColor: '#94a3b8' }]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={showSiteModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เลือกไซด์งาน</Text>
            <FlatList
              data={projectSites}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.siteItem} onPress={() => { setSelectedSite(item); setShowSiteModal(false); }}>
                  <Text style={styles.siteItemText}>📍 {item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{textAlign:'center', padding:20, color:'#94a3b8'}}>กำลังโหลด หรือ ไม่พบข้อมูล...</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSiteModal(false)}><Text style={{color:'white', fontWeight:'bold'}}>ปิด</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 20, elevation: 3, marginBottom: 50 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16 },
  siteSelector: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', borderRadius: 15, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  siteItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  siteItemText: { fontSize: 16, color: '#1e293b' },
  closeBtn: { backgroundColor: '#64748b', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  tagInputContainer: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, minHeight: 50 },
  tagDisplayArea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15, gap: 5 },
  chipText: { color: '#059669', fontWeight: '600', fontSize: 13 },
  innerInput: { flex: 1, minWidth: 100, fontSize: 15, paddingVertical: 5 },
  photoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  photoBox: { width: '31%', height: 90, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  photoLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },
  previewImage: { width: '100%', height: '100%' },
  saveBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});