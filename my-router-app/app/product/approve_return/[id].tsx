import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, Modal, FlatList, SafeAreaView, TextInput 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../../constants/Config'; 
import { useAuth } from '../../../contexts/AuthContext'; 
// ✅ เรียกใช้ Helper เพื่อบันทึกลง Report
import { createTransaction } from '../../../utils/transactionHelper';

// --- Interfaces ---
interface StockLocation {
  id: number;
  documentId: string;
  name?: string;
  location?: { id: number; documentId: string; name: string };
  on_hand_stock: number;
}

interface ReturnItem {
  id: number;
  qty_request: number; 
  condition: string;
  product: {
    id: number;
    documentId: string;
    name: string;
    unit?: string;
  };
}

interface ReturnRequest {
  id: number;
  documentId: string;
  job_no: string;
  return_status: string;
  note?: string;
  project_site?: { name: string };
  return_by?: { username: string };
  items: ReturnItem[];
}

export default function ApproveReturnScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  const { token, user } = useAuth(); 

  const [returnData, setReturnData] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // State สำหรับการปฏิเสธ
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectRemark, setRejectRemark] = useState('');

  // Stock Selection
  const [availableStocks, setAvailableStocks] = useState<Record<string, StockLocation[]>>({});
  const [allocations, setAllocations] = useState<Record<number, StockLocation>>({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentSelectingItem, setCurrentSelectingItem] = useState<ReturnItem | null>(null);

  useEffect(() => {
    if (id) fetchReturnDetail(id as string);
  }, [id]);

  const fetchReturnDetail = async (reqId: string) => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch(`${API_URL}/return-requests/${reqId}?populate[items][populate]=product&populate=project_site&populate=return_by`, { headers });
      const json = await res.json();
      const data = json.data;

      if (!data) throw new Error("ไม่พบข้อมูล");
      setReturnData(data);

      // ดึงข้อมูล Stock Location มารอไว้ (เพื่อให้ User เลือกว่าจะเอาของไปเก็บคืนที่ไหน)
      if (data.items?.length > 0) {
          const productIds = data.items.map((i: any) => i.product.documentId);
          const queryParams = productIds.map((pid: string, idx: number) => `filters[product][documentId][$in][${idx}]=${pid}`).join('&');
          
          const stockRes = await fetch(`${API_URL}/stock-locations?${queryParams}&populate=location&populate=product&pagination[limit]=100`, { headers });
          const stockJson = await stockRes.json();
          const stocks = stockJson.data || [];

          const stockMap: Record<string, StockLocation[]> = {};
          stocks.forEach((s: any) => {
             const pId = s.product?.documentId;
             if (!stockMap[pId]) stockMap[pId] = [];
             stockMap[pId].push(s);
          });
          setAvailableStocks(stockMap);
      }

    } catch (error) {
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSelectLocation = (item: ReturnItem) => {
    setCurrentSelectingItem(item);
    setShowLocationModal(true);
  };

  const handleSelectLocation = (location: StockLocation) => {
    if (currentSelectingItem) {
      setAllocations(prev => ({ ...prev, [currentSelectingItem.id]: location }));
      setShowLocationModal(false);
      setCurrentSelectingItem(null);
    }
  };

  const getLocationName = (loc: StockLocation) => {
    return loc.location?.name || loc.name || `Loc #${loc.id}`;
  };

  // ✅ ฟังก์ชัน 1: อนุมัติ (รับของเข้า + บันทึก Transaction)
  const handleConfirmReturn = async () => {
    if (!returnData) return;
    
    // ต้องเลือกที่เก็บให้ครบก่อน
    const pendingItems = returnData.items.filter(item => !allocations[item.id]);
    if (pendingItems.length > 0) {
      Alert.alert("แจ้งเตือน", "กรุณาเลือกจุดเก็บของ (Location) ให้ครบทุกรายการครับ");
      return;
    }

    Alert.alert(
      "ยืนยันรับคืน", 
      "ระบบจะเพิ่มสต็อกและบันทึกประวัติลง Report",
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ยืนยัน", onPress: executeReturn }
      ]
    );
  };

  const executeReturn = async () => {
    if (!returnData) return;
    setProcessing(true);
    try {
        const headers = { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        };

        for (const item of returnData.items) {
            const targetLoc = allocations[item.id];
            // 1. เพิ่มสต็อกจริงใน Location
            const newStock = (targetLoc.on_hand_stock || 0) + item.qty_request;

            await fetch(`${API_URL}/stock-locations/${targetLoc.documentId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ data: { on_hand_stock: newStock } })
            });

            // 2. ✅ บันทึก Transaction (เพื่อให้โชว์ใน Report)
            // ต้องดึง ID ของ Location Master ออกมา
            const realLocationId = targetLoc.location?.documentId || targetLoc.location?.id;
            
            if (token && realLocationId) {
                await createTransaction({
                    token,
                    productId: item.product.documentId || item.product.id,
                    locationId: realLocationId, 
                    type: 'in', // ขาเข้า (คืนของ)
                    amount: item.qty_request,
                    docNo: returnData.job_no,
                    userId: user?.id,
                    remark: `รับคืนจาก: ${returnData.return_by?.username || 'ไม่ระบุ'} (Site: ${returnData.project_site?.name || '-'})`
                });
            }
        }

        // 3. เปลี่ยนสถานะเป็น Approved
        await fetch(`${API_URL}/return-requests/${returnData.documentId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ data: { return_status: 'approved' } })
        });

        Alert.alert("สำเร็จ", "รับของคืนเข้าสต็อกและบันทึก Report แล้ว", [
            { text: "ตกลง", onPress: () => router.back() }
        ]);

    } catch (error) {
        console.error(error);
        Alert.alert("Error", "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
        setProcessing(false);
    }
  };

  // ❌ ฟังก์ชัน 2: ปฏิเสธ (ไม่รับของ)
  const handleReject = async () => {
    if (!rejectRemark.trim()) return Alert.alert("แจ้งเตือน", "กรุณาระบุเหตุผลที่ไม่รับของคืน");

    setProcessing(true);
    try {
        await fetch(`${API_URL}/return-requests/${returnData?.documentId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
              data: { 
                return_status: 'rejected',
                note: `[ปฏิเสธ: ${rejectRemark}] ${returnData?.note || ''}` 
              } 
            })
        });
        Alert.alert("สำเร็จ", "ปฏิเสธรายการเรียบร้อย");
        router.back();
    } catch (e) {
        Alert.alert("Error", "ไม่สามารถดำเนินการได้");
    } finally {
        setProcessing(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>;
  if (!returnData) return <View style={styles.center}><Text>ไม่พบข้อมูล</Text></View>;
  
  const isApproved = returnData.return_status === 'approved';
  const isRejected = returnData.return_status === 'rejected';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#78350f" /></TouchableOpacity>
        <Text style={styles.headerTitle}>ตรวจสอบรับคืน</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
            <View style={styles.rowBetween}>
                <Text style={styles.jobNo}>{returnData.job_no}</Text>
                <View style={[styles.badge, { 
                    backgroundColor: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fff7ed' 
                }]}>
                    <Text style={{
                        color: isApproved ? '#166534' : isRejected ? '#ef4444' : '#d97706', 
                        fontSize:12, fontWeight:'bold'
                    }}>
                        {returnData.return_status.toUpperCase()}
                    </Text>
                </View>
            </View>
            <Text style={styles.infoText}>👤 คืนโดย: {returnData.return_by?.username || 'ไม่ระบุ'}</Text>
            <Text style={styles.infoText}>🏗️ จากไซท์: {returnData.project_site?.name || '-'}</Text>
            {returnData.note && <Text style={styles.noteText}>Note: {returnData.note}</Text>}
        </View>

        <Text style={styles.sectionTitle}>รายการสินค้าคืน ({returnData.items.length})</Text>

        {returnData.items.map((item, index) => {
             const allocatedLoc = allocations[item.id];
             
             return (
                <View key={index} style={styles.itemCard}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.itemName}>{item.product.name}</Text>
                        <Text style={styles.qtyText}>+{item.qty_request} {item.product.unit}</Text>
                    </View>
                    <Text style={{fontSize:12, color:'#d97706', marginBottom:8}}>สภาพ: {item.condition}</Text>
                    
                    {!isApproved && !isRejected && (
                        <>
                            <Text style={styles.label}>📥 เก็บเข้าชั้น (Location):</Text>
                            <TouchableOpacity 
                                style={[styles.selectBtn, allocatedLoc && {borderColor:'#10b981', backgroundColor:'#f0fdf4'}]}
                                onPress={() => handleOpenSelectLocation(item)}
                            >
                                {allocatedLoc ? (
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                                        <Text style={{marginLeft:5, color:'#047857', fontWeight:'bold'}}>{getLocationName(allocatedLoc)}</Text>
                                    </View>
                                ) : (
                                    <Text style={{color:'#6b7280'}}>-- เลือกจุดจัดเก็บ --</Text>
                                )}
                                <Ionicons name="chevron-down" size={16} color="#6b7280"/>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
             );
        })}
        
        {/* ส่วนปุ่มกดปฏิเสธ (ถ้าเลือก Reject Mode) */}
        {!isApproved && !isRejected && rejectMode && (
            <View style={styles.rejectBox}>
                <Text style={styles.label}>เหตุผลการปฏิเสธ:</Text>
                <View style={styles.inputBox}>
                     <TextInput 
                        placeholder="เช่น ของเสียหายใช้งานไม่ได้..." 
                        value={rejectRemark} 
                        onChangeText={setRejectRemark}
                        style={{flex:1}} 
                     />
                </View>
                <View style={{flexDirection:'row', justifyContent:'flex-end', gap:10, marginTop:10}}>
                    <TouchableOpacity onPress={() => setRejectMode(false)} style={{padding:10}}>
                        <Text style={{color:'#64748b'}}>ยกเลิก</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.smBtn, {backgroundColor:'#ef4444'}]} 
                        onPress={handleReject}
                        disabled={processing}
                    >
                        <Text style={{color:'white'}}>ยืนยันปฏิเสธ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )}

        <View style={{height: 100}}/>
      </ScrollView>

      {/* Footer Actions */}
      {!isApproved && !isRejected && !rejectMode && (
          <View style={styles.footer}>
            <View style={{flexDirection:'row', gap:10}}>
                <TouchableOpacity 
                    style={[styles.actionBtn, {backgroundColor:'#fee2e2', flex:1}]} 
                    onPress={() => setRejectMode(true)}
                    disabled={processing}
                >
                    <Text style={{color:'#ef4444', fontWeight:'bold'}}>ปฏิเสธ / ของเสีย</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.actionBtn, {backgroundColor:'#d97706', flex:2}]} 
                    onPress={handleConfirmReturn}
                    disabled={processing}
                >
                    {processing ? <ActivityIndicator color="white"/> : <Text style={styles.approveText}>📥 รับเข้าสต็อก</Text>}
                </TouchableOpacity>
            </View>
          </View>
      )}

      {/* Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>เลือกจุดจัดเก็บ</Text>
                <Text style={{textAlign:'center', color:'#d97706', marginBottom:10}}>
                    {currentSelectingItem?.product.name}
                </Text>
                <FlatList
                    data={currentSelectingItem ? availableStocks[currentSelectingItem.product.documentId] : []}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({item}) => (
                        <TouchableOpacity style={styles.locOption} onPress={() => handleSelectLocation(item)}>
                            <Text style={styles.locName}>{getLocationName(item)}</Text>
                            <Text style={{fontSize:12, color:'#6b7280'}}>มีอยู่เดิม: {item.on_hand_stock}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={<Text style={{textAlign:'center', padding:20, color:'#999'}}>ไม่มี Location เดิม (ต้องสร้างใหม่ในเว็บ)</Text>}
                />
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLocationModal(false)}>
                    <Text>ยกเลิก</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#78350f' },
  content: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobNo: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  infoText: { color: '#4b5563', marginTop: 4 },
  noteText: { color: '#d97706', marginTop: 8, fontStyle: 'italic', backgroundColor: '#fff7ed', padding: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400e', marginBottom: 10 },
  itemCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  qtyText: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 5 },
  selectBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rejectBox: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginTop: 10, borderWidth:1, borderColor:'#ef4444' },
  inputBox: { borderWidth:1, borderColor:'#e5e7eb', borderRadius:8, padding:10, backgroundColor:'#f9fafb' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  actionBtn: { padding: 15, borderRadius: 12, alignItems: 'center', justifyContent:'center' },
  smBtn: { paddingVertical:8, paddingHorizontal:15, borderRadius:8, alignItems:'center' },
  approveText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '80%', borderRadius: 12, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  locOption: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  locName: { fontSize: 16, fontWeight: 'bold' },
  closeBtn: { marginTop: 15, padding: 10, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 }
});