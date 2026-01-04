import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ✅ เพิ่มบรรทัดนี้ (Import มาใช้)
import { API_URL } from '../../constants/Config';

interface Category { documentId: string; name: string; }
interface Product { documentId: string; name: string; stock: number; category?: Category; }
interface CartItem { product: Product; amount: number; }

export default function WithdrawScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [amount, setAmount] = useState("1");
  const [userName, setUserName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchProducts();
    }, [])
  );

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/categories`);
      const json = await res.json();
      setCategories(json.data);
    } catch (error) {}
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products?populate=*&t=${Date.now()}`);
      const json = await res.json();
      setProducts(json.data);
    } catch (error) {}
  };

  const displayedProducts = selectedCategory === "all"
    ? products
    : products.filter((p) => p.category?.documentId === selectedCategory);

  const addToCart = () => {
    if (!selectedProduct) return Alert.alert("แจ้งเตือน", "กรุณาเลือกสินค้าก่อน");
    const qty = parseInt(amount);
    if (isNaN(qty) || qty <= 0) return Alert.alert("แจ้งเตือน", "จำนวนต้องมากกว่า 0");
    if (qty > selectedProduct.stock) return Alert.alert("แจ้งเตือน", `ของไม่พอ (เหลือ ${selectedProduct.stock})`);

    // เช็คว่ามีของซ้ำในตะกร้าไหม ถ้ามีให้บวกเพิ่ม
    const existingIndex = cart.findIndex(c => c.product.documentId === selectedProduct.documentId);
    if (existingIndex >= 0) {
        const newCart = [...cart];
        newCart[existingIndex].amount += qty;
        setCart(newCart);
    } else {
        const newItem = { product: selectedProduct, amount: qty };
        setCart([...cart, newItem]);
    }
    
    setSelectedProduct(null);
    setAmount("1");
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  // 🖨️ ฟังก์ชันสร้าง PDF
  const generatePdf = async (items: CartItem[], user: string, date: string) => {
    try {
        // สร้าง HTML สำหรับใบเบิก
        const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
                body { font-family: 'Helvetica', sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .title { font-size: 24px; font-weight: bold; color: #333; }
                .subtitle { font-size: 14px; color: #666; }
                .info-box { border: 1px solid #ddd; padding: 10px; margin-bottom: 20px; background-color: #f9f9f9; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #eee; }
                .footer { margin-top: 40px; display: flex; justify-content: space-between; }
                .sign-box { text-align: center; width: 45%; }
                .line { border-bottom: 1px solid #000; margin-bottom: 5px; height: 30px; }
            </style>
          </head>
          <body>
            <div class="header">
                <div class="title">📄 ใบเบิกวัสดุ/อุปกรณ์</div>
                <div class="subtitle">ระบบจัดการสต็อกสินค้าภายใน (Inventory System)</div>
            </div>

            <div class="info-box">
                <b>วันที่เบิก:</b> ${date}<br>
                <b>ผู้เบิก:</b> ${user}
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 10%;">#</th>
                        <th>รายการสินค้า</th>
                        <th style="width: 20%; text-align: center;">จำนวน</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.product.name}</td>
                            <td style="text-align: center;">${item.amount}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="footer">
                <div class="sign-box">
                    <div class="line"></div>
                    <div>( ${user} )</div>
                    <div>ผู้เบิกสินค้า</div>
                </div>
                <div class="sign-box">
                    <div class="line"></div>
                    <div>( ........................... )</div>
                    <div>ผู้อนุมัติ/จ่ายของ</div>
                </div>
            </div>
          </body>
        </html>
        `;

        // สร้างไฟล์ PDF
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        
        // แชร์ไฟล์ (เพื่อให้ User กด Save หรือ Print)
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    } catch (error) {
        Alert.alert("Error", "สร้าง PDF ไม่สำเร็จ");
    }
  };

  const handleConfirm = async () => {
    if (!userName) return Alert.alert("แจ้งเตือน", "ระบุชื่อผู้เบิกด้วยครับ");
    if (cart.length === 0) return Alert.alert("แจ้งเตือน", "ตะกร้ายังว่างอยู่");

    setIsLoading(true);
    try {
      const today = new Date().toLocaleDateString('th-TH');
      const itemIds = [];
      const currentCart = [...cart]; // จำค่าตะกร้าไว้ก่อนล้าง เพื่อเอาไปทำ PDF

      // 1. บันทึกลง Server
      for (const item of cart) {
        const newStock = item.product.stock - item.amount;
        await fetch(`${API_URL}/products/${item.product.documentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { stock: newStock } })
        });
        const resItem = await fetch(`${API_URL}/withdrawal-items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { amount: item.amount, product: item.product.documentId } })
        });
        const jsonItem = await resItem.json();
        if(jsonItem.data) itemIds.push(jsonItem.data.documentId);
      }

      await fetch(`${API_URL}/withdrawal-orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: { user_name: userName, date: new Date().toISOString().split('T')[0], withdrawal_items: itemIds } })
      });

      // 2. เคลียร์ค่า
      setCart([]);
      setUserName("");
      fetchProducts();
      
      // 3. ถามเรื่อง PDF
      Alert.alert(
          "✅ เบิกสำเร็จ!", 
          "ต้องการพิมพ์ใบเบิกสินค้า หรือบันทึก PDF เก็บไว้หรือไม่?",
          [
              { text: "ไม่พิมพ์", style: "cancel" },
              { 
                  text: "🖨️ พิมพ์ / แชร์ PDF", 
                  onPress: () => generatePdf(currentCart, userName, today) 
              }
          ]
      );
      
    } catch (error) {
      Alert.alert("Error", "เกิดข้อผิดพลาด");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>📝 เบิกสินค้า</Text>
        <View style={{width: 24}} /> 
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>หมวดหมู่สินค้า</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
            <TouchableOpacity style={[styles.catBadge, selectedCategory === 'all' && styles.catBadgeActive]} onPress={() => setSelectedCategory('all')}>
                <Text style={[styles.catText, selectedCategory === 'all' && styles.catTextActive]}>ทั้งหมด</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
                <TouchableOpacity key={cat.documentId} style={[styles.catBadge, selectedCategory === cat.documentId && styles.catBadgeActive]} onPress={() => setSelectedCategory(cat.documentId)}>
                    <Text style={[styles.catText, selectedCategory === cat.documentId && styles.catTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>1. เลือกสินค้าที่จะเบิก</Text>
        <View style={styles.productSelector}>
            {selectedProduct ? (
                <View style={styles.selectedBox}>
                    <View>
                        <Text style={styles.selectedText}>{selectedProduct.name}</Text>
                        <Text style={{color:'#666'}}>คงเหลือ: {selectedProduct.stock}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedProduct(null)} style={styles.changeBtn}><Text style={{color:'white'}}>เปลี่ยน</Text></TouchableOpacity>
                </View>
            ) : (
                <ScrollView horizontal style={styles.productList} showsHorizontalScrollIndicator={false}>
                    {displayedProducts.map((item) => {
                        const isOutOfStock = item.stock <= 0;
                        return (
                            <TouchableOpacity 
                                key={item.documentId} 
                                style={[styles.productCard, isOutOfStock && { backgroundColor: '#f3f4f6', opacity: 0.6 }]}
                                disabled={isOutOfStock}
                                onPress={() => setSelectedProduct(item)}
                            >
                                <Text style={[styles.productName, isOutOfStock && {color:'#999'}]} numberOfLines={2}>{item.name}</Text>
                                <Text style={[styles.productStock, isOutOfStock ? {color:'red'} : {color:'green'}]}>
                                    {isOutOfStock ? '❌ หมด' : `เหลือ ${item.stock}`}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>

        {selectedProduct && (
            <View style={styles.amountSection}>
                <Text style={styles.label}>ระบุจำนวน:</Text>
                <View style={styles.row}>
                    <TextInput style={styles.inputAmount} keyboardType="numeric" value={amount} onChangeText={setAmount} />
                    <TouchableOpacity style={styles.addBtn} onPress={addToCart}><Text style={styles.addBtnText}>+ ใส่ตะกร้า</Text></TouchableOpacity>
                </View>
            </View>
        )}

        <Text style={styles.sectionTitle}>🛒 รายการในตะกร้า ({cart.length})</Text>
        {cart.length === 0 ? <Text style={{textAlign:'center', color:'#999', marginVertical:20}}>...ยังไม่มีรายการ...</Text> : 
            cart.map((item, index) => (
                <View key={index} style={styles.cartItem}>
                    <Text style={{flex:1}}>{item.product.name}</Text>
                    <Text style={{fontWeight:'bold', marginRight:10}}>{item.amount} ชิ้น</Text>
                    <TouchableOpacity onPress={() => removeFromCart(index)}><Ionicons name="trash" size={20} color="red" /></TouchableOpacity>
                </View>
            ))
        }

        <Text style={styles.sectionTitle}>👤 ชื่อผู้เบิก</Text>
        <TextInput style={styles.inputName} placeholder="ระบุชื่อของคุณ..." value={userName} onChangeText={setUserName} />
        <View style={{height: 50}} /> 
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity 
            style={[styles.confirmBtn, isLoading && {backgroundColor:'#ccc'}]} 
            onPress={handleConfirm}
            disabled={isLoading}
        >
            <Text style={styles.confirmText}>{isLoading ? "กำลังบันทึก..." : "✅ ยืนยันการเบิกสินค้า"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', padding: 20, paddingTop: 50, backgroundColor: 'white', alignItems: 'center', justifyContent:'space-between' },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10, color: '#4f46e5' },
  catBadge: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb', marginRight: 8 },
  catBadgeActive: { backgroundColor: '#4f46e5' },
  catText: { color: '#374151', fontSize: 14 },
  catTextActive: { color: 'white', fontWeight: 'bold' },
  productSelector: { marginBottom: 10 },
  productList: { flexDirection: 'row', marginBottom: 10 },
  productCard: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginRight: 10, width: 140, shadowColor:'#000', shadowOpacity:0.1, elevation:2, height: 100, justifyContent:'space-between' },
  productName: { fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
  productStock: { fontSize: 12, color: 'green' },
  selectedBox: { backgroundColor: '#eef2ff', padding: 15, borderRadius: 10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  selectedText: { fontSize: 16, fontWeight:'bold', color: '#4f46e5' },
  changeBtn: { backgroundColor:'#4f46e5', paddingHorizontal:10, paddingVertical:5, borderRadius:5 },
  amountSection: { marginTop: 15 },
  label: { marginBottom: 5, color: '#666' },
  row: { flexDirection: 'row', gap: 10 },
  inputAmount: { backgroundColor: 'white', flex: 1, padding: 10, borderRadius: 8, textAlign: 'center', fontSize: 18, borderWidth:1, borderColor:'#ddd' },
  addBtn: { backgroundColor: '#4f46e5', justifyContent:'center', paddingHorizontal: 20, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: 'bold' },
  cartItem: { flexDirection:'row', backgroundColor:'white', padding:15, borderRadius:8, marginBottom:8, alignItems:'center' },
  inputName: { backgroundColor:'white', padding:15, borderRadius:8, borderWidth:1, borderColor:'#ddd' },
  bottomBar: { padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee' },
  confirmBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, alignItems: 'center' },
  confirmText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});