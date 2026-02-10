"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { STRAPI_URL } from "@/services/config";
import PresetManager from "./PresetManager";
import ProductSelector from "./ProductSelector"; // ✅ Import ตัวใหม่
import { 
    getAllProductsSafe, 
    getMaterialLogsSafe, 
    createMaterialLog,
    updateMaterialLog,
    deleteMaterialLog,
    getAllUsers,
    getMaterialPresets
} from "@/services/api";

interface ProjectMaterialProps {
    projectId: string;
    onModalStateChange?: (isOpen: boolean) => void; 
}

export default function ProjectMaterial({ projectId }: ProjectMaterialProps) {
    // ==========================================
    // 1. STATE & DATA LOADING
    // ==========================================
    const [logs, setLogs] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [presets, setPresets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    
    // UI States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Modal States
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isPresetSelectorOpen, setIsPresetSelectorOpen] = useState(false);
    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false); // ✅ State สำหรับ Modal เลือกสินค้า

    // Form Data
    const [batchItems, setBatchItems] = useState<any[]>([]);
    const [requester, setRequester] = useState("");
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [presetSearch, setPresetSearch] = useState("");

    useEffect(() => setMounted(true), []);
    useEffect(() => { if (projectId) initData(); }, [projectId]);

    const initData = async () => {
        setLoading(true);
        try {
            const [logsData, productsData, usersData, presetsData] = await Promise.all([
                getMaterialLogsSafe(projectId),
                getAllProductsSafe(),
                getAllUsers(),
                getMaterialPresets()
            ]);
            setLogs(logsData);
            setProducts(productsData);
            setUsers(usersData);
            setPresets(presetsData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const refreshLogs = async () => {
        const logsData = await getMaterialLogsSafe(projectId);
        setLogs(logsData);
    };

    const groupedLogs = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        logs.forEach(log => {
            const dateStr = new Date(log.date).toLocaleDateString('th-TH', {
                day: 'numeric', month: 'short', year: '2-digit'
            });
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(log);
        });
        return groups;
    }, [logs]);

    // ==========================================
    // 2. LOGIC: PRESET & MANUAL ADD
    // ==========================================
    
    // โหลด Preset (Default Qty = 0)
    const loadPreset = (preset: any) => {
        if (!preset || !preset.items) return;
        const newBatch: any[] = [];
        preset.items.forEach((item: any) => {
            const product = item.product;
            if (product) {
                const exists = batchItems.find(b => b.productId === product.documentId);
                if (!exists) {
                    newBatch.push({
                        productId: product.documentId,
                        name: product.name,
                        unit: product.unit || "หน่วย",
                        quantity: 0, // ✅ เริ่มต้นที่ 0 เพื่อกัน Data ขยะ
                        note: ""
                    });
                }
            }
        });

        if (newBatch.length === 0) {
            alert("สินค้าในชุดนี้ถูกเพิ่มไปหมดแล้ว หรือไม่มีสินค้าในระบบ");
        } else {
            setBatchItems(prev => [...prev, ...newBatch]);
            setIsPresetSelectorOpen(false); 
            setPresetSearch(""); 
        }
    };

    // เพิ่มสินค้าทีละชิ้น (Manual)
    const handleManualAddItem = (productId: string) => {
        if (!productId) return;
        const foundProduct = products.find(p => p.documentId === productId);
        if (foundProduct) {
            if (batchItems.some(b => b.productId === productId)) return alert("สินค้านี้อยู่ในรายการแล้ว");
            setBatchItems(prev => [...prev, { 
                productId: foundProduct.documentId, 
                name: foundProduct.name, 
                unit: foundProduct.unit, 
                quantity: 0, 
                note: "" 
            }]);
        }
    };

    // ==========================================
    // 3. LOGIC: ACTIONS & SUBMIT
    // ==========================================

    const handleUpdateQty = async (logId: string, newQty: string) => {
        if (!newQty || isNaN(Number(newQty))) return;
        try {
            await updateMaterialLog(logId, Number(newQty));
            refreshLogs();
        } catch (error) { alert("แก้ไขไม่สำเร็จ"); }
    };

    const handleDeleteLog = async (logId: string) => {
        if(!confirm("ลบรายการนี้?")) return;
        try {
            await deleteMaterialLog(logId);
            setLogs(prev => prev.filter(l => l.documentId !== logId && l.id !== logId));
        } catch (error) { alert("ลบไม่สำเร็จ"); }
    };

    const updateBatchQty = (index: number, val: string) => {
        const newBatch = [...batchItems];
        newBatch[index].quantity = Number(val);
        setBatchItems(newBatch);
    };

    const removeBatchItem = (index: number) => {
        setBatchItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleBatchSubmit = async () => {
        if (!requester) return alert("ระบุชื่อผู้เบิก");
        
        // ✅ กรองเฉพาะที่มีจำนวน > 0
        const validItems = batchItems.filter(item => item.quantity > 0);
        
        if (validItems.length === 0) return alert("กรุณาระบุจำนวนสินค้าอย่างน้อย 1 รายการ");

        try {
            setSubmitting(true);
            const promises = validItems.map(item => createMaterialLog({
                project_site: projectId,
                product: item.productId,
                quantity: item.quantity,
                requester_name: requester,
                log_date: logDate,
                note: item.note || "",
                action_type: 'issue'
            }));
            await Promise.all(promises);
            setBatchItems([]); setRequester(""); setIsCreateOpen(false);
            refreshLogs();
        } catch (error) {
            console.error(error); alert("เกิดข้อผิดพลาด");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredPresets = presets.filter(p => p.title.toLowerCase().includes(presetSearch.toLowerCase()));

    if (loading) return <div className="text-center py-10 text-slate-400 animate-pulse font-bold">กำลังโหลดข้อมูลวัสดุ...</div>;

    // ==========================================
    // 4. RENDER UI
    // ==========================================
    return (
        <div className="pb-32 font-sans">
            <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="font-black text-slate-800 text-lg">🧱 ประวัติการเบิก ({logs.length})</h2>
                <button onClick={() => setIsCreateOpen(true)} className="bg-amber-50 text-amber-600 px-4 py-2 rounded-full font-black text-xs shadow-sm border border-amber-100 active:scale-95 transition-transform flex items-center gap-1">+ เบิกของ</button>
            </div>

            {/* TIMELINE LIST */}
            <div className="space-y-8">
                {Object.entries(groupedLogs).map(([date, items]: [string, any[]]) => (
                    <div key={date} className="relative pl-4 border-l-2 border-slate-100">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></div>
                        <h3 className="text-xs font-black text-slate-400 mb-4 pl-2 uppercase tracking-widest">{date}</h3>
                        <div className="space-y-3">
                            {items.map((log) => (
                                <div key={log.documentId || log.id} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 relative group">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                        {log.product?.image ? (
                                            <img src={log.product.image.startsWith('http') ? log.product.image : `${STRAPI_URL}${log.product.image}`} className="w-full h-full object-cover" />
                                        ) : <span className="text-lg">📦</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-700 text-sm truncate">{log.product?.name || "สินค้าไม่ระบุ"}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold truncate">👤 {log.requester}</span>
                                            {log.note && <span className="text-[9px] text-slate-400 italic truncate max-w-[100px]">"{log.note}"</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-end">
                                            <input type="number" defaultValue={log.quantity} onBlur={(e) => handleUpdateQty(log.documentId, e.target.value)} className="w-12 text-right font-black text-amber-600 bg-amber-50/50 rounded-md border-0 p-1 text-sm focus:ring-2 focus:ring-amber-200 outline-none" />
                                            <span className="text-[9px] text-slate-400 font-bold">{log.product?.unit}</span>
                                        </div>
                                        <button onClick={() => handleDeleteLog(log.documentId)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.664-1.452Z" clipRule="evenodd" /></svg></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {logs.length === 0 && <div className="text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-slate-100"><div className="text-4xl mb-2 grayscale opacity-50">📝</div><p className="text-slate-400 text-sm font-bold">ยังไม่มีรายการเบิก</p></div>}
            </div>

            {/* --- CREATE MODAL --- */}
            {mounted && isCreateOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/95 z-[99999] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
                    <button onClick={() => setIsCreateOpen(false)} className="fixed top-6 right-6 w-14 h-14 bg-white/20 rounded-full text-white flex items-center justify-center hover:bg-white/30 active:scale-90 transition-all z-[99999] shadow-xl border border-white/10">✕</button>

                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 h-[85vh] flex flex-col relative">
                        <h3 className="font-black text-xl mb-4 text-slate-800 text-center shrink-0">🛒 เบิกวัสดุ (Batch)</h3>
                        
                        {/* Selector Buttons */}
                        <div className="flex gap-2 mb-4 shrink-0">
                            <button onClick={() => setIsPresetSelectorOpen(true)} className="flex-1 bg-amber-50 border-2 border-dashed border-amber-200 hover:bg-amber-100 hover:border-amber-300 text-amber-700 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all active:scale-95">
                                <span className="text-xl">📦</span><span>เลือกชุดเบิก (Presets)</span>
                            </button>
                            <button onClick={() => setIsManagerOpen(true)} className="w-14 bg-slate-50 border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-600 hover:border-slate-300 rounded-xl flex items-center justify-center active:scale-95 transition-all">⚙️</button>
                        </div>

                        {/* ✅ BUTTON: OPEN PRODUCT SELECTOR */}
                        <div className="mb-4 shrink-0">
                            <button onClick={() => setIsProductSelectorOpen(true)} className="w-full py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:bg-white hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-2 active:scale-95">
                                <span className="text-xl">🔍</span><span>กดเพื่อค้นหาและเลือกสินค้าเพิ่ม...</span>
                            </button>
                        </div>

                        {/* List Items */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 border-t border-slate-100 pt-4">
                            {batchItems.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 text-sm font-bold">เลือก Preset หรือเพิ่มสินค้าเอง</div>
                            ) : (
                                batchItems.map((item, idx) => (
                                    <div key={`${item.productId}-${idx}`} className="flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                                        <button onClick={() => removeBatchItem(idx)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0 hover:bg-red-100">✕</button>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold text-sm truncate ${item.quantity > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{item.name}</div>
                                            <div className="text-[10px] text-slate-400">{item.unit}</div>
                                        </div>
                                        <div className="w-24">
                                            <input type="number" inputMode="decimal" className={`w-full p-2 rounded-lg border text-center font-black outline-none focus:ring-2 ${item.quantity > 0 ? 'bg-amber-50 border-amber-200 text-amber-700 ring-amber-100' : 'bg-slate-50 border-slate-200 text-slate-400'}`} value={item.quantity} onChange={e => updateBatchQty(idx, e.target.value)} placeholder="0" />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 bg-slate-50 p-4 rounded-3xl space-y-3">
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">วันที่</label>
                                    <input type="date" className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-sm outline-none" value={logDate} onChange={e => setLogDate(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">ผู้เบิก</label>
                                    <div className="relative">
                                        <select className="w-full p-3 bg-white rounded-xl border border-slate-200 font-bold text-sm outline-none appearance-none" value={requester} onChange={e => setRequester(e.target.value)}>
                                            <option value="" disabled>-- เลือกชื่อ --</option>
                                            {users.map((u) => (<option key={u.id} value={u.username}>{u.username} {u.position ? `(${u.position})` : ''}</option>))}
                                        </select>
                                        <div className="absolute right-3 top-3.5 text-slate-400 pointer-events-none text-[10px]">▼</div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleBatchSubmit} disabled={submitting || batchItems.filter(i => i.quantity > 0).length === 0} className="w-full py-4 bg-amber-500 text-white rounded-xl font-black text-sm uppercase shadow-xl shadow-amber-200 active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100">{submitting ? 'กำลังบันทึก...' : `ยืนยันการเบิก (${batchItems.filter(i => i.quantity > 0).length} รายการ)`}</button>
                        </div>
                    </div>
                </div>,
                document.body 
            )}

            {/* --- MODALS (Z-INDEXED) --- */}
            
            {/* 1. Preset Selector */}
            {mounted && isPresetSelectorOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/80 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl h-[70vh] flex flex-col relative animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h3 className="font-black text-lg text-slate-800">📦 เลือกชุดเบิกสินค้า</h3>
                            <button onClick={() => setIsPresetSelectorOpen(false)} className="w-10 h-10 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold">✕</button>
                        </div>
                        <div className="mb-4 shrink-0 relative">
                            <div className="absolute left-3 top-3 text-slate-400">🔍</div>
                            <input type="text" placeholder="ค้นหาชุดเบิก..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-200" value={presetSearch} onChange={(e) => setPresetSearch(e.target.value)} autoFocus />
                        </div>
                        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
                            {filteredPresets.length > 0 ? (
                                filteredPresets.map((preset, idx) => (
                                    <button key={preset.id || idx} onClick={() => loadPreset(preset)} className="w-full p-4 bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-2xl flex items-center gap-3 transition-all active:scale-95 group shadow-sm text-left">
                                        <div className="w-12 h-12 bg-slate-50 group-hover:bg-white rounded-xl flex items-center justify-center text-2xl border border-slate-100 shadow-inner">{preset.icon || '📦'}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-700 group-hover:text-amber-800">{preset.title}</div>
                                            <div className="text-xs text-slate-400 group-hover:text-amber-600 font-bold">{preset.items?.length || 0} รายการ</div>
                                        </div>
                                        <div className="text-slate-300 group-hover:text-amber-500 font-bold text-xl">→</div>
                                    </button>
                                ))
                            ) : (<div className="text-center py-10 text-slate-400 font-bold">ไม่พบข้อมูลชุดเบิก</div>)}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 2. Preset Manager */}
            <PresetManager isOpen={isManagerOpen} onClose={() => setIsManagerOpen(false)} onUpdate={() => initData()} />

            {/* 3. ✅ Product Selector (New) */}
            <ProductSelector 
                isOpen={isProductSelectorOpen} 
                onClose={() => setIsProductSelectorOpen(false)} 
                products={products} 
                onSelect={(productId) => {
                    handleManualAddItem(productId);
                    // ไม่ปิด Modal อัตโนมัติ เพื่อให้จิ้มเลือกได้รัวๆ
                    // ถ้าอยากให้ปิดเลย ให้ uncomment บรรทัดล่างครับ
                    // setIsProductSelectorOpen(false); 
                }} 
            />

        </div>
    );
}