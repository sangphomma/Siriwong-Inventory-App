import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, FlatList, Image, TouchableOpacity, 
  StyleSheet, TextInput, ActivityIndicator, Alert, ScrollView 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, BASE_URL } from '../../constants/Config';
import { useAuth } from '../../contexts/AuthContext';

export default function ProductListScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // --- State ข้อมูล ---
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State การกรองและค้นหา (จากไฟล์เก่า) ---
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedCategory, setSelectedCategory] = useState("all"); 
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'stockAsc' | 'stockDesc'>('name');

  // โหลดข้อมูลทุกครั้งที่หน้าจอนี้ถูกเปิด (เผื่อกลับมาจากหน้า Edit)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      // 1. ดึงสินค้าทั้งหมด
      const resProducts = await fetch(`${API_URL}/products?populate=*&pagination[pageSize]=1000`);
      const jsonProducts = await resProducts.json();
      setProducts(jsonProducts.data || []);

      // 2. ดึงหมวดหมู่
      const resCats = await fetch(`${API_URL}/categories`);
      const jsonCats = await resCats.json();
      setCategories(jsonCats.data || []);
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🧠 Logic สุดฉลาด: กรองและเรียงข้อมูลอัตโนมัติ (useMemo)
  const processedProducts = useMemo(() => {
    let result = [...products];

    // 1. กรองตามหมวดหมู่ (รองรับทั้ง id และ documentId)
    if (selectedCategory !== 'all') {
      result = result.filter(p => 
        (p.category?.documentId === selectedCategory) || (p.category?.id === selectedCategory)
      );
    }

    // 2. ค้นหาจากชื่อ
    if (searchQuery) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 3. กรองของใกล้หมด
    if (showLowStockOnly) {
      result = result.filter(p => p.stock <= 5);
    }

    // 4. เรียงลำดับ
    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'stockAsc') {
      result.sort((a, b) => a.stock - b.stock);
    } else if (sortBy === 'stockDesc') {
      result.sort((a, b) => b.stock - a.stock);
    }

    return result;
  }, [products, selectedCategory, searchQuery, showLowStockOnly, sortBy]);

  // เมนูเรียงลำดับ
  const showSortMenu = () => {
    Alert.alert("จัดเรียงตาม", "เลือกรูปแบบการแสดงผล", [
        { text: "ชื่อ (ก-ฮ)", onPress: () => setSortBy('name') },
        { text: "สต็อก (น้อย -> มาก)", onPress: () => setSortBy('stockAsc') },
        { text: "สต็อก (มาก -> น้อย)", onPress: () => setSortBy('stockDesc') },
        { text: "ยกเลิก", style: "cancel" }
    ]);
  };

  // 🛡️ ยามเฝ้าประตู (จัดการสินค้า)
  const handlePressItem = (item: any) => {
    if (user?.position !== 'owner' && user?.position !== 'store_keeper') {
       Alert.alert(
         "📦 ข้อมูลสินค้า",
         `ชื่อ: ${item.name}\nจำนวน: ${item.stock} ชิ้น\nหมวดหมู่: ${item.category?.name || '-'}`,
         [{ text: "รับทราบ" }]
       );
       return;
    }

    Alert.alert(
      "จัดการสินค้า",
      `"${item.name}"`,
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
            text: "✏️ แก้ไข / ลบ", 
            onPress: () => router.push(`/product/edit/${item.documentId || item.id}` as any) 
        }
      ]
    );
  };



  const renderItem = ({ item }: { item: any }) => {
    const imageUrl = item.image?.url 
      ? (item.image.url.startsWith('http') ? item.image.url : `${BASE_URL}${item.image.url}`)
      : null;

    // 📍 ส่วนที่เพิ่ม: เตรียมข้อมูลจุดจัดเก็บมาแสดง
    const stockLocations = item.stock_locations || [];

    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePressItem(item)}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Ionicons name="image-outline" size={30} color="#ccc" />
          </View>
        )}
        
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.category}>{item.category?.name || 'ทั่วไป'}</Text>
          
          {/* 📍 เพิ่มการแสดงจุดจัดเก็บตัวอย่างในการ์ด */}
          <View style={styles.locationList}>
            {stockLocations.length > 0 ? (
              stockLocations.map((loc: any, idx: number) => (
                <Text key={idx} style={styles.locationSmallText}>
                   📍 {loc.location?.name}: {loc.on_hand_stock}
                </Text>
              ))
            ) : (
              <Text style={styles.noLocationText}>⚠️ ยังไม่ได้ลงทะเบียนจุดเก็บ</Text>
            )}
          </View>

          <Text style={[styles.stock, item.stock <= 5 ? {color: '#dc2626'} : {color: '#16a34a'}]}>
             คงเหลือรวม: {item.stock}
          </Text>
        </View>

        <View style={styles.actionIcon}>
            <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* 🔍 ส่วน Filter ด้านบน */}
      <View style={styles.filterSection}>
        {/* แถวที่ 1: ค้นหา + ปุ่มเรียง */}
        <View style={styles.searchRow}>
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
            <TouchableOpacity style={styles.sortBtn} onPress={showSortMenu}>
                <Ionicons name="filter" size={24} color="#00796B" />
            </TouchableOpacity>
        </View>

        {/* แถวที่ 2: ปุ่มของใกล้หมด + หมวดหมู่ */}
        <View style={styles.categoryRow}>
            <TouchableOpacity 
                style={[styles.lowStockBtn, showLowStockOnly && styles.lowStockBtnActive]}
                onPress={() => setShowLowStockOnly(!showLowStockOnly)}
            >
                <Ionicons name={showLowStockOnly ? "checkmark-circle" : "alert-circle-outline"} size={18} color={showLowStockOnly ? "white" : "#dc2626"} />
                <Text style={[styles.lowStockText, showLowStockOnly && {color: 'white'}]}>ของใกล้หมด</Text>
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginLeft: 10}}>
                <TouchableOpacity 
                    style={[styles.catBadge, selectedCategory === 'all' && styles.catBadgeActive]}
                    onPress={() => setSelectedCategory('all')}
                >
                    <Text style={[styles.catText, selectedCategory === 'all' && styles.catTextActive]}>ทั้งหมด</Text>
                </TouchableOpacity>
                
                {categories.map((cat) => (
                    <TouchableOpacity 
                        key={cat.id}
                        style={[styles.catBadge, (selectedCategory === cat.documentId || selectedCategory === cat.id) && styles.catBadgeActive]}
                        onPress={() => setSelectedCategory(cat.documentId || cat.id)}
                    >
                        <Text style={[styles.catText, (selectedCategory === cat.documentId || selectedCategory === cat.id) && styles.catTextActive]}>
                            {cat.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      </View>

      {/* รายการสินค้า */}
      {loading ? (
        <ActivityIndicator size="large" color="#00796B" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={processedProducts}
          keyExtractor={(item: any) => item.documentId || item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>ไม่พบสินค้าที่ค้นหา</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  
  // Filter Styles
  filterSection: { backgroundColor: 'white', padding: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 10, paddingHorizontal: 10, height: 45 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  sortBtn: { width: 45, height: 45, backgroundColor: '#E0F2F1', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  lowStockBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 35, borderRadius: 20, borderWidth: 1, borderColor: '#dc2626', backgroundColor: '#fff' },
  lowStockBtnActive: { backgroundColor: '#dc2626' },
  lowStockText: { color: '#dc2626', fontSize: 13, fontWeight: 'bold', marginLeft: 5 },
  
  catBadge: { paddingHorizontal: 15, height: 35, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8, justifyContent: 'center' },
  catBadgeActive: { backgroundColor: '#00796B' },
  catText: { color: '#666', fontSize: 13 },
  catTextActive: { color: 'white', fontWeight: 'bold' },


  locationList: { marginTop: 5, marginBottom: 5 },
  locationSmallText: { fontSize: 11, color: '#64748b', marginBottom: 2 },
  noLocationText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' },

  // Card Styles
  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 10, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  image: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  category: { fontSize: 12, color: '#888', marginTop: 2 },
  stock: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  actionIcon: { padding: 5 }
});