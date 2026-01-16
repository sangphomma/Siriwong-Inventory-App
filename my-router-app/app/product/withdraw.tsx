import React, { useState, useCallback, useMemo } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, 
  Alert, Modal, FlatList, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { API_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';
import { createTransaction } from '../../utils/transactionHelper';

// --- Interfaces ---
interface Category { documentId: string; name: string; }

interface RealLocation {
    id: number;
    documentId: string;
    name: string; 
}

interface StockLocation { 
    id: number; 
    documentId?: string;
    on_hand_stock: number; 
    location?: RealLocation; 
    product?: { documentId: string; id: number }; 
}

interface Product { 
  documentId: string; 
  id: number;
  name: string; 
  unit?: string;
  category?: Category; 
  real_stock?: number; 
}

interface CartItem { 
  product: Product; 
  location: StockLocation; 
  amount: number; 
}

interface User {
    id: number;
    username: string;
    email: string;
}

// ✅ เพิ่ม Interface ProjectSite
interface ProjectSite {
  documentId: string;
  id: number;
  name: string;
}

export default function WithdrawScreen() {
  const router = useRouter();
  const { token, user } = useAuth();

  // --- Data State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]); 
  const [sites, setSites] = useState<ProjectSite[]>([]); // ✅ เก็บรายการ Site
  const [activeStocks, setActiveStocks] = useState<StockLocation[]>([]); 
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedSite, setSelectedSite] = useState<ProjectSite | null>(null); // ✅ เก็บ Site ที่เลือก

  // --- Modals ---
  const [showProductModal, setShowProductModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false); // ✅ Modal เลือก Site
  
  const [tempSelectedProduct, setTempSelectedProduct] = useState<Product | null>(null);
  const [productSpecificLocations, setProductSpecificLocations] = useState<StockLocation[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchInitialData();
    }, [])
  );

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true);
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const stockQuery = [
        `filters[on_hand_stock][$gt]=0`, 
        `populate[location][fields][0]=name`, 
        `populate[product][fields][0]=name`, 
        `pagination[limit]=2000`
      ].join('&');

      const [resCats, resProds, resStocks, resUsers, resSites] = await Promise.all([
        fetch(`${API_URL}/categories`, { headers }),
        fetch(`${API_URL}/products?populate=*&pagination[pageSize]=1000`, { headers }),
        fetch(`${API_URL}/stock-locations?${stockQuery}`, { headers }),
        fetch(`${API_URL}/users`, { headers }),
        fetch(`${API_URL}/project-sites?filters[project_status][$eq]=active`, { headers }) // ✅ ดึง Site
      ]);

      const jsonCats = await resCats.json();
      const jsonProds = await resProds.json();
      const jsonStocks = await resStocks.json();
      const jsonUsers = await resUsers.json(); 
      const jsonSites = await resSites.json();

      const rawProducts = jsonProds.data || [];
      const rawStocks = jsonStocks.data || [];
      const rawUsers = Array.isArray(jsonUsers) ? jsonUsers : (jsonUsers.data || []);

      const mappedProducts = rawProducts.map((p: Product) => {
          const myStocks = rawStocks.filter((s: any) => 
            (s.product?.documentId === p.documentId) || (s.product?.id === p.id)
          );
          const totalStock = myStocks.reduce((sum: number, s: any) => sum + (s.on_hand_stock || 0), 0);
          return { ...p, real_stock: totalStock }; 
      });

      setCategories(jsonCats.data || []);
      setProducts(mappedProducts);
      setActiveStocks(rawStocks);
      setUsers(rawUsers);
      setSites(jsonSites.data || []); // ✅ Set Sites

    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setTempSelectedProduct(product);
    setShowProductModal(false);
    
    const availableLocs = activeStocks.filter((s: any) => 
        (s.product?.documentId === product.documentId) || (s.product?.id === product.id)
    );

    if (availableLocs.length === 0) {
      Alert.alert("สินค้าหมด", "ไม่พบสินค้าใน Location ใดเลย");
      setTempSelectedProduct(null);
    } else {
      setProductSpecificLocations(availableLocs);
      setShowLocationModal(true); 
    }
  };

  const addToCart = (stockLoc: StockLocation) => {
    if (!tempSelectedProduct) return;

    const existingIndex = cart.findIndex(c => 
      c.product.documentId === tempSelectedProduct.documentId && 
      c.location.id === stockLoc.id
    );

    if (existingIndex >= 0) {
      Alert.alert("ซ้ำ", "เลือกรายการนี้ไปแล้วครับ");
      return;
    }

    const newItem: CartItem = {
      product: tempSelectedProduct,
      location: stockLoc,
      amount: 1 
    };

    setCart([...cart, newItem]);
    setShowLocationModal(false);
    setTempSelectedProduct(null);
    setSearchQuery("");
  };

  const updateCartQty = (index: number, change: number) => {
    const newCart = [...cart];
    const item = newCart[index];
    const newAmount = item.amount + change;

    if (newAmount > item.location.on_hand_stock) return; 
    if (newAmount < 1) return;

    item.amount = newAmount;
    setCart(newCart);
  };

  const getLocationName = (loc: any) => {
    if (loc?.name) return loc.name; 
    if (loc?.location?.name) return loc.location.name; 
    if (loc?.location?.attributes?.name) return loc.location.attributes.name;
    return `Location #${loc?.id || 'Unknown'}`;
  };

