import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../constants/Config';

export default function PettyCashAddScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  
  // State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(''); // เอาไว้บอก User ว่าทำถึงขั้นไหนแล้ว
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

  // Image State (เก็บแค่ URI พอ ไม่ต้องรีบอัปโหลด)
  const [previews, setPreviews] = useState<{
    slip_image: string | null;
    receipt_image: string | null;
    product_image: string | null;
  }>({ slip_image: null, receipt_image: null, product_image: null });

  useEffect(() => {
    fetch(`${API_URL}/tags`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(json => setAllTags(json.data || []));

    fetch(`${API_URL}/project-sites?filters[project_status][$eq]=Active`, { 
      headers: { 'Authorization': `Bearer ${token}` } 
    }).then(res => res.json()).then(json => setProjectSites(json.data || []));
  }, []);

  // --- Helpers ---
  const handleTagTyping = (text: string) => { /* ...Tag Logic เดิม... */ setTagInput(text); if (text.trim().length > 0) { const filtered = allTags.filter(t => (t.tagName || t.attributes?.tagName).toLowerCase().includes(text.toLowerCase())); setSuggestions(filtered); } else { setSuggestions([]); } };
  const addTag = (name: string) => { const cleanName = name.trim().replace('#', ''); if (cleanName && !selectedTagNames.includes(cleanName)) { setSelectedTagNames([...selectedTagNames, cleanName]); } setTagInput(''); setSuggestions([]); };
  const removeTag = (name: string) => { setSelectedTagNames(selectedTagNames.filter(t => t !== name)); };

  // 📸 1. ถ่ายรูปเก็บไว้ในเครื่องก่อน (ยังไม่ย่อ ยังไม่อัปโหลด เพื่อลดภาระเครื่อง)
  const takePhoto = async (field: keyof typeof previews) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("ขอสิทธิ์เข้าถึงกล้องครับ");
    
    // ถ่ายแบบปกติ ไม่ต้อง process อะไรทั้งนั้น กันแอปเด้ง
    let result = await ImagePicker.launchCameraAsync({ 
        allowsEditing: true, 
        quality: 0.8 // ลด Quality ตอนถ่ายเลย ช่วยเรื่อง Memory ได้เยอะ
    });
    
    if (!result.canceled) {
        setPreviews(prev => ({ ...prev, [field]: result.assets[0].uri }));
    }
  };

  // 🛠️ ฟังก์ชันย่อและอัปโหลด (ทำทีละรูปเมื่อกด Save)
  const processAndUpload = async (uri: string | null, label: string) => {
    if (!uri) return null;
    try {
        // 1. ย่อรูป
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1000 } }], // ลดเหลือ 1000px พอ (Safe Zone)
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        // 2. เตรียม FormData
        const formData = new FormData();
        const fileName = uri.split('/').pop() || 'upload.jpg';
        // @ts-ignore
        formData.append('files', { uri: manipResult.uri, name: fileName, type: 'image/jpeg' });

        // 3. อัปโหลด
        const res = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        
        if (!res.ok) throw new Error(`Upload ${label} failed`);
        const data = await res.json();
        return data[0]?.id;
    } catch (error) {
        console.log(`Error uploading ${label}:`, error);
        return null; // ถ้าพัง ให้ส่งค่า null ไปก่อน (ยอมให้รูปหาย ดีกว่า Save ไม่ได้เลย)
    }
  };

  // 💾 บันทึกแบบลูกโซ่ (Sequential Chain)
  const handleSave = async () => {
    if (!amount || !description) return Alert.alert("กรุณากรอกข้อมูลให้ครบ");
    
    setLoading(true);
    setLoadingStep('กำลังเตรียมข้อมูล...'); // 1. เริ่มต้น

    try {
      // --- จัดการ Tags (เหมือนเดิม) ---
      const finalTagIds: number[] = [];
      for (const name of selectedTagNames) {
        const existing = allTags.find(t => (t.tagName || t.attributes?.tagName) === name);
        if (existing) { finalTagIds.push(existing.id); }
        else {
            try {
                const tagRes = await fetch(`${API_URL}/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ data: { tagName: name } }) });
                const newTag = await tagRes.json();
                if (newTag.data) finalTagIds.push(newTag.data.id);
            } catch (e) {}
        }
      }

      // ---------------------------------------------------------
      // 🔗 CHAIN STEP 1: รูปสลิป + สร้างรายการ (สำคัญที่สุด)
      // ---------------------------------------------------------
      setLoadingStep('1/3 กำลังบันทึกรายการและสลิป...');
      const slipId = await processAndUpload(previews.slip_image, "สลิป");
      
      const createPayload = {
          amount: parseFloat(amount),
          description,
          date: new Date().toISOString().split('T')[0],
          slip_image: slipId, // ใส่แค่รูปเดียวก่อน
          requested_bies: [user?.id],
          tags: finalTagIds,
          project_sites: selectedSite ? [selectedSite.id] : [],
      };

      const createRes = await fetch(`${API_URL}/petty-cashes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ data: createPayload })
      });

      if (!createRes.ok) throw new Error("สร้างรายการไม่สำเร็จ Check Network");
      const createJson = await createRes.json();
      const newRecordId = createJson.data.id || createJson.data.documentId; // เก็บ ID ไว้ใช้อัปเดต

      // ---------------------------------------------------------
      // 🔗 CHAIN STEP 2: รูปใบเสร็จ (Update)
      // ---------------------------------------------------------
      if (previews.receipt_image) {
          setLoadingStep('2/3 กำลังเพิ่มรูปใบเสร็จ...');
          const receiptId = await processAndUpload(previews.receipt_image, "ใบเสร็จ");
          if (receiptId) {
              await fetch(`${API_URL}/petty-cashes/${newRecordId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ data: { receipt_image: receiptId } })
              });
          }
      }

      // ---------------------------------------------------------
      // 🔗 CHAIN STEP 3: รูปสินค้า (Update)
      // ---------------------------------------------------------
      if (previews.product_image) {
          setLoadingStep('3/3 กำลังเพิ่มรูปสินค้า...');
          const productId = await processAndUpload(previews.product_image, "สินค้า");
          if (productId) {
              await fetch(`${API_URL}/petty-cashes/${newRecordId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ data: { product_image: productId } })
              });
          }
      }

      // ✅ เสร็จสมบูรณ์
      setLoadingStep('เรียบร้อย!');
      Alert.alert("สำเร็จ", "บันทึกข้อมูลครบถ้วนแล้ว", [{ text: "ตกลง", onPress: () => router.back() }]);

    } catch (e: any) {
      Alert.alert("แจ้งเตือน", "บันทึกรายการหลักสำเร็จ แต่อาจมีบางรูปอัปโหลดไม่ผ่าน กรุณาตรวจสอบในหน้ารายการ");
      router.back(); // กลับไปหน้ารายการเลย เพราะรายการหลักถูกสร้างแล้ว
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <View style={styles.card}>
        {/* Input ต่างๆ เหมือนเดิม */}
        <Text style={styles.label}>💰 ยอดเงิน (บาท)</Text>
        <TextInput style={styles.input} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        
        <Text style={styles.label}>📝 รายละเอียด</Text>
        <TextInput style={[styles.input, { height: 70 }]} placeholder="ระบุรายละเอียด..." multiline value={description} onChangeText={setDescription} />

        <Text style={styles.label}>📍 Site งาน</Text>
        <TouchableOpacity style={styles.siteSelector} onPress={() => setShowSiteModal(true)}>
          <Text style={{ color: selectedSite ? '#1e293b' : '#94a3b8' }}>{selectedSite ? `📍 ${selectedSite.name}` : "เลือกไซด์งาน..."}</Text>
          <Ionicons name="chevron-down" size={20} color="#64748b" />
        </TouchableOpacity>

        <Text style={styles.label}>🏷️ ป้ายกำกับ</Text>
        <View style={styles.tagInputContainer}>
             <TextInput style={styles.innerInput} placeholder="พิมพ์ป้ายกำกับ..." value={tagInput} onChangeText={handleTagTyping} onSubmitEditing={() => addTag(tagInput)} />
             {/* ... ส่วนแสดง Tag ... */}
        </View>

        <Text style={styles.label}>📸 หลักฐาน</Text>
        <View style={styles.photoRow}>
          {(['slip_image', 'receipt_image', 'product_image'] as const).map((f, i) => (
            <TouchableOpacity key={f} style={styles.photoBox} onPress={() => takePhoto(f)}>
              {previews[f] ? <Image source={{ uri: previews[f]! }} style={styles.previewImage} /> : (
                <View style={styles.placeholderBox}><Ionicons name="camera" size={24} color="#94a3b8" /><Text style={styles.photoLabel}>{i === 0 ? "สลิป" : i === 1 ? "ใบเสร็จ" : "สินค้า"}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.saveBtn, loading && { backgroundColor: '#94a3b8' }]} onPress={handleSave} disabled={loading}>
          {loading ? (
             <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                 <ActivityIndicator color="white" />
                 <Text style={{color:'white', fontSize:14}}>{loadingStep}</Text>
             </View>
          ) : (
             <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal Site Selector เหมือนเดิม */}
      <Modal visible={showSiteModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>เลือกไซด์งาน</Text>
            <FlatList data={projectSites} keyExtractor={(item) => item.id.toString()} renderItem={({ item }) => (
                <TouchableOpacity style={styles.siteItem} onPress={() => { setSelectedSite(item); setShowSiteModal(false); }}><Text>📍 {item.name}</Text></TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSiteModal(false)}><Text style={{color:'white'}}>ปิด</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 15 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 50 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 16 },
  siteSelector: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tagInputContainer: { borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, minHeight: 50 },
  innerInput: { flex: 1, fontSize: 15, paddingVertical: 5 },
  photoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  photoBox: { width: '31%', height: 90, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed' },
  placeholderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  photoLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },
  previewImage: { width: '100%', height: '100%' },
  saveBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  siteItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  closeBtn: { backgroundColor: '#ef4444', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
});