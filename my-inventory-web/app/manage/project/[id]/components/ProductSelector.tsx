"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { STRAPI_URL } from "@/services/config";

interface ProductSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    products: any[];
    onSelect: (productId: string) => void;
}

export default function ProductSelector({ isOpen, onClose, products, onSelect }: ProductSelectorProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");

    // 1. ดึงรายชื่อหมวดหมู่ทั้งหมดที่มีอยู่จริงในสินค้า (Unique)
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category || "ทั่วไป"));
        return ["ทั้งหมด", ...Array.from(cats).sort()];
    }, [products]);

    // 2. กรองสินค้าตาม Search และ Category
    const filteredProducts = products.filter(p => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = selectedCategory === "ทั้งหมด" || p.category === selectedCategory;
        return matchSearch && matchCat;
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/80 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl h-[80vh] flex flex-col relative animate-in zoom-in-95">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="font-black text-lg text-slate-800">🛒 เลือกสินค้าเพิ่ม</h3>
                    <button onClick={onClose} className="w-10 h-10 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold">✕</button>
                </div>

                {/* Search */}
                <div className="mb-4 shrink-0 relative">
                    <div className="absolute left-3 top-3 text-slate-400">🔍</div>
                    <input 
                        type="text" 
                        placeholder="ค้นหาชื่อสินค้า..." 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                {/* Category Chips (Horizontal Scroll) */}
                <div className="mb-4 shrink-0 overflow-x-auto pb-2 no-scrollbar">
                    <div className="flex gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border ${
                                    selectedCategory === cat 
                                    ? 'bg-blue-500 text-white border-blue-600 shadow-md' 
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 pb-4">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map((product) => (
                            <button 
                                key={product.id}
                                onClick={() => {
                                    onSelect(product.documentId);
                                    // ไม่ปิด Modal อัตโนมัติ เพื่อให้กดเลือกได้หลายอันต่อเนื่อง
                                }}
                                className="w-full p-3 bg-white border border-slate-100 hover:border-blue-300 hover:bg-blue-50 rounded-2xl flex items-center gap-3 transition-all active:scale-95 group shadow-sm text-left"
                            >
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                                    {product.image ? (
                                         <img src={product.image.startsWith('http') ? product.image : `${STRAPI_URL}${product.image}`} className="w-full h-full object-cover" />
                                    ) : <span className="text-xl">📦</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-700 text-sm group-hover:text-blue-800">{product.name}</div>
                                    <div className="flex gap-2 text-[10px] font-bold mt-0.5">
                                        <span className="text-slate-400 bg-slate-100 px-1.5 rounded">{product.category}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-slate-400">{product.unit}</span>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white font-bold text-xl transition-colors">
                                    +
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-400 font-bold">ไม่พบสินค้า</div>
                    )}
                </div>

            </div>
        </div>,
        document.body
    );
}