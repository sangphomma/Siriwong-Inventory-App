import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, RefreshControl, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// ✅ เพิ่มบรรทัดนี้ (Import มาใช้)
import { API_URL } from '../../constants/Config';

export default function ProductListScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 🔍 State สำหรับการกรองและค้นหา
  const [searchQuery, setSearchQuery] = useState(""); // คำค้นหา
  const [selectedCategory, setSelectedCategory] = useState("all"); // หมวดหมู่
  const [showLowStockOnly, setShowLowStockOnly] = useState(false); // กรองเฉพาะของใกล้หมด
  const [sortBy, setSortBy] = useState<'name' | 'stockAsc' | 'stockDesc'>('name'); // การเรียงลำดับ

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
      // ดึงมาทั้งหมดก่อน (client-side filtering เร็วกว่าสำหรับสินค้าหลักร้อย/พันต้นๆ)
      const res = await fetch(`${API_URL}/products?populate=*&pagination[pageSize]=1000&t=${Date.now()}`);
      const json = await res.json();
      setProducts(json.data);
    } catch (error) {
      console.log("Error fetching products");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  // 🧠 Logic สุดฉลาด: กรองและเรียงข้อมูล (ทำงานอัตโนมัติเมื่อตัวแปรเปลี่ยน)
  const processedProducts = useMemo(() => {
    let result = [...products];

    // 1. กรองตามหมวดหมู่
    if (selectedCategory !== 'all') {
        result = result.filter(p => p.category?.documentId === selectedCategory);
    }

    // 2. ค้นหาจากชื่อ (Search)
    if (searchQuery) {
        result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // 3. กรองเฉพาะของใกล้หมด (Low Stock < 5)
    if (showLowStockOnly) {
        result = result.filter(p => p.stock <= 5);
    }

    // 4. เรียงลำดับ (Sort)
    if (sortBy === 'name') {
        result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'stockAsc') {
        result.sort((a, b) => a.stock - b.stock); // น้อยไปมาก
    } else if (sortBy === 'stockDesc') {
        result.sort((a, b) => b.stock - a.stock); // มากไปน้อย
    }

    return result;
  }, [products, selectedCategory, searchQuery, showLowStockOnly, sortBy]);


  const handlePressProduct = (item: any) => {
    Alert.alert(
        "จัดการสินค้า", 
        `"${item.name}"`, 
        [
            { text: "ยกเลิก", style: "cancel" },
            { text: "✏️ แก้ไข / ลบ", onPress: () => router.push(`/product/edit/${item.documentId}` as any) },
            { text: "📦 เติมสต็อก (+)", onPress: () => router.push(`/product/restock/${item.documentId}` as any) },
        ]
    );
  };

  // เมนูเลือกการเรียงลำดับ
  const showSortMenu = () => {
    Alert.alert("จัดเรียงตาม", "เลือกรูปแบบการเรียงข้อมูล", [
        { text: "ชื่อ (ก-ฮ)", onPress: () => setSortBy('name') },
        { text: "สต็อก (น้อย -> มาก)", onPress: () => setSortBy('stockAsc') },
        { text: "สต็อก (มาก -> น้อย)", onPress: () => setSortBy('stockDesc') },
        { text: "ยกเลิก", style: "cancel" }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>📋 เช็คสต็อก ({processedProducts.length})</Text>
        <TouchableOpacity onPress={showSortMenu}>
            <Ionicons name="filter" size={24} color="#4f46e5" />
        </TouchableOpacity>
      </View>

      {/* 🔍 ส่วน Search และ Filter */}
      <View style={styles.filterSection}>
        {/* ช่องค้นหา */}
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput 
                style={styles.searchInput} 
                placeholder="ค้นหาชื่อสินค้า..." 
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
            )}
        </View>

        {/* ปุ่มลัด: แสดงเฉพาะของใกล้หมด */}
        <TouchableOpacity 
            style={[styles.lowStockBtn, showLowStockOnly && styles.lowStockBtnActive]}
            onPress={() => setShowLowStockOnly(!showLowStockOnly)}
        >
            <Ionicons name={showLowStockOnly ? "checkmark-circle" : "alert-circle-outline"} size={20} color={showLowStockOnly ? "white" : "#dc2626"} />
            <Text style={[styles.lowStockText, showLowStockOnly && {color:'white'}]}>ของใกล้หมด</Text>
        </TouchableOpacity>
      </View>

      {/* หมวดหมู่ (ย่อขนาดลงหน่อยให้ไม่เกะกะ) */}
      <View style={{height: 50}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity style={[styles.catBadge, selectedCategory === 'all' && styles.catBadgeActive]} onPress={() => setSelectedCategory('all')}>
                <Text style={[styles.catText, selectedCategory === 'all' && styles.catTextActive]}>ทั้งหมด</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
                <TouchableOpacity key={cat.documentId} style={[styles.catBadge, selectedCategory === cat.documentId && styles.catBadgeActive]} onPress={() => setSelectedCategory(cat.documentId)}>
                    <Text style={[styles.catText, selectedCategory === cat.documentId && styles.catTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      {/* รายการสินค้า */}
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {processedProducts.length === 0 ? (
            <Text style={{textAlign:'center', marginTop: 50, color:'#999'}}>ไม่พบสินค้าที่ค้นหา</Text>
        ) : (
            processedProducts.map((item) => (
                <TouchableOpacity 
                    key={item.documentId} 
                    style={styles.card}
                    onPress={() => handlePressProduct(item)}
                >
                    <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                        <View style={[styles.stockIndicator, {backgroundColor: item.stock <= 5 ? '#fee2e2' : '#dcfce7'}]}>
                             <Ionicons name="cube" size={16} color={item.stock <= 5 ? '#dc2626' : '#16a34a'} />
                        </View>
                        <View>
                            <Text style={styles.productName}>{item.name}</Text>
                            <Text style={styles.categoryName}>{item.category?.name || 'ทั่วไป'}</Text>
                        </View>
                    </View>
                    
                    <View style={{alignItems:'flex-end'}}>
                        <Text style={{fontSize:12, color:'#999'}}>คงเหลือ</Text>
                        <Text style={[
                            styles.stockNumber, 
                            item.stock <= 5 ? {color:'#dc2626'} : {color:'#16a34a'}
                        ]}>
                            {item.stock}
                        </Text>
                    </View>
                </TouchableOpacity>
            ))
        )}
        <View style={{height: 40}}/>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', padding: 20, paddingTop: 50, backgroundColor: 'white', alignItems: 'center', justifyContent:'space-between', borderBottomWidth:1, borderColor:'#f1f5f9' },
  title: { fontSize: 18, fontWeight: 'bold' },
  
  filterSection: { padding: 15, backgroundColor: 'white', gap: 10 },
  searchBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 10, alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  
  lowStockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent:'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#dc2626', gap: 5, backgroundColor: '#fef2f2' },
  lowStockBtnActive: { backgroundColor: '#dc2626' },
  lowStockText: { color: '#dc2626', fontWeight: 'bold' },

  catBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20, backgroundColor: '#e5e7eb', marginRight: 8, height: 32, justifyContent:'center' },
  catBadgeActive: { backgroundColor: '#4f46e5' },
  catText: { color: '#374151', fontSize: 13 },
  catTextActive: { color: 'white', fontWeight: 'bold' },

  content: { flex: 1, padding: 15 },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, elevation: 1 },
  stockIndicator: { width: 30, height: 30, borderRadius: 15, justifyContent:'center', alignItems:'center' },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  categoryName: { fontSize: 12, color: '#666' },
  stockNumber: { fontSize: 20, fontWeight: 'bold' }
});