// ... (ส่วนบนของไฟล์ withdraw.tsx เหมือนเดิม) ...

 // ... imports และ code ส่วนอื่นคงเดิม

  const handleConfirmWithdrawal = async () => {
    if (!selectedUser) return Alert.alert("ข้อมูลไม่ครบ", "กรุณาเลือกผู้เบิกสินค้าครับ");
    if (!selectedSite) return Alert.alert("ข้อมูลไม่ครบ", "กรุณาเลือกไซท์งานที่จะนำของไปใช้ครับ");
    if (cart.length === 0) return Alert.alert("แจ้งเตือน", "ตะกร้ายังว่างอยู่");

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const withdrawalItemIds: string[] = []; // เก็บ Document ID
      const currentCart = [...cart];
      const userNameStr = selectedUser.username; 
      const siteNameStr = selectedSite.name; 
      const docNo = `EXP-${new Date().getTime()}`; 

      console.log("--- เริ่มต้นการบันทึก ---");

      // Loop ทำรายการทีละชิ้น
      for (const item of cart) {
        const newStock = item.location.on_hand_stock - item.amount;
        
        // 1. ตัดสต็อก (PUT)
        await fetch(`${API_URL}/stock-locations/${item.location.documentId || item.location.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            data: { on_hand_stock: newStock } 
          })
        });

        // 2. บันทึก Transaction (Log)
        if (token) {
            const masterLocationId = item.location.location?.id; 
            if (masterLocationId) {
                await createTransaction({
                    token,
                    productId: item.product.id,
                    locationId: masterLocationId,
                    type: 'out',
                    amount: item.amount,
                    docNo: docNo,
                    userId: user?.id,
                    remark: `เบิกด่วนหน้าเคาน์เตอร์: ${userNameStr} (Site: ${siteNameStr})`
                });
            }
        }

        // 3. สร้าง Withdrawal Item (เขียนแบบละเอียดเพื่อดัก Error)
        const itemRes = await fetch(`${API_URL}/withdrawal-items`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              data: { 
                amount: item.amount, 
                product: item.product.documentId, // ใช้ Document ID ของ Product
                location_snapshot: getLocationName(item.location),
                publishedAt: new Date(), 
              } 
            })
        });

        const itemJson = await itemRes.json();
        
        if (!itemRes.ok) {
            console.error("Item Create Error:", itemJson);
            throw new Error(`สร้างรายการสินค้าไม่ผ่าน: ${item.product.name}`);
        }

        // ✅ ดึง ID ที่ถูกต้อง (Strapi V5 ใช้ documentId เป็นหลัก)
        const createdId = itemJson.data?.documentId || itemJson.data?.id;
        if (createdId) {
            withdrawalItemIds.push(createdId);
            console.log(`✅ สร้าง Item สำเร็จ ID: ${createdId}`);
        }
      }

      console.log("📦 เตรียมสร้าง Order ด้วย IDs:", withdrawalItemIds);

      // 4. สร้าง Withdrawal Order
      const orderPayload = { 
        data: { 
          user_name: userNameStr, 
          date: today, 
          withdrawal_items: withdrawalItemIds, // ส่ง Array ของ IDs ไปผูก
          type: 'express_counter',
          note: `นำไปใช้ที่: ${siteNameStr}`,
          publishedAt: new Date(), 
        } 
      };

      const orderRes = await fetch(`${API_URL}/withdrawal-orders`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(orderPayload)
      });

      const orderJson = await orderRes.json();

      // 🛑 จุดตาย: เช็คว่า Server ตอบกลับมาว่า OK ไหม?
      if (!orderRes.ok) {
          console.error("❌ Order Create Error:", JSON.stringify(orderJson));
          // แสดง Error จาก Server ให้เรารู้
          const serverMsg = orderJson.error?.message || "Unknown Error";
          throw new Error(`สร้าง Order ไม่สำเร็จ: ${serverMsg}`);
      }

      console.log("✅ สร้าง Order สำเร็จ:", orderJson);

      setCart([]);
      setSelectedUser(null);
      setSelectedSite(null);
      
      Alert.alert(
        "✅ สำเร็จสมบูรณ์!", 
        "ตัดสต็อกและสร้างใบเบิกเรียบร้อยแล้ว",
        [
          { text: "ปิด", onPress: () => fetchInitialData() }, 
          { text: "🖨️ PDF", onPress: () => { generatePdf(currentCart, userNameStr, siteNameStr, today); fetchInitialData(); } }
        ]
      );

    } catch (error: any) {
      console.error("Withdraw Error:", error);
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ... (ส่วนล่างของไฟล์ withdraw.tsx เหมือนเดิม) ...

  // ✅ เพิ่ม siteName เข้ามาใน PDF
  const generatePdf = async (items: CartItem[], user: string, siteName: string, date: string) => {
    try {
        const htmlContent = `
        <html>
          <body style="font-family:Helvetica; padding:20px;">
            <div style="border: 2px solid #333; padding: 20px; border-radius: 10px;">
                <h2 style="text-align:center; color: #333;">ใบเบิกสินค้า (Store Counter)</h2>
                <hr/>
                <div style="margin-bottom:20px; font-size: 16px;">
                    <p><b>วันที่:</b> ${date}</p>
                    <p><b>ผู้เบิก:</b> ${user}</p>
                    <p><b>นำไปใช้ที่ (Site):</b> ${siteName}</p> 
                </div>
                
                <table style="width:100%; border-collapse:collapse; margin-top:10px; font-size:14px;">
                    <tr style="background:#4f46e5; color:white;">
                        <th style="border:1px solid #ddd; padding:10px;">ลำดับ</th>
                        <th style="border:1px solid #ddd; padding:10px;">รายการสินค้า</th>
                        <th style="border:1px solid #ddd; padding:10px;">หยิบจากคลัง</th>
                        <th style="border:1px solid #ddd; padding:10px;">จำนวน</th>
                    </tr>
                    ${items.map((item, idx) => `
                        <tr>
                            <td style="border:1px solid #ddd; padding:8px; text-align:center;">${idx+1}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${item.product.name}</td>
                            <td style="border:1px solid #ddd; padding:8px;">${getLocationName(item.location)}</td>
                            <td style="border:1px solid #ddd; padding:8px; text-align:center; font-weight:bold;">${item.amount}</td>
                        </tr>
                    `).join('')}
                </table>
                <br/>
                <p style="text-align:right; margin-top:50px;">ลงชื่อผู้รับของ .......................................................</p>
            </div>
          </body>
        </html>
        `;
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {}
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category?.documentId === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [products, selectedCategory, searchQuery]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        <Text style={styles.headerTitle}>🛍️ เบิกด่วน (หน้า Counter)</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        
        {/* ส่วนเลือกข้อมูลหลัก */}
        <View style={styles.card}>
            <Text style={styles.label}>👤 ผู้เบิกสินค้า *</Text>
            <TouchableOpacity 
                style={styles.pickerBtn} 
                onPress={() => setShowUserModal(true)}
            >
                <Text style={[styles.pickerText, !selectedUser && {color: '#94a3b8'}]}>
                    {selectedUser ? selectedUser.username : "-- แตะเพื่อเลือกชื่อผู้เบิก --"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>

            <View style={{height: 15}} />

            {/* ✅ เพิ่มปุ่มเลือก Site */}
            <Text style={styles.label}>🏗️ นำไปใช้ที่ (Project Site) *</Text>
            <TouchableOpacity 
                style={styles.pickerBtn} 
                onPress={() => setShowSiteModal(true)}
            >
                <Text style={[styles.pickerText, !selectedSite && {color: '#94a3b8'}]}>
                    {selectedSite ? selectedSite.name : "-- แตะเพื่อเลือกไซท์งาน --"}
                </Text>
                <Ionicons name="business" size={20} color="#64748b" />
            </TouchableOpacity>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>🛒 รายการที่จะเบิก ({cart.length})</Text>
          <TouchableOpacity onPress={() => setShowProductModal(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ เพิ่มสินค้า</Text>
          </TouchableOpacity>
        </View>

        {cart.map((item, index) => {
            const isMaxStock = item.amount >= item.location.on_hand_stock;

            return (
              <View key={index} style={styles.cartItem}>
                <View style={{flex:1}}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <View style={{flexDirection:'row', alignItems:'center', marginTop:4}}>
                    <Ionicons name="location-sharp" size={14} color="#00796B" />
                    <Text style={styles.locationTag}> {getLocationName(item.location)}</Text>
                  </View>
                  {isMaxStock && <Text style={{fontSize:10, color:'#ef4444', marginTop:2}}>*ครบจำนวนที่มีแล้ว ({item.location.on_hand_stock})</Text>}
                </View>
                
                <View style={styles.qtyControl}>
                    <TouchableOpacity onPress={() => updateCartQty(index, -1)} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={16} color="white" />
                    </TouchableOpacity>
                    
                    <Text style={styles.qtyText}>{item.amount}</Text>
                    
                    <TouchableOpacity 
                        onPress={() => updateCartQty(index, 1)} 
                        style={[styles.qtyBtn, isMaxStock && {backgroundColor: '#e2e8f0'}]} 
                        disabled={isMaxStock}
                    >
                        <Ionicons name="add" size={16} color={isMaxStock ? '#94a3b8' : 'white'} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setCart(cart.filter((_, i) => i !== index))} style={{marginLeft: 10}}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
        })}

        {cart.length === 0 && (
          <View style={styles.emptyCart}>
             <Ionicons name="cart-outline" size={40} color="#cbd5e1" />
             <Text style={{color: '#94a3b8', marginTop: 5}}>ยังไม่มีรายการในตะกร้า</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, (loading || cart.length === 0 || !selectedUser || !selectedSite) && {backgroundColor: '#94a3b8'}]} 
          onPress={handleConfirmWithdrawal} 
          disabled={loading || cart.length === 0 || !selectedUser || !selectedSite}
        >
          {loading ? <ActivityIndicator color="white"/> : <Text style={styles.submitText}>✅ ตัดสต็อกทันที</Text>}
        </TouchableOpacity>
      </View>

      {/* Product Modal */}
      <Modal visible={showProductModal} animationType="slide">
        <SafeAreaView style={{flex:1, backgroundColor: 'white'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowProductModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
                <Text style={styles.modalTitle}>เลือกสินค้า</Text>
                <View style={{width:28}}/>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                <TouchableOpacity style={[styles.catTab, selectedCategory === 'all' && styles.catTabActive]} onPress={() => setSelectedCategory('all')}>
                    <Text style={[styles.catText, selectedCategory === 'all' && styles.catTextActive]}>ทั้งหมด</Text>
                </TouchableOpacity>
                {categories.map(c => (
                    <TouchableOpacity key={c.documentId} style={[styles.catTab, selectedCategory === c.documentId && styles.catTabActive]} onPress={() => setSelectedCategory(c.documentId)}>
                        <Text style={[styles.catText, selectedCategory === c.documentId && styles.catTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput style={styles.searchBar} placeholder="ค้นหาชื่อสินค้า..." value={searchQuery} onChangeText={setSearchQuery} />
            </View>

            {initialLoading ? <ActivityIndicator style={{marginTop:20}} color="#00796B" /> : (
            <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.documentId || item.id.toString()}
                renderItem={({item}) => {
                    const stock = item.real_stock || 0;
                    const isOutOfStock = stock <= 0;
                    
                    return (
                        <TouchableOpacity 
                            style={[styles.productRow, isOutOfStock && styles.productRowDisabled]} 
                            onPress={() => handleProductSelect(item)}
                            disabled={isOutOfStock}
                        >
                            <View style={{flex: 1}}>
                                <Text style={[styles.productRowName, isOutOfStock && {color: '#ef4444'}]}>
                                    {item.name}
                                </Text>
                                <View style={{flexDirection:'row', gap:10, marginTop:4}}>
                                   {isOutOfStock ? (
                                      <Text style={{color:'#ef4444', fontSize:12, fontWeight:'bold'}}>❌ สินค้าหมด (0)</Text>
                                   ) : (
                                      <Text style={{color:'#059669', fontSize:12}}>✅ มีของ {stock} {item.unit || 'ชิ้น'}</Text>
                                   )}
                                </View>
                            </View>
                            {isOutOfStock ? null : <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />}
                        </TouchableOpacity>
                    );
                }}
            />
            )}
        </SafeAreaView>
      </Modal>

      {/* Location Modal */}
      <Modal visible={showLocationModal} transparent animationType="fade">
         <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitleCenter}>📍 เลือกจุดหยิบสินค้า</Text>
                <Text style={styles.productSubTitle}>{tempSelectedProduct?.name}</Text>
                
                <ScrollView style={{maxHeight: 300, marginBottom: 15}}>
                    {productSpecificLocations.map((loc) => (
                        <TouchableOpacity 
                            key={loc.id} 
                            style={styles.locItem} 
                            onPress={() => addToCart(loc)}
                        >   
                             <View style={{flex: 1}}>
                                <Text style={styles.locName}>{getLocationName(loc)}</Text>
                                <Text style={styles.locStock}>จำนวน: {loc.on_hand_stock} {tempSelectedProduct?.unit || 'ชิ้น'}</Text>
                             </View>
                             <View style={styles.addLocBtn}>
                                <Ionicons name="add" size={24} color="white" />
                             </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowLocationModal(false)}>
                    <Text style={{color: '#64748b'}}>ยกเลิก</Text>
                </TouchableOpacity>
            </View>
         </View>
      </Modal>

      {/* User Modal */}
      <Modal visible={showUserModal} animationType="slide">
        <SafeAreaView style={{flex:1, backgroundColor: 'white'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowUserModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
                <Text style={styles.modalTitle}>เลือกผู้เบิกสินค้า</Text>
                <View style={{width:28}}/>
            </View>
            <FlatList 
                data={users}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{padding: 10}}
                renderItem={({item}) => (
                    <TouchableOpacity 
                        style={styles.productRow} 
                        onPress={() => {
                            setSelectedUser(item);
                            setShowUserModal(false);
                        }}
                    >
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <View style={{width:40, height:40, borderRadius:20, backgroundColor:'#e0f2f1', justifyContent:'center', alignItems:'center', marginRight:15}}>
                                <Ionicons name="person" size={20} color="#00796B" />
                            </View>
                            <View>
                                <Text style={{fontSize:16, fontWeight:'bold', color:'#333'}}>{item.username}</Text>
                                <Text style={{fontSize:12, color:'#666'}}>{item.email}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
      </Modal>

      {/* ✅ Site Modal (เพิ่มใหม่) */}
      <Modal visible={showSiteModal} animationType="slide">
        <SafeAreaView style={{flex:1, backgroundColor: 'white'}}>
            <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowSiteModal(false)}><Ionicons name="close" size={28} /></TouchableOpacity>
                <Text style={styles.modalTitle}>เลือกไซท์งาน / โครงการ</Text>
                <View style={{width:28}}/>
            </View>
            <FlatList 
                data={sites}
                keyExtractor={(item) => (item.documentId || item.id).toString()}
                contentContainerStyle={{padding: 10}}
                renderItem={({item}) => (
                    <TouchableOpacity 
                        style={styles.productRow} 
                        onPress={() => {
                            setSelectedSite(item);
                            setShowSiteModal(false);
                        }}
                    >
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <View style={{width:40, height:40, borderRadius:8, backgroundColor:'#e0e7ff', justifyContent:'center', alignItems:'center', marginRight:15}}>
                                <Ionicons name="business" size={20} color="#4f46e5" />
                            </View>
                            <Text style={{fontSize:16, fontWeight:'bold', color:'#333'}}>{item.name}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600', color: '#475569' },
  pickerBtn: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, backgroundColor: '#f8fafc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 16, color: '#333' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  addBtn: { backgroundColor: '#00796B', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  cartItem: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 10, marginBottom: 8, alignItems: 'center' },
  itemName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  locationTag: { fontSize: 13, color: '#00796B', fontWeight: '500' }, 
  qtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 },
  qtyBtn: { backgroundColor: '#94a3b8', width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  qtyText: { paddingHorizontal: 10, fontWeight: 'bold', fontSize: 14, minWidth: 30, textAlign: 'center' },
  emptyCart: { alignItems: 'center', padding: 40, borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10 },
  footer: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  submitBtn: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 12, alignItems: 'center' },
  submitText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  catScroll: { maxHeight: 50, marginVertical: 10, paddingHorizontal: 10 },
  catTab: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, height: 35 },
  catTabActive: { backgroundColor: '#4f46e5' },
  catText: { fontSize: 13, color: '#64748b' },
  catTextActive: { color: 'white', fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', margin: 10, paddingHorizontal: 10, borderRadius: 8 },
  searchBar: { flex: 1, padding: 10 },
  productRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productRowDisabled: { backgroundColor: '#fef2f2' },
  productRowName: { fontSize: 16, color: '#333', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', width: '90%', borderRadius: 15, padding: 20 },
  modalTitleCenter: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  productSubTitle: { textAlign: 'center', color: '#6366f1', marginBottom: 20, fontWeight: 'bold', fontSize: 15 },
  locItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor:'#fff' },
  locName: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
  locStock: { fontSize: 13, color: '#059669', marginTop: 4 },
  addLocBtn: { backgroundColor: '#00796B', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation:2 },
  closeModalBtn: { marginTop: 15, padding: 12, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8 }
});