import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, ActivityIndicator, Modal, FlatList, SafeAreaView 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../../../constants/Config'; 
import { useAuth } from '../../../contexts/AuthContext'; 
// ✅ Import Helper
import { createTransaction } from '../../../utils/transactionHelper';

// --- Interfaces ---
interface StockLocation {
  id: number;
  documentId: string;
  name?: string;
  location?: { name: string };
  on_hand_stock: number;
}

interface RequestItem {
  id: number;
  qty_request: number;
  product: {
    id: number;
    documentId: string;
    name: string;
    unit?: string;
  };
}

interface RequestDetail {
  id: number;
  documentId: string;
  job_no: string;
  request_status: string;
  note?: string;
  project_site?: { name: string };
  request_by?: { username: string };
  items: RequestItem[];
}

export default function RequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  const { token, user } = useAuth(); // ✅ เอา user มาด้วย

  // --- State ---
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // เก็บสต็อกที่มีให้เลือกของแต่ละสินค้า: { [productId]: StockLocation[] }
  const [availableStocks, setAvailableStocks] = useState<Record<string, StockLocation[]>>({});

  // เก็บการจับคู่ว่า Item ไหน เอาจาก Location ไหน: { [itemId]: StockLocation }
  const [allocations, setAllocations] = useState<Record<number, StockLocation>>({});

  // UI Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentSelectingItem, setCurrentSelectingItem] = useState<RequestItem | null>(null);

  // --- 1. Fetch Data ---
  useEffect(() => {
    if (id) {
        fetchRequestDetail(id as string);
    }
  }, [id]);

  const fetchRequestDetail = async (reqId: string) => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch(`${API_URL}/withdrawal-requests/${reqId}?populate[items][populate]=product&populate=project_site&populate=request_by`, { headers });
      const json = await res.json();
      const reqData = json.data;

      if (!reqData) throw new Error("ไม่พบข้อมูลใบเบิก");
      setRequest(reqData);

      if (reqData.items && reqData.items.length > 0) {
          const productIds = reqData.items.map((i: any) => i.product.documentId);
          const queryParams = productIds.map((pid: string, idx: number) => `filters[product][documentId][$in][${idx}]=${pid}`).join('&');
          
          const stockRes = await fetch(`${API_URL}/stock-locations?${queryParams}&populate=location&populate=product&pagination[limit]=100`, { headers });
          const stockJson = await stockRes.json();
          const stocks = stockJson.data || [];

          const stockMap: Record<string, StockLocation[]> = {};
          stocks.forEach((s: any) => {
            if (s.on_hand_stock > 0) {
                const pId = s.product?.documentId;
                if (!stockMap[pId]) stockMap[pId] = [];
                stockMap[pId].push(s);
            }
          });
          setAvailableStocks(stockMap);
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Selection Logic ---
  const handleOpenSelectLocation = (item: RequestItem) => {
    setCurrentSelectingItem(item);
    setShowLocationModal(true);
  };

  const handleSelectLocation = (location: StockLocation) => {
    if (currentSelectingItem) {
      setAllocations(prev => ({
        ...prev,
        [currentSelectingItem.id]: location
      }));
      setShowLocationModal(false);
      setCurrentSelectingItem(null);
    }
  };

  const getLocationName = (loc: StockLocation) => {
    return loc.location?.name || loc.name || `Loc #${loc.id}`;
  };

  // --- 3. Approval Logic (Core) ---
  const handleApprove = async () => {
    if (!request) return;

    const pendingItems = request.items.filter(item => !allocations[item.id]);
    if (pendingItems.length > 0) {
      Alert.alert("แจ้งเตือน", "กรุณาระบุจุดหยิบของ (Location) ให้ครบทุกรายการก่อนอนุมัติครับ");
      return;
    }

    for (const item of request.items) {
        const loc = allocations[item.id];
        if (loc.on_hand_stock < item.qty_request) {
            Alert.alert("สต็อกไม่พอ", `สินค้า ${item.product.name} ที่ ${getLocationName(loc)} มีไม่พอจ่าย`);
            return;
        }
    }

    Alert.alert(
      "ยืนยันการอนุมัติ", 
      "ระบบจะตัดสต็อกและบันทึกประวัติทันที",
      [
        { text: "ยกเลิก", style: "cancel" },
        { text: "อนุมัติทันที", onPress: executeApproval }
      ]
    );
  };

  const executeApproval = async () => {
    if (!request) return;
    setProcessing(true);
    try {
        const headers = { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
        };

        // Step 1: วนลูปตัดสต็อกทีละรายการ + บันทึก Transaction
        for (const item of request.items) {
            const location = allocations[item.id];
            const newStock = location.on_hand_stock - item.qty_request;

            // Update Stock Location (PUT)
            await fetch(`${API_URL}/stock-locations/${location.documentId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    data: { on_hand_stock: newStock }
                })
            });

            // ✅✅✅ บันทึก Transaction (OUT) ✅✅✅
            if (token) {
                await createTransaction({
                    token,
                    productId: item.product.id,
                    locationId: location.id,
                    type: 'out',
                    amount: item.qty_request,
                    docNo: request.job_no,
                    userId: user?.id,
                    remark: `อนุมัติให้: ${request.request_by?.username} (Site: ${request.project_site?.name || '-'})`
                });
            }
        }

        // Step 2: อัปเดตสถานะ Request เป็น approved
        const updateRes = await fetch(`${API_URL}/withdrawal-requests/${request.documentId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                data: { request_status: 'approved' }
            })
        });

        if (updateRes.ok) {
            Alert.alert("สำเร็จ", "อนุมัติใบเบิกและบันทึกประวัติเรียบร้อยแล้ว", [
                { text: "ตกลง", onPress: () => router.back() }
            ]);
        } else {
            throw new Error("อัปเดตสถานะไม่สำเร็จ");
        }

    } catch (error) {
        console.error(error);
        Alert.alert("Error", "เกิดข้อผิดพลาดในการตัดสต็อก");
    } finally {
        setProcessing(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;
  if (!request) return <View style={styles.center}><Text>ไม่พบข้อมูลใบเบิก</Text></View>;
  const isApproved = request.request_status === 'approved';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>ตรวจสอบใบเบิก</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
            <View style={styles.rowBetween}>
                <Text style={styles.jobNo}>{request.job_no}</Text>
                <View style={[styles.badge, { backgroundColor: isApproved ? '#dcfce7' : '#fef3c7' }]}>
                    <Text style={{color: isApproved ? '#166534' : '#b45309', fontSize:12, fontWeight:'bold'}}>
                        {request.request_status.toUpperCase()}
                    </Text>
                </View>
            </View>
            <View style={styles.infoRow}>
                <Ionicons name="person" size={16} color="#64748b" />
                <Text style={styles.infoText}> ผู้เบิก: {request.request_by?.username || 'ไม่ระบุ'}</Text>
            </View>
            <View style={styles.infoRow}>
                <Ionicons name="business" size={16} color="#64748b" />
                <Text style={styles.infoText}> ไซท์งาน: {request.project_site?.name || '-'}</Text>
            </View>
            {request.note && (
                <View style={styles.noteBox}>
                    <Text style={styles.noteText}>Note: {request.note}</Text>
                </View>
            )}
        </View>

        <Text style={styles.sectionTitle}>รายการสินค้า ({request.items.length})</Text>

        {request.items.map((item, index) => {
            const allocatedLoc = allocations[item.id];
            const productStocks = availableStocks[item.product.documentId] || [];
            const hasStock = productStocks.length > 0;

            return (
                <View key={index} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                        <View style={{flex:1}}>
                            <Text style={styles.itemName}>{item.product.name}</Text>
                            <Text style={{fontSize:12, color:'#64748b'}}>รหัสสินค้า: {item.product.documentId.slice(0,8)}...</Text>
                        </View>
                        <Text style={styles.reqQty}>x {item.qty_request} {item.product.unit}</Text>
                    </View>
                    
                    <View style={styles.actionArea}>
                        <Text style={styles.actionLabel}>📍 ตัดจากคลัง (Store Location):</Text>
                        {!isApproved ? (
                            <TouchableOpacity 
                                style={[
                                    styles.selectLocBtn, 
                                    !hasStock && { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
                                    allocatedLoc && { backgroundColor: '#f0fdf4', borderColor: '#22c55e' }
                                ]}
                                onPress={() => hasStock && handleOpenSelectLocation(item)}
                                disabled={!hasStock}
                            >
                                {allocatedLoc ? (
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <Ionicons name="checkmark-circle" size={18} color="#166534" />
                                        <Text style={[styles.selectLocText, {color:'#166534', fontWeight:'bold'}]}>
                                            {' '}{getLocationName(allocatedLoc)}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', flex:1}}>
                                        <Text style={[styles.selectLocText, !hasStock && {color:'#ef4444'}]}>
                                            {hasStock ? "แตะเพื่อระบุจุดหยิบของ" : "❌ สินค้าหมดสต็อก"}
                                        </Text>
                                        {hasStock && <Ionicons name="chevron-down" size={18} color="#64748b" />}
                                    </View>
                                )}
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.approvedLocBox}>
                                <Ionicons name="lock-closed" size={14} color="#64748b" />
                                <Text style={{color:'#64748b', fontSize:13, marginLeft:5}}>ตัดสต็อกแล้ว</Text>
                            </View>
                        )}
                    </View>
                </View>
            );
        })}
        <View style={{height: 100}} /> 
      </ScrollView>

      {!isApproved && (
          <View style={styles.footer}>
            <TouchableOpacity 
                style={[styles.approveBtn, processing && {backgroundColor:'#94a3b8'}]} 
                onPress={handleApprove}
                disabled={processing}
            >
                {processing ? <ActivityIndicator color="white"/> : <Text style={styles.approveText}>✅ ยืนยันอนุมัติ (ตัดสต็อก)</Text>}
            </TouchableOpacity>
          </View>
      )}

      <Modal visible={showLocationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>เลือกจุดหยิบสินค้า</Text>
                <Text style={styles.modalSubTitle}>{currentSelectingItem?.product.name}</Text>
                <Text style={{marginBottom:15, textAlign:'center', color:'#64748b'}}>
                    ต้องการ: <Text style={{fontWeight:'bold', color:'#ef4444'}}>{currentSelectingItem?.qty_request} {currentSelectingItem?.product.unit}</Text>
                </Text>

                <FlatList
                    data={currentSelectingItem ? availableStocks[currentSelectingItem.product.documentId] : []}
                    keyExtractor={(item) => item.id.toString()}
                    style={{maxHeight: 250}}
                    renderItem={({item}) => {
                        const requestQty = currentSelectingItem?.qty_request || 0;
                        const isEnough = item.on_hand_stock >= requestQty;
                        
                        return (
                            <TouchableOpacity 
                                style={[styles.locOption, !isEnough && {opacity: 0.6}]}
                                onPress={() => isEnough && handleSelectLocation(item)}
                                disabled={!isEnough}
                            >
                                <View>
                                    <Text style={styles.locName}>{getLocationName(item)}</Text>
                                    <View style={{flexDirection:'row', alignItems:'center'}}>
                                        <Text style={[styles.locStock, !isEnough && {color:'#ef4444'}]}>
                                            มี: {item.on_hand_stock}
                                        </Text>
                                        {!isEnough && <Text style={{fontSize:12, color:'#ef4444', marginLeft:5}}>(ไม่พอ)</Text>}
                                    </View>
                                </View>
                                {isEnough && <Ionicons name="add-circle" size={28} color="#6366f1" />}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={<Text style={{textAlign:'center', padding:20, color:'#999'}}>ไม่พบข้อมูลสต็อก</Text>}
                />
                
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowLocationModal(false)}>
                    <Text style={{color:'#64748b'}}>ยกเลิก</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 20, elevation: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  jobNo: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 15, color: '#475569', marginLeft: 8 },
  noteBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  noteText: { fontSize: 14, color: '#6366f1', fontStyle: 'italic' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 10 },
  itemCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'flex-start' },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  reqQty: { fontSize: 18, fontWeight: 'bold', color: '#ef4444' },
  actionArea: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  actionLabel: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  selectLocBtn: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, backgroundColor: '#f8fafc', flexDirection: 'row' },
  selectLocText: { fontSize: 14, color: '#334155' },
  approvedLocBox: { flexDirection:'row', alignItems:'center', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  approveBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  approveText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', borderRadius: 16, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 },
  modalSubTitle: { fontSize: 16, color: '#6366f1', textAlign: 'center', marginBottom: 15, fontWeight: '600' },
  locOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  locName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  locStock: { fontSize: 14, color: '#64748b' },
  closeBtn: { marginTop: 15, alignItems: 'center', padding: 12, backgroundColor: '#f1f5f9', borderRadius: 8 }
});