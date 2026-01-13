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

interface MasterLocation { id: number; documentId: string; name: string; }
interface StockRecord { id: number; documentId: string; on_hand_stock: number; location?: MasterLocation; }

export default function ReturnDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  const { token, user } = useAuth(); // ✅ เอา user มาด้วย เพื่อบันทึกว่าใครทำรายการ

  const [returnReq, setReturnReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [allLocations, setAllLocations] = useState<MasterLocation[]>([]);
  const [existingStockMap, setExistingStockMap] = useState<Record<string, StockRecord>>({});
  const [allocations, setAllocations] = useState<Record<number, MasterLocation>>({});
  const [showLocModal, setShowLocModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  useEffect(() => {
    if (id) fetchDetail(id as string);
  }, [id]);

  const generateKey = (prodId: number, locId: number) => `${prodId}_${locId}`;

  const getQty = (item: any) => {
    const val = item.qty_request || item.amount || item.qty || 0;
    return Number(val);
  };

  const fetchDetail = async (reqId: string) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch(`${API_URL}/return-requests/${reqId}?populate[items][populate]=product&populate=project_site&populate=return_by`, { headers });
      const json = await res.json();
      setReturnReq(json.data);

      const locRes = await fetch(`${API_URL}/locations`, { headers });
      const locJson = await locRes.json();
      setAllLocations(locJson.data || []);

      if (json.data?.items) {
        const productIds = json.data.items.map((i: any) => i.product.documentId);
        const queryParams = productIds.map((pid: string, idx: number) => `filters[product][documentId][$in][${idx}]=${pid}`).join('&');
        const stockRes = await fetch(`${API_URL}/stock-locations?${queryParams}&populate[location][fields][0]=id&populate[location][fields][1]=name&populate[product][fields][0]=id`, { headers });
        const stockJson = await stockRes.json();
        
        const map: Record<string, StockRecord> = {};
        stockJson.data.forEach((s: any) => {
            if (s.product?.id && s.location?.id) {
                const key = generateKey(s.product.id, s.location.id);
                map[key] = s;
            }
        });
        setExistingStockMap(map);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLocation = (loc: MasterLocation) => {
    if (currentItem) {
      setAllocations(prev => ({ ...prev, [currentItem.id]: loc }));
      setShowLocModal(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!returnReq) return;
    const pending = returnReq.items.filter((i: any) => !allocations[i.id]);
    if (pending.length > 0) return Alert.alert("แจ้งเตือน", "กรุณาระบุว่าจะเก็บสินค้าเข้าที่ไหน ให้ครบทุกรายการ");

    const invalidQty = returnReq.items.some((i: any) => getQty(i) <= 0);
    if (invalidQty) return Alert.alert("ข้อมูลผิดพลาด", "พบรายการสินค้าที่มีจำนวนเป็น 0");

    Alert.alert("ยืนยันรับของคืน", "สต็อกจะเพิ่มขึ้นและบันทึกประวัติทันที", [
        { text: "ยกเลิก", style: "cancel" },
        { text: "ยืนยัน", onPress: executeReturn }
    ]);
  };

  const executeReturn = async () => {
    setProcessing(true);
    try {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        for (const item of returnReq.items) {
            const targetLoc = allocations[item.id]; 
            const prodId = item.product.id; 
            const locId = targetLoc.id;
            const qtyToAdd = getQty(item);

            if (qtyToAdd <= 0) continue;

            // 1. Update Stock
            const key = generateKey(prodId, locId);
            const existingRecord = existingStockMap[key];

            if (existingRecord) {
                const newStock = (existingRecord.on_hand_stock || 0) + qtyToAdd;
                await fetch(`${API_URL}/stock-locations/${existingRecord.documentId}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ data: { on_hand_stock: newStock } })
                });
            } else {
                await fetch(`${API_URL}/stock-locations`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        data: {
                            product: prodId,  
                            location: locId,  
                            on_hand_stock: qtyToAdd
                        }
                    })
                });
            }

            // ✅ 2. Record Transaction (IN)
            if (token) {
                await createTransaction({
                    token,
                    productId: prodId,
                    locationId: locId,
                    type: 'in', // รับเข้า
                    amount: qtyToAdd,
                    docNo: returnReq.job_no,
                    userId: user?.id, // คนกดรับ (Store)
                    remark: `รับคืนจากไซท์: ${returnReq.project_site?.name || '-'}`
                });
            }
        }

        // 3. Update Status
        await fetch(`${API_URL}/return-requests/${returnReq.documentId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ data: { return_status: 'approved' } })
        });

        Alert.alert("สำเร็จ", "รับของคืนและบันทึกประวัติเรียบร้อย", [{ text: "ตกลง", onPress: () => router.back() }]);

    } catch (error) {
        console.error(error);
        Alert.alert("Error", "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
        setProcessing(false);
    }
  };

  const getCurrentStock = (prodId: number, locId: number) => {
    const key = generateKey(prodId, locId);
    return existingStockMap[key]?.on_hand_stock || 0;
  };

  if (loading || !returnReq) return <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>;
  const isApproved = returnReq.return_status === 'approved';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#78350f" /></TouchableOpacity>
        <Text style={styles.headerTitle}>ตรวจสอบการคืนของ</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
            <Text style={styles.jobNo}>{returnReq.job_no}</Text>
            <Text style={{marginTop:5}}>🏗️ ไซท์: {returnReq.project_site?.name}</Text>
            <Text>👤 คืนโดย: {returnReq.return_by?.username}</Text>
            {returnReq.note && <Text style={styles.note}>Note: {returnReq.note}</Text>}
        </View>

        <Text style={styles.sectionTitle}>รายการสินค้า ({returnReq.items.length})</Text>

        {returnReq.items.map((item: any, index: number) => {
            const allocated = allocations[item.id];
            const displayQty = getQty(item);

            return (
                <View key={index} style={styles.itemCard}>
                    <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                        <View style={{flex:1}}>
                            <Text style={styles.itemName}>{item.product.name}</Text>
                            <Text style={{color:'#d97706', fontSize:12}}>สภาพ: {item.condition}</Text>
                        </View>
                        <Text style={[styles.qty, displayQty <= 0 && {color: '#ef4444'}]}>
                            {displayQty > 0 ? `+${displayQty}` : 'Error (0)'} {item.product.unit}
                        </Text>
                    </View>

                    <View style={{marginTop:10, paddingTop:10, borderTopWidth:1, borderTopColor:'#eee'}}>
                         <Text style={{fontSize:12, color:'#666', marginBottom:5}}>📥 เก็บเข้าที่ (Location):</Text>
                         {!isApproved ? (
                            <TouchableOpacity 
                                style={[styles.selectBtn, allocated && {borderColor:'#10b981', backgroundColor:'#ecfdf5'}]}
                                onPress={() => { setCurrentItem(item); setShowLocModal(true); }}
                            >
                                <Text style={{color: allocated ? '#059669' : '#666', fontWeight: allocated ? 'bold' : 'normal'}}>
                                    {allocated ? `✅ ${allocated.name}` : "แตะเพื่อเลือกจุดจัดเก็บ"}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#666" />
                            </TouchableOpacity>
                         ) : (
                             <View style={styles.approvedBox}>
                                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                                <Text style={{color:'#059669', fontSize:13, marginLeft:5}}>รับเข้าคลังเรียบร้อย</Text>
                             </View>
                         )}
                    </View>
                </View>
            );
        })}
      </ScrollView>

      {!isApproved && (
        <View style={styles.footer}>
            <TouchableOpacity 
                style={[styles.confirmBtn, processing && {backgroundColor:'#9ca3af'}]} 
                onPress={handleConfirmReturn}
                disabled={processing}
            >
                {processing ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>✅ ยืนยันรับของเข้าคลัง</Text>}
            </TouchableOpacity>
        </View>
      )}

      <Modal visible={showLocModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>เลือกจุดเก็บของ</Text>
                <Text style={{textAlign:'center', marginBottom:5, color:'#d97706'}}>{currentItem?.product.name}</Text>
                
                <FlatList
                    data={allLocations}
                    keyExtractor={(i) => i.id.toString()}
                    style={{maxHeight: 300}}
                    renderItem={({item}) => {
                        const currentStock = currentItem ? getCurrentStock(currentItem.product.id, item.id) : 0;
                        const isNew = currentStock === 0;

                        return (
                            <TouchableOpacity style={styles.locItem} onPress={() => handleSelectLocation(item)}>
                                <View>
                                    <Text style={{fontWeight:'bold', color:'#333'}}>{item.name}</Text>
                                    <Text style={{fontSize:11, color: isNew ? '#3b82f6' : '#059669'}}>
                                        {isNew ? '(สร้างกองใหม่)' : `มีอยู่เดิม: ${currentStock}`}
                                    </Text>
                                </View>
                                {isNew ? <Ionicons name="add-circle-outline" size={24} color="#3b82f6" /> : <Ionicons name="layers-outline" size={24} color="#059669" />}
                            </TouchableOpacity>
                        );
                    }}
                    ListEmptyComponent={<Text style={{textAlign:'center', color:'#999', padding:20}}>ไม่พบ Location</Text>}
                />
                <TouchableOpacity style={{marginTop:15, padding:10, alignItems:'center', backgroundColor:'#f3f4f6', borderRadius:8}} onPress={() => setShowLocModal(false)}>
                    <Text style={{color:'#666'}}>ปิดหน้าต่าง</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#78350f' },
  content: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15 },
  jobNo: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  note: { marginTop: 8, color: '#d97706', fontStyle: 'italic', backgroundColor:'#fff7ed', padding:8, borderRadius:6 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400e', marginBottom: 10 },
  itemCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  qty: { fontSize: 18, fontWeight: 'bold', color: '#059669' },
  selectBtn: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb' },
  approvedBox: { flexDirection:'row', alignItems:'center', backgroundColor:'#ecfdf5', padding:10, borderRadius:8 },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#fde68a' },
  confirmBtn: { backgroundColor: '#059669', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '85%', padding: 20, borderRadius: 15, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  locItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});