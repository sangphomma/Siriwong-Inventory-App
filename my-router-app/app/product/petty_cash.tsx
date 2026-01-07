import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  
  const [projectSites, setProjectSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showSiteModal, setShowSiteModal] = useState(false);

  const [allTags, setAllTags] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // ✅ คืนชีพ preview ครบทั้ง 3 ฟิลด์
  const [previews, setPreviews] = useState<{
    slip_image: string | null; receipt_image: string | null; product_image: string | null;
  }>({ slip_image: null, receipt_image: null, product_image: null });

  useEffect(() => {
    fetch(`${API_URL}/tags`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(json => setAllTags(json.data || []));

    // ✅ ดึงเฉพาะ Active Sites ตัวเล็ก
    fetch(`${API_URL}/project-sites?filters[project_status][$eq]=active&sort=name:asc`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(json => setProjectSites(json.data || []));
  }, []);

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
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5 });
    if (!result.canceled) setPreviews(prev => ({ ...prev, [field]: result.assets[0].uri }));
  };

  const uploadToStrapi = async (uri: string | null, label: string) => {
    if (!uri) return null;
    const formData = new FormData();
    const fileName = uri.split('/').pop() || 'image.jpg';
    formData.append('files', { uri: uri, name: fileName, type: 'image/jpeg' } as any);
    const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
    if (!res.ok) throw new Error(`อัปโหลด ${label} ไม่สำเร็จ`);
    const data = await res.json(); return data[0]?.id;
  };

  const handleSave = async () => {
    if (!amount || !description) return Alert.alert("กรุณากรอกข้อมูลให้ครบ");
    try {
      setLoading(true);
      const finalTagIds: number[] = [];
      for (const name of selectedTagNames) {
        const existing = allTags.find(t => (t.tagName || t.attributes?.tagName) === name);
        if (existing) finalTagIds.push(existing.id);
        else {
          const tagRes = await fetch(`${API_URL}/tags`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ data: { tagName: name } }) });
          const newTag = await tagRes.json(); if (newTag.data) finalTagIds.push(newTag.data.id);
        }
      }

      // ✅ อัปโหลดครบทั้ง 3 ชุด
      const slipId = await uploadToStrapi(previews.slip_image, "สลิป");
      const receiptId = await uploadToStrapi(previews.receipt_image, "ใบเสร็จ");
      const productId = await uploadToStrapi(previews.product_image, "สินค้า");

      const res = await fetch(`${API_URL}/petty-cashes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          data: {
            amount: parseFloat(amount),
            description,
            date: new Date().toISOString().split('T')[0],
            slip_image: slipId, receipt_image: receiptId, product_image: productId,
            requested_bies: [user?.id],
            tags: finalTagIds,
            project_sites: selectedSite ? [selectedSite.id] : [],
          }
        })
      });

      if (res.ok) Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อย", [{ text: "ตกลง", onPress: () => router.back() }]);
    } catch (e: any) { Alert.alert("ผิดพลาด", e.message); } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="always">
      <View style={styles.card}>
        <Text style={styles.label}>💰 ยอดเงิน (บาท)</Text>
        <TextInput style={styles.input} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        
        <Text style={styles.label}>📝 รายละเอียด</Text>
        <TextInput style={[styles.input, { height: 70 }]} placeholder="ระบุรายละเอียด..." multiline value={description} onChangeText={setDescription} />

        <Text style={styles.label}>📍 Site งาน (เฉพาะที่ Active)</Text>
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
          {/* ✅ วนลูปสร้างกล่องรับรูปภาพให้ครบ 3 กล่องครับ */}
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
            <Text style={styles.modalTitle}>เลือกไซด์งาน (Active)</Text>
            <FlatList
              data={projectSites}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.siteItem} onPress={() => { setSelectedSite(item); setShowSiteModal(false); }}>
                  <Text style={styles.siteItemText}>📍 {item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{textAlign:'center', padding:20, color:'#94a3b8'}}>ไม่พบไซด์งานที่เปิดอยู่</Text>}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSiteModal(false)}><Text style={{color:'white', fontWeight:'bold'}}>ยกเลิก</Text></TouchableOpacity>
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