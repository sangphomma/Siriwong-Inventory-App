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
  const { user, token } = useAuth(); // ดึง Token มาใช้

  // --- State ข้อมูล ---
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- State การกรองและค้นหา ---
  const [searchQuery, setSearchQuery] = useState(""); 
  const [selectedCategory, setSelectedCategory] = useState("all"); 
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'stockAsc' | 'stockDesc'>('name');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [token])
  );

  const fetchData = async () => {
    try {
      if (products.length === 0) setLoading(true);

      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. ดึงหมวดหมู่
      const resCats = await fetch(`${API_URL}/categories`, { headers });
      const jsonCats = await resCats.json();
      setCategories(jsonCats.data || []);

      // 2. ดึงสินค้า (Query แบบเจาะจง Field เพื่อป้องกัน Infinite Loop)
      const queryString = [
        'populate[image][fields][0]=url',               
        'populate[category][fields][0]=name',           // ✅ หัวใจสำคัญ: เอาแค่ชื่อหมวดหมู่ ตัดวงจร Loop
        'populate[stock_locations][populate][location][fields][0]=name', 
        'populate[stock_locations][fields][0]=on_hand_stock',            
        'pagination[pageSize]=1000'
      ].join('&');

      const url = `${API_URL}/products?${queryString}`;
      const resProducts = await fetch(url, { headers });
      
      if (!resProducts.ok) throw new Error(`Server status: ${resProducts.status}`);

      const jsonProducts = await resProducts.json();
      setProducts(jsonProducts.data || []);
      
    } catch (error) {
      console.error("Fetch Error:", error);
      Alert.alert("ผิดพลาด", "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // 🛠️ ฟังก์ชันแกะเปลือกหมวดหมู่ (Universal Peeler)
  const getCategoryName = (item: any) => {
      if (!item.category) return 'ทั่วไป';

      let catData = item.category;
      if (catData.data) catData = catData.data; 
      if (!catData) return 'ทั่วไป';

      if (catData.attributes?.name) return catData.attributes.name;
      if (catData.name) return catData.name;

      // Fallback: Lookup จาก ID
      const targetId = catData.documentId || catData.id || catData; 
      const found = categories.find(c => {
          const cId = c.documentId || c.id; 
          return String(cId) === String(targetId);
      });

      if (found) return found.attributes?.name || found.name || 'ทั่วไป';

      return 'ทั่วไป';
  };

  // Logic กรองและเรียง
  const processedProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== 'all') {
      result = result.filter(p => {
          const catData = p.category?.data || p.category;
          const pCatId = catData?.documentId || catData?.id || catData;
          return String(pCatId) === String(selectedCategory);
      });
    }

    if (searchQuery) {
      result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (showLowStockOnly) {
      result = result.filter(p => p.stock <= 5);
    }

    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'stockAsc') result.sort((a, b) => a.stock - b.stock);
    else if (sortBy === 'stockDesc') result.sort((a, b) => b.stock - a.stock);

    return result;
  }, [products, selectedCategory, searchQuery, showLowStockOnly, sortBy, categories]);

  const showSortMenu = () => {
    Alert.alert("จัดเรียง", "เลือกรูปแบบ", [
        { text: "ชื่อ (ก-ฮ)", onPress: () => setSortBy('name') },
        { text: "สต็อก (น้อย->มาก)", onPress: () => setSortBy('stockAsc') },
        { text: "สต็อก (มาก->น้อย)", onPress: () => setSortBy('stockDesc') },
        { text: "ยกเลิก", style: "cancel" }
    ]);
  };

  const handlePressItem = (item: any) => {
    if (user?.position !== 'owner' && user?.position !== 'store_keeper') {
       const catName = getCategoryName(item);
       Alert.alert("📦 ข้อมูล", `${item.name}\nหมวดหมู่: ${catName}`, [{ text: "รับทราบ" }]);
       return;
    }
    Alert.alert("จัดการ", `"${item.name}"`, [
        { text: "ยกเลิก", style: "cancel" },
        { text: "✏️ แก้ไข", onPress: () => router.push(`/product/edit/${item.documentId || item.id}` as any) }
    ]);
  };

  const renderItem = ({ item }: { item: any }) => {
    const imageUrl = item.image?.url 
      ? (item.image.url.startsWith('http') ? item.image.url : `${BASE_URL}${item.image.url}`)
      : null;
    const stockLocations = item.stock_locations || [];
    const categoryName = getCategoryName(item);
    
    return (
      <TouchableOpacity style={styles.card} onPress={() => handlePressItem(item)}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}><Ionicons name="image-outline" size={30} color="#ccc" /></View>
        )}
        
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.category}>{categoryName}</Text>
          
          <View style={styles.locationList}>
            {stockLocations.length > 0 ? (
              stockLocations.map((loc: any, idx: number) => (
                <Text key={idx} style={styles.locationSmallText}>
                   📍 {loc.location?.name || 'รอระบุ'}: {loc.on_hand_stock}
                </Text>
              ))
            ) : (
              <Text style={styles.noLocationText}>⚠️ ยังไม่ได้ลงทะเบียนจุดเก็บ</Text>
            )}
          </View>
          <Text style={[styles.stock, item.stock <= 5 ? {color: '#dc2626'} : {color: '#16a34a'}]}>
             คงเหลือ: {item.stock}
          </Text>
        </View>
        <View style={styles.actionIcon}><Ionicons name="chevron-forward" size={20} color="#999" /></View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.searchRow}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput style={styles.searchInput} placeholder="ค้นหา..." value={searchQuery} onChangeText={setSearchQuery} />
                {searchQuery.length > 0 && (<TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity>)}
            </View>
            <TouchableOpacity style={styles.sortBtn} onPress={showSortMenu}><Ionicons name="filter" size={24} color="#00796B" /></TouchableOpacity>
        </View>
        <View style={styles.categoryRow}>
            <TouchableOpacity style={[styles.lowStockBtn, showLowStockOnly && styles.lowStockBtnActive]} onPress={() => setShowLowStockOnly(!showLowStockOnly)}>
                <Ionicons name={showLowStockOnly ? "checkmark-circle" : "alert-circle-outline"} size={18} color={showLowStockOnly ? "white" : "#dc2626"} />
                <Text style={[styles.lowStockText, showLowStockOnly && {color: 'white'}]}>ของใกล้หมด</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginLeft: 10}}>
                <TouchableOpacity style={[styles.catBadge, selectedCategory === 'all' && styles.catBadgeActive]} onPress={() => setSelectedCategory('all')}>
                    <Text style={[styles.catText, selectedCategory === 'all' && styles.catTextActive]}>ทั้งหมด</Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                    <TouchableOpacity key={cat.id} style={[styles.catBadge, (String(selectedCategory) === String(cat.documentId || cat.id)) && styles.catBadgeActive]} onPress={() => setSelectedCategory(cat.documentId || cat.id)}>
                        <Text style={[styles.catText, (String(selectedCategory) === String(cat.documentId || cat.id)) && styles.catTextActive]}>{cat.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#00796B" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={processedProducts}
          extraData={categories} 
          keyExtractor={(item: any) => item.documentId || item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>ไม่พบสินค้า</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 10, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  image: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#eee' },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  category: { fontSize: 12, color: '#888', marginTop: 2 },
  stock: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  actionIcon: { padding: 5 }
});