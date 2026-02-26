'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createSurveyLog, getSurveyLogs } from '@/services/api';
import { STRAPI_URL } from '@/services/config';
import { 
  Plus, Image as ImageIcon, X, Send, 
  AlertCircle, CheckCircle2, Info, Loader2 
} from 'lucide-react';

interface SurveyFeedProps {
  projectDocId: string;
  projectIntId: number; 
}

export const SurveyFeed = ({ projectDocId, projectIntId }: SurveyFeedProps) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [topic, setTopic] = useState('');
  const [desc, setDesc] = useState('');
  // ✅ แก้ไข: ค่าเริ่มต้นต้องขึ้นต้นด้วยตัวใหญ่
  const [severity, setSeverity] = useState('Normal'); 
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSurveyLogs(projectDocId);
      setLogs(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [projectDocId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return alert('กรุณาใส่หัวข้อ');

    setSubmitting(true);
    try {
      await createSurveyLog({
        topic,
        description: desc,
        severity, // ส่งค่า 'Normal', 'Info', หรือ 'Critical'
        project_site: projectDocId, 
        files: files
      });

      setTopic(''); setDesc(''); setFiles([]); setIsFormOpen(false);
      fetchLogs();
    } catch (err) {
      console.error("Submit error:", err);
      alert('บันทึกไม่สำเร็จ ตรวจสอบค่า Severity และ Network Tab');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isFormOpen && (
        <button onClick={() => setIsFormOpen(true)} className="w-full py-4 bg-white border-2 border-dashed border-violet-200 rounded-3xl text-violet-600 font-bold flex items-center justify-center gap-2 shadow-sm">
          <Plus className="w-5 h-5" /> เพิ่มบันทึกการสำรวจ
        </button>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-violet-100 space-y-4">
          <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700" placeholder="หัวข้อการสำรวจ" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <textarea className="w-full p-4 bg-slate-50 rounded-2xl border-none min-h-[120px]" placeholder="รายละเอียด..." value={desc} onChange={(e) => setDesc(e.target.value)} />

          <div className="flex gap-2">
            {/* ✅ แก้ไข: ชื่อในปุ่มต้องตรงกับที่ Strapi กำหนดไว้ (Normal, Info, Critical) */}
            {['Normal', 'Info', 'Critical'].map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setSeverity(lv)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                  severity === lv ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'
                }`}
              >
                {lv}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden"><img src={URL.createObjectURL(f)} className="w-full h-full object-cover" /><button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"><X className="w-3 h-3" /></button></div>
            ))}
            <label className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 cursor-pointer">
              <ImageIcon className="w-6 h-6" /><span className="text-[9px] font-black">เพิ่มรูป</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && setFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
            </label>
          </div>

          <button disabled={submitting} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg disabled:bg-slate-300">
            {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'บันทึกข้อมูล'}
          </button>
        </form>
      )}

      {/* Feed แสดงผล (เหมือนเดิม) */}
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
             <h4 className="font-bold text-slate-800">{log.topic}</h4>
             <p className="text-xs text-slate-400 mb-2">{new Date(log.createdAt).toLocaleString('th-TH')}</p>
             <p className="text-sm text-slate-600 mb-4">{log.description}</p>
             <div className="grid grid-cols-2 gap-2">
                {log.photos?.map((p: any) => (
                  <img key={p.id} src={p.url.startsWith('http') ? p.url : `${STRAPI_URL}${p.url}`} className="rounded-xl aspect-video object-cover" />
                ))}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};