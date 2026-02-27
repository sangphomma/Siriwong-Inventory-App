// @/app/survey/components/SurveyFeed.tsx

'use client';

import React, { useState, useEffect } from 'react'; 
import { 
  Camera, Image as ImageIcon, X, Send, 
  CheckCircle2, Loader2, Edit, Calculator, FileText, Plus, Trash2 
} from 'lucide-react';
// ✅ นำเข้า deleteSurveyLog มาใช้งานด้วย
import { createSurveyLog, getSurveyLogs, deleteSurveyLog } from '@/services/api'; 
import { STRAPI_URL } from '@/services/config'; 
import { ImageAnnotator } from './ImageAnnotator';

interface SurveyFeedProps {
  projectDocId: string;
  projectIntId?: number;
}

type AreaItem = { id: string; width: string; length: string };

export const SurveyFeed = ({ projectDocId, projectIntId }: SurveyFeedProps) => {
  const [surveyMode, setSurveyMode] = useState<'general' | 'area'>('general');

  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Normal');
  
  const [addAreas, setAddAreas] = useState<AreaItem[]>([{ id: '1', width: '', length: '' }]);
  const [deductAreas, setDeductAreas] = useState<AreaItem[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [annotationImage, setAnnotationImage] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchLogs = async () => {
    const data = await getSurveyLogs(projectDocId);
    setLogs(data || []);
  };

  useEffect(() => { fetchLogs(); }, [projectDocId]);

  const calculateTotal = (items: AreaItem[]) => {
    return items.reduce((sum, item) => {
      const w = parseFloat(item.width) || 0;
      const l = parseFloat(item.length) || 0;
      return sum + (w * l);
    }, 0);
  };

  const totalAdd = calculateTotal(addAreas);
  const totalDeduct = calculateTotal(deductAreas);
  const netArea = totalAdd - totalDeduct;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return alert('กรุณากรอกหัวข้อ');
    
    let finalDescription = description;

    if (surveyMode === 'area') {
      let areaText = `📏 สรุปการประเมินพื้นที่\n`;
      
      areaText += `\n✅ ส่วนที่เพิ่ม (รวม ${totalAdd.toFixed(2)} ตร.ม.):\n`;
      addAreas.forEach((item, index) => {
        const w = parseFloat(item.width) || 0;
        const l = parseFloat(item.length) || 0;
        if (w > 0 && l > 0) areaText += `[+${index + 1}] กว้าง ${w} x ยาว ${l} = ${(w*l).toFixed(2)} ตร.ม.\n`;
      });

      if (deductAreas.length > 0) {
        areaText += `\n❌ ส่วนที่หักออก (รวม ${totalDeduct.toFixed(2)} ตร.ม.):\n`;
        deductAreas.forEach((item, index) => {
          const w = parseFloat(item.width) || 0;
          const l = parseFloat(item.length) || 0;
          if (w > 0 && l > 0) areaText += `[-${index + 1}] กว้าง ${w} x ยาว ${l} = ${(w*l).toFixed(2)} ตร.ม.\n`;
        });
      }

      areaText += `\n📌 **พื้นที่สุทธิ: ${netArea.toFixed(2)} ตร.ม.**`;
      
      finalDescription = areaText + (description ? `\n\n📝 หมายเหตุ: ${description}` : '');
    } else {
      if (!description) return alert('กรุณากรอกรายละเอียด');
    }

    setLoading(true);
    try {
      await createSurveyLog({
        topic: topic.trim(),
        description: finalDescription.trim(),
        severity: surveyMode === 'area' ? 'Info' : severity,
        project_site: projectDocId, 
        files: files
      });

      fetchLogs();
      setSuccess(true);
      
      setTopic(''); setDescription(''); setFiles([]); 
      setAddAreas([{ id: Date.now().toString(), width: '', length: '' }]);
      setDeductAreas([]);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + (error.response?.data?.error?.message || 'โปรดตรวจสอบข้อมูล'));
    } finally {
      setLoading(false);
    }
  };

  // ✅ ฟังก์ชันสำหรับลบรายการ Survey
  const handleDeleteLog = async (documentId: string) => {
    if (!window.confirm('คุณต้องการลบบันทึกการสำรวจนี้ใช่หรือไม่?')) return;
    
    try {
      await deleteSurveyLog(documentId);
      // พอลบสำเร็จ ก็เรียก fetchLogs เพื่อโหลดข้อมูลใหม่ทันที
      fetchLogs();
    } catch (error) {
      console.error("Delete error:", error);
      alert('ลบข้อมูลไม่สำเร็จ โปรดลองอีกครั้ง');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 pb-24 space-y-8">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        
        {/* Tab เลือกโหมด */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button onClick={() => setSurveyMode('general')} type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${surveyMode === 'general' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500'}`}>
            <FileText size={16}/> บันทึกทั่วไป
          </button>
          <button onClick={() => setSurveyMode('area')} type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${surveyMode === 'area' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
            <Calculator size={16}/> คำนวณพื้นที่
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase ml-1">หัวข้อ {surveyMode === 'area' && '(งานพื้นที่)'}</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl text-slate-900 border-none focus:ring-2 focus:ring-violet-500" placeholder={surveyMode === 'area' ? "เช่น วัดพื้นที่ปูกระเบื้องห้องโถง..." : "ระบุหัวข้อปัญหา..."} />
          </div>

          {/* โหมด: บันทึกทั่วไป */}
          {surveyMode === 'general' && (
            <>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">ระดับความสำคัญ</label>
                <div className="flex gap-2 mt-2">
                  {[{ label: 'ทั่วไป', value: 'Normal' }, { label: 'ข้อมูล', value: 'Info' }, { label: 'เร่งด่วน', value: 'Critical' }].map((lvl) => (
                    <button key={lvl.value} type="button" onClick={() => setSeverity(lvl.value)} className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${severity === lvl.value ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{lvl.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-400 uppercase ml-1">รายละเอียด</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full mt-1 p-3 bg-slate-50 rounded-2xl text-slate-900 border-none focus:ring-2 focus:ring-violet-500" placeholder="อธิบายสิ่งที่พบ..." />
              </div>
            </>
          )}

          {/* โหมด: คำนวณพื้นที่ (Mobile-First Layout) */}
          {surveyMode === 'area' && (
            <div className="space-y-6 bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100">
              
              {/* ส่วนที่ 1: พื้นที่เพิ่ม */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-emerald-700 uppercase ml-1">✅ ส่วนที่เพิ่ม (กว้าง x ยาว)</label>
                  <button type="button" onClick={() => setAddAreas([...addAreas, { id: Date.now().toString(), width: '', length: '' }])} className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 active:scale-95"><Plus size={12}/> เพิ่มแถว</button>
                </div>
                <div className="space-y-2">
                  {addAreas.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-2xl border border-emerald-100 shadow-sm">
                      <div className="w-10 h-10 shrink-0 bg-emerald-50 text-emerald-600 font-black rounded-xl flex items-center justify-center text-sm border border-emerald-100">
                        +{index + 1}
                      </div>
                      <input type="number" inputMode="decimal" placeholder="กว้าง (ม.)" value={item.width} onChange={(e) => { const newArr = [...addAreas]; newArr[index].width = e.target.value; setAddAreas(newArr); }} className="flex-1 min-w-0 p-3 bg-slate-50 rounded-xl text-sm text-center text-slate-700 font-bold outline-none focus:ring-2 focus:ring-emerald-400" />
                      <span className="text-slate-300 font-black text-xs shrink-0">X</span>
                      <input type="number" inputMode="decimal" placeholder="ยาว (ม.)" value={item.length} onChange={(e) => { const newArr = [...addAreas]; newArr[index].length = e.target.value; setAddAreas(newArr); }} className="flex-1 min-w-0 p-3 bg-slate-50 rounded-xl text-sm text-center text-slate-700 font-bold outline-none focus:ring-2 focus:ring-emerald-400" />
                      <button type="button" onClick={() => setAddAreas(addAreas.filter(a => a.id !== item.id))} className="shrink-0 w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ส่วนที่ 2: พื้นที่หักออก */}
              <div className="pt-4 border-t border-emerald-200 border-dashed">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-black text-red-500 uppercase ml-1">❌ ส่วนที่หักออก (ประตู, หน้าต่าง)</label>
                  <button type="button" onClick={() => setDeductAreas([...deductAreas, { id: Date.now().toString(), width: '', length: '' }])} className="text-[10px] bg-red-50 text-red-600 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 active:scale-95"><Plus size={12}/> หักออก</button>
                </div>
                <div className="space-y-2">
                  {deductAreas.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-2xl border border-red-100 shadow-sm">
                      <div className="w-10 h-10 shrink-0 bg-red-50 text-red-600 font-black rounded-xl flex items-center justify-center text-sm border border-red-100">
                        -{index + 1}
                      </div>
                      <input type="number" inputMode="decimal" placeholder="กว้าง (ม.)" value={item.width} onChange={(e) => { const newArr = [...deductAreas]; newArr[index].width = e.target.value; setDeductAreas(newArr); }} className="flex-1 min-w-0 p-3 bg-slate-50 rounded-xl text-sm text-center text-slate-700 font-bold outline-none focus:ring-2 focus:ring-red-400" />
                      <span className="text-slate-300 font-black text-xs shrink-0">X</span>
                      <input type="number" inputMode="decimal" placeholder="ยาว (ม.)" value={item.length} onChange={(e) => { const newArr = [...deductAreas]; newArr[index].length = e.target.value; setDeductAreas(newArr); }} className="flex-1 min-w-0 p-3 bg-slate-50 rounded-xl text-sm text-center text-slate-700 font-bold outline-none focus:ring-2 focus:ring-red-400" />
                      <button type="button" onClick={() => setDeductAreas(deductAreas.filter(a => a.id !== item.id))} className="shrink-0 w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* สรุปยอดพื้นที่สุทธิ */}
              <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-lg flex justify-between items-center">
                <span className="font-bold text-sm text-emerald-100">พื้นที่สุทธิ (Net Area)</span>
                <span className="font-black text-3xl">{netArea.toFixed(2)} <span className="text-sm font-normal text-emerald-200">ตร.ม.</span></span>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mt-1 p-4 bg-white rounded-2xl text-slate-900 border border-emerald-100 text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none" placeholder="เช่น ใช้วัสดุกระเบื้องยางลายไม้..." />
              </div>
            </div>
          )}

          {/* อัปโหลดรูปภาพ */}
          {files.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-2">
              {files.map((file, idx) => (
                <div key={idx} className="relative flex-shrink-0 w-24 h-24">
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded-2xl border border-slate-200" alt="preview" />
                  <button type="button" onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"><X size={14}/></button>
                  <button type="button" onClick={() => { setAnnotationImage(URL.createObjectURL(file)); setEditingIndex(idx); }} className="absolute bottom-1 right-1 bg-violet-600 text-white rounded-lg p-1.5 shadow-lg active:scale-90 transition-all"><Edit size={14}/></button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <label className="flex-1 flex items-center justify-center gap-2 bg-slate-100 py-4 rounded-2xl font-bold text-sm cursor-pointer transition-colors hover:bg-slate-200 active:scale-95"><ImageIcon size={18}/>แนบรูปภาพ<input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files!)])} /></label>
            <label className="flex-1 flex items-center justify-center gap-2 bg-slate-100 py-4 rounded-2xl font-bold text-sm cursor-pointer transition-colors hover:bg-slate-200 active:scale-95"><Camera size={18}/>ถ่ายภาพ<input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files!)])} /></label>
          </div>

          <button type="submit" disabled={loading} className={`w-full py-4 rounded-3xl font-black text-white shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${loading ? 'bg-slate-400' : (surveyMode === 'area' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-gradient-to-r from-violet-600 to-indigo-600')}`}>
            {loading ? <Loader2 className="animate-spin" /> : <Send size={20}/>}
            {loading ? 'กำลังบันทึก...' : 'ส่งข้อมูลสำรวจ'}
          </button>
        </form>
      </div>

      {/* --- ส่วนแสดงประวัติ --- */}
      <div className="space-y-4">
        <h3 className="font-black text-slate-800 ml-2 border-l-4 border-violet-600 pl-3 text-lg">รายการบันทึกทั้งหมด</h3>
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 font-bold">ยังไม่มีบันทึกข้อมูลสำรวจ</div>
        ) : (
          logs.map((log: any) => (
            <div key={log.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-3 relative group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${log.severity === 'Critical' ? 'bg-red-100 text-red-600' : log.severity === 'Info' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {log.severity}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">{new Date(log.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                {/* ✅ ปุ่มลบ (จะอยู่มุมขวาบนของแต่ละการ์ด) */}
                <button 
                  onClick={() => handleDeleteLog(log.documentId)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors active:scale-95"
                  title="ลบรายการนี้"
                >
                  <Trash2 size={16} />
                </button>

              </div>
              
              <h4 className="font-bold text-slate-800 text-lg pr-8">{log.topic}</h4>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded-2xl">{log.description}</p>
              
              {log.photos && log.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pt-3 pb-1">
                  {log.photos.map((p: any, idx: number) => {
                    const imgUrl = p.url?.startsWith('/') ? `${STRAPI_URL}${p.url}` : p.url; 
                    return <img key={idx} src={imgUrl} className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0 cursor-pointer hover:opacity-80 active:scale-95" alt={`รูปภาพสำรวจ ${idx + 1}`} onClick={() => setPreviewImage(imgUrl)} />;
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal ต่างๆ */}
      {annotationImage && (
        <ImageAnnotator imageUrl={annotationImage} onSave={(blob) => { const file = new File([blob], `edit_${Date.now()}.jpg`, { type: 'image/jpeg' }); if (editingIndex !== null) { const updated = [...files]; updated[editingIndex] = file; setFiles(updated); } setAnnotationImage(null); setEditingIndex(null); }} onClose={() => { setAnnotationImage(null); setEditingIndex(null); }} />
      )}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-[100005] flex flex-col items-center justify-center p-4 animate-in fade-in"><button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-red-500 text-white rounded-full"><X size={24} /></button><img src={previewImage} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" /></div>
      )}
      {success && (
        <div className="fixed bottom-24 left-4 right-4 bg-emerald-500 text-white p-4 rounded-2xl flex items-center gap-3 shadow-2xl animate-bounce z-[999]"><CheckCircle2 size={24} /><span className="font-bold">บันทึกข้อมูลเรียบร้อยแล้ว</span></div>
      )}
    </div>
  );
};