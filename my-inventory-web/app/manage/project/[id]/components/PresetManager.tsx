"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
    getMaterialPresets, 
    createMaterialPreset, 
    updateMaterialPreset, 
    deleteMaterialPreset,
    getAllProductsSafe 
} from "@/services/api";

interface PresetManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void; // Callback ให้ตัวแม่ refresh ข้อมูล
}

const ICONS = ["📦", "🔨", "🔌", "🚰", "🪵", "🧱", "🏗️", "🏠", "🎨", "🧹"];

export default function PresetManager({ isOpen, onClose, onUpdate }: PresetManagerProps) {
    const [presets, setPresets] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Editor State
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [editingId, setEditingId] = useState<string | null>(null); // null = create new
    
    // Form State
    const [formData, setFormData] = useState<{ title: string, icon: string, items: any[] }>({
        title: "", icon: "📦", items: []
    });
    
    // Add Item State
    const [selectedProduct, setSelectedProduct] = useState("");
    const [addQty, setAddQty] = useState(1);

    useEffect(() => {
        if (isOpen) loadData();
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pData, prodData] = await Promise.all([
                getMaterialPresets(),
                getAllProductsSafe()
            ]);
            setPresets(pData);
            setProducts(prodData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (preset: any) => {
        setEditingId(preset.documentId);
        // Map items ให้เหลือแค่ structure ที่ API ต้องการ { product: id, quantity: n }
        const cleanItems = preset.items.map((i: any) => ({
            product: i.product?.documentId || i.product?.id,
            quantity: i.quantity,
            tempName: i.product?.name, // เก็บไว้โชว์เฉยๆ ไม่ส่งไป API
            tempUnit: i.product?.unit
        }));
        
        setFormData({
            title: preset.title,
            icon: preset.icon,
            items: cleanItems
        });
        setView('edit');
    };

    const handleCreateNew = () => {
        setEditingId(null);
        setFormData({ title: "", icon: "📦", items: [] });
        setView('edit');
    };

    const handleAddItem = () => {
        if (!selectedProduct) return;
        const prod = products.find(p => p.documentId === selectedProduct);
        if (!prod) return;

        // เช็คว่ามีซ้ำไหม
        if (formData.items.some(i => i.product === prod.documentId)) {
            alert("สินค้านี้มีในชุดแล้ว");
            return;
        }

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, {
                product: prod.documentId,
                quantity: Number(addQty),
                tempName: prod.name,
                tempUnit: prod.unit
            }]
        }));
        setSelectedProduct("");
        setAddQty(1);
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleSave = async () => {
        if (!formData.title) return alert("กรุณาตั้งชื่อชุด");
        if (formData.items.length === 0) return alert("ต้องมีสินค้าอย่างน้อย 1 ชิ้น");

        setLoading(true);
        try {
            // เตรียม Payload (เอา field temp ออก)
            const payloadItems = formData.items.map(i => ({
                product: i.product,
                quantity: i.quantity
            }));

            if (editingId) {
                await updateMaterialPreset(editingId, { ...formData, items: payloadItems });
            } else {
                await createMaterialPreset({ ...formData, items: payloadItems });
            }
            
            await loadData(); // โหลดใหม่
            setView('list');
            onUpdate(); // บอกตัวแม่ว่าอัปเดตแล้ว
        } catch (error) {
            console.error(error);
            alert("บันทึกไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("ยืนยันลบชุดนี้?")) return;
        setLoading(true);
        try {
            await deleteMaterialPreset(id);
            await loadData();
            onUpdate();
        } catch (error) {
            alert("ลบไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        // ⚠️ Z-Index สูงสุด (100000) เพื่อให้ทับ Modal เบิกของ (99999)
        <div className="fixed inset-0 bg-slate-900/95 z-[100000] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
             <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-6 shadow-2xl h-[85vh] flex flex-col relative overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6 px-2 shrink-0">
                    <h3 className="font-black text-xl text-slate-800">
                        {view === 'list' ? '⚙️ จัดการชุดเบิก (Presets)' : (editingId ? '✏️ แก้ไขชุด' : '✨ สร้างชุดใหม่')}
                    </h3>
                    <button onClick={onClose} className="w-10 h-10 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 font-bold flex items-center justify-center">✕</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-20">
                    {loading && <div className="text-center py-10 animate-pulse text-slate-400">กำลังประมวลผล...</div>}
                    
                    {/* LIST VIEW */}
                    {!loading && view === 'list' && (
                        <div className="space-y-3">
                            <button onClick={handleCreateNew} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 font-bold hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 mb-4">
                                + สร้างชุดใหม่
                            </button>
                            
                            {presets.map((p, idx) => (
                                <div key={p.documentId || idx} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-slate-100">
                                            {p.icon}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-700">{p.title}</div>
                                            <div className="text-xs text-slate-400 font-bold">{p.items?.length || 0} รายการ</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(p)} className="p-2 bg-white rounded-lg text-slate-400 hover:text-blue-500 shadow-sm border border-slate-100">✏️</button>
                                        <button onClick={() => handleDelete(p.documentId)} className="p-2 bg-white rounded-lg text-slate-400 hover:text-red-500 shadow-sm border border-slate-100">🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* EDIT VIEW */}
                    {!loading && view === 'edit' && (
                        <div className="space-y-6 animate-in slide-in-from-right">
                            {/* Basic Info */}
                            <div className="space-y-3 bg-slate-50 p-4 rounded-3xl">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">ชื่อชุด</label>
                                    <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 outline-none font-bold" placeholder="เช่น งานระบบน้ำ" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1 mb-2 block">เลือกไอคอน</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {ICONS.map(icon => (
                                            <button key={icon} onClick={() => setFormData({...formData, icon})} className={`w-10 h-10 rounded-lg text-xl flex-shrink-0 border-2 transition-all ${formData.icon === icon ? 'bg-amber-100 border-amber-400 scale-110' : 'bg-white border-slate-200 grayscale opacity-60'}`}>
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Items List */}
                            <div>
                                <h4 className="font-bold text-slate-700 mb-2 px-1">รายการสินค้าในชุด</h4>
                                <div className="space-y-2 mb-4">
                                    {formData.items.length === 0 && <div className="text-center py-8 bg-slate-50 rounded-xl text-slate-400 text-sm">ยังไม่มีสินค้า</div>}
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                            <div className="flex-1 font-bold text-slate-700 text-sm">{item.tempName}</div>
                                            <div className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold">x {item.quantity} {item.tempUnit}</div>
                                            <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600 font-bold px-2">ลบ</button>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Item Box */}
                                <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 flex gap-2 items-center">
                                    <select 
                                        className="flex-1 p-2 rounded-lg text-sm font-bold bg-white border border-amber-200 outline-none"
                                        value={selectedProduct}
                                        onChange={e => setSelectedProduct(e.target.value)}
                                    >
                                        <option value="">+ เลือกสินค้าเพิ่ม</option>
                                        {products.map(p => <option key={p.documentId} value={p.documentId}>{p.name}</option>)}
                                    </select>
                                    <input 
                                        type="number" 
                                        className="w-16 p-2 rounded-lg text-center font-bold bg-white border border-amber-200 outline-none" 
                                        value={addQty} 
                                        onChange={e => setAddQty(Number(e.target.value))}
                                    />
                                    <button onClick={handleAddItem} className="bg-amber-500 text-white px-3 py-2 rounded-lg font-bold shadow-sm active:scale-95">+</button>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setView('list')} className="flex-1 py-3 bg-slate-200 text-slate-600 rounded-xl font-bold">ย้อนกลับ</button>
                                <button onClick={handleSave} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg">บันทึก</button>
                            </div>
                        </div>
                    )}
                </div>
             </div>
        </div>,
        document.body
    );
}