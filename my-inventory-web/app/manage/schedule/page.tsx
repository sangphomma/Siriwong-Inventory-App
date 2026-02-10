"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Plus, MapPin, 
  Trash2, Share, Copy, X, Loader2,
  Pencil, Image as ImageIcon,
  LocateFixed, ExternalLink 
} from 'lucide-react';

// Context & Services
import { useAuth } from '../../context/AuthContext';
import { 
  getUserActivities, 
  createUserActivity, 
  updateUserActivity, 
  deleteUserActivity, 
  generateLineReport,
  getAllProjects 
} from '@/services/api';

// ==========================================
// 🕒 COMPONENT: TimePicker24 (ตัวเลือกเวลา 24 ชม.)
// ==========================================
const TimePicker24 = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
  // แยกชั่วโมงกับนาทีจากค่าเดิม (เช่น "08:30")
  const [hh, mm] = value ? value.split(':') : ['', ''];

  // สร้างตัวเลือก 00-23
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  // สร้างตัวเลือก 00-55 (ทีละ 5 นาที)
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')); 

  const handleChange = (type: 'hh' | 'mm', newVal: string) => {
    const currentH = hh || '08'; // Default 8 โมง
    const currentM = mm || '00';
    
    if (type === 'hh') onChange(`${newVal}:${currentM}`);
    else onChange(`${currentH}:${newVal}`);
  };

  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">{label}</label>
      <div className="flex items-center gap-1">
        {/* เลือกชั่วโมง */}
        <select 
          value={hh} 
          onChange={(e) => handleChange('hh', e.target.value)}
          className="w-full p-2 border rounded-lg bg-slate-50 text-center font-variant-numeric tabular-nums text-lg font-bold appearance-none cursor-pointer hover:bg-slate-100 text-slate-900"
        >
          {!value && <option value="">--</option>}
          {hours.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-slate-400 font-bold">:</span>
        {/* เลือกนาที */}
        <select 
          value={mm} 
          onChange={(e) => handleChange('mm', e.target.value)}
          className="w-full p-2 border rounded-lg bg-slate-50 text-center font-variant-numeric tabular-nums text-lg font-bold appearance-none cursor-pointer hover:bg-slate-100 text-slate-900"
        >
          {!value && <option value="">--</option>}
          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
};

// ==========================================
// 🎨 CONFIG & STYLES
// ==========================================

const TYPE_COLORS: Record<string, string> = {
  'Survey': 'bg-emerald-100 border-l-4 border-emerald-500 text-emerald-800',
  'Design': 'bg-violet-100 border-l-4 border-violet-500 text-violet-800',
  'Programming': 'bg-slate-800 border-l-4 border-slate-500 text-slate-100', // Dark theme
  'Site inspection': 'bg-orange-100 border-l-4 border-orange-500 text-orange-800',
  'General': 'bg-gray-100 border-l-4 border-gray-400 text-gray-700'
};

const ACTIVITY_TYPES = ['Survey', 'Design', 'Programming', 'Site inspection', 'General'];

// ==========================================
// 🧩 MAIN COMPONENT
// ==========================================

export default function SchedulePage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // State หลัก
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // วันนี้ YYYY-MM-DD
  const [activities, setActivities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Edit State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    title: '', 
    details: '', 
    start: '', 
    end: '', 
    type: 'Site inspection', 
    projectId: '', 
    locationText: '', 
    coordinates: '', // พิกัด GPS
    photos: [] as File[]
  });

  // 🔄 Initial Load
  useEffect(() => {
    fetchProjects();
  }, []);

  // 🔄 Fetch Activities
  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [date, user]);

  // 🔄 Auto-fill Coordinates from Project
  useEffect(() => {
    if (formData.projectId && formData.type === 'Site inspection') {
      const selectedProject = projects.find(p => 
        (p.documentId === formData.projectId) || (p.id == formData.projectId)
      );

      if (selectedProject?.coordinates) {
        setFormData(prev => ({
          ...prev,
          coordinates: selectedProject.coordinates
        }));
      }
    }
  }, [formData.projectId, formData.type, projects]);

  const fetchProjects = async () => {
    try {
      const res = await getAllProjects();
      setProjects(res || []);
    } catch (err) {
      console.error("Failed to load projects", err);
    }
  };

  const fetchActivities = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getUserActivities(user.id, date); 
      setActivities(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ ฟังก์ชันดึง GPS (Check-in)
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }
    
    alert("กำลังดึงพิกัด GPS... กรุณารอสักครู่");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = `${latitude},${longitude}`;
        setFormData(prev => ({ ...prev, coordinates: coords }));
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("ไม่สามารถดึงตำแหน่งได้ กรุณาเปิด GPS และอนุญาตสิทธิ์");
      },
      { enableHighAccuracy: true }
    );
  };

  // ✅ ฟังก์ชันเปิด Modal เพื่อสร้างใหม่
  const handleCreateClick = () => {
     setEditingId(null); 
     setFormData({
        title: '', details: '', start: '', end: '', 
        type: 'Site inspection', projectId: '', locationText: '', 
        coordinates: '',
        photos: []
     });
     setIsFormOpen(true);
  };

  // ✅ ฟังก์ชันเปิด Modal เพื่อแก้ไข
  const handleEditClick = (act: any) => {
     setEditingId(act.documentId || act.id);
     setFormData({
        title: act.title,
        details: act.details,
        start: act.startTime, // HH:mm
        end: act.endTime || '',
        type: act.type || 'General',
        projectId: act.projectId || '',
        locationText: act.locationText || '',
        coordinates: act.coordinates || '',
        photos: []
     });
     setIsFormOpen(true);
  };

  // 📝 Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    try {
      if (editingId) {
         // 🟡 Update
         await updateUserActivity(editingId, {
            ...formData,
         });
      } else {
         // 🟢 Create
         await createUserActivity({
            ...formData,
            date: date,
            userId: user.id
         });
      }
      
      setIsFormOpen(false);
      fetchActivities(); 

    } catch (error) {
      alert("บันทึกไม่สำเร็จ โปรดลองใหม่");
    } finally {
      setSubmitting(false);
    }
  };

  // 🗑️ Handle Delete
  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบรายการนี้ใช่ไหม?")) return;
    try {
      await deleteUserActivity(id);
      fetchActivities();
    } catch (error) {
      alert("ลบไม่สำเร็จ");
    }
  };

  // 📋 Handle Report Generation
  const handleOpenReport = async () => {
    if (!user) return;
    const text = await generateLineReport(user.id, date);
    setReportText(text);
    setIsReportOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportText);
    alert("คัดลอกรายงานแล้ว! นำไปวางใน Line ได้เลย");
    setIsReportOpen(false);
  };

  // ==========================================
  // 🖼️ RENDER UI
  // ==========================================
  
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* 1. Header & Date Picker */}
      <div className="bg-white px-4 pt-4 pb-2 sticky top-0 z-10 shadow-sm border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <Link href="/manage" className="p-2 -ml-2 text-slate-500">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-lg font-bold text-slate-800">ตารางงานของฉัน</h1>
          <button 
            onClick={handleOpenReport}
            className="text-blue-600 font-medium text-sm flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full"
          >
            <Share size={16} /> สรุป
          </button>
        </div>

        <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg">
          <Calendar className="text-slate-500" size={20} />
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent w-full text-slate-800 font-medium outline-none"
          />
        </div>
      </div>

      {/* 2. Timeline Content */}
      <div className="p-4 max-w-xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p>ยังไม่มีกิจกรรมในวันนี้</p>
            <p className="text-sm">กดปุ่ม + ด้านล่างเพื่อเริ่มบันทึก</p>
          </div>
        ) : (
          <div className="space-y-3 relative">
             <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200 z-0 hidden sm:block"></div>

             {activities.map((act) => (
               <div key={act.id} className="relative z-10 flex gap-3">
                 {/* Time Column */}
                 <div className="w-14 pt-2 text-right flex-shrink-0">
                    <div className="text-sm font-bold text-slate-700">{act.startTime}</div>
                    <div className="text-xs text-slate-400">{act.endTime || "..."}</div>
                 </div>

                 {/* Card */}
                 <div className={`flex-1 p-3 rounded-lg shadow-sm border ${TYPE_COLORS[act.type] || TYPE_COLORS.General}`}>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold">{act.title}</h3>
                      <div className="flex gap-2">
                        <button 
                           onClick={() => handleEditClick(act)} 
                           className="text-slate-400 hover:text-blue-600 bg-white/50 p-1 rounded-full transition-colors"
                        >
                           <Pencil size={16} />
                        </button>
                        <button 
                           onClick={() => handleDelete(act.documentId || act.id)} 
                           className="text-slate-400 hover:text-red-500 bg-white/50 p-1 rounded-full transition-colors"
                        >
                           <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Location & Map Link */}
                    <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                      <div className="flex items-center gap-1 opacity-90">
                        <MapPin size={14} />
                        <span>{act.location}</span>
                      </div>
                      
                      {act.coordinates && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${act.coordinates}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded text-xs font-bold"
                        >
                          <ExternalLink size={12} />
                          ดูแผนที่
                        </a>
                      )}
                    </div>

                    {act.details && <p className="text-sm mt-2 opacity-80 whitespace-pre-line">{act.details}</p>}

                    {act.photos?.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {act.photos.map((p: any, idx: number) => (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img 
                            key={idx} 
                            src={p.url} 
                            alt="Log" 
                            className="w-16 h-16 object-cover rounded-md border border-slate-300" 
                           />
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-2">
                       <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 bg-black/10 px-2 py-0.5 rounded">
                         {act.type}
                       </span>
                    </div>
                 </div>
               </div>
             ))}
          </div>
        )}
      </div>

      {/* 3. Floating Action Button (FAB) */}
      <button 
        onClick={handleCreateClick}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95 z-40"
      >
        <Plus size={28} />
      </button>


      {/* =======================
          MODAL: CREATE / EDIT ACTIVITY
          ======================= */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingId ? 'แก้ไขกิจกรรม' : 'บันทึกกิจกรรม'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-500"><X /></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              <form id="activity-form" onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. เวลา (ใช้ TimePicker24) */}
                <div className="grid grid-cols-2 gap-3">
                  <TimePicker24 
                    label="เวลาเริ่ม" 
                    value={formData.start} 
                    onChange={(val) => setFormData({...formData, start: val})}
                  />
                  <TimePicker24 
                    label="เวลาจบ (ถ้ามี)" 
                    value={formData.end} 
                    onChange={(val) => setFormData({...formData, end: val})}
                  />
                </div>

                {/* 2. ประเภทกิจกรรม */}
                <div>
                   <label className="text-xs text-slate-500 mb-1 block">ประเภทงาน</label>
                   <div className="grid grid-cols-2 gap-2">
                      {ACTIVITY_TYPES.map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({...formData, type: type})}
                          className={`text-sm py-2 px-1 rounded border transition-all ${
                            formData.type === type 
                              ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' 
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                   </div>
                </div>

                {/* 3. รายละเอียด */}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">หัวข้อกิจกรรม</label>
                  <input 
                    type="text" required placeholder="เช่น ตรวจงานเสาเข็ม, ประชุมทีม"
                    className="w-full p-3 border rounded-lg text-slate-900"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div>
                   <input 
                    type="text" placeholder="รายละเอียดเพิ่มเติม (Optional)"
                    className="w-full p-3 border rounded-lg text-sm text-slate-900"
                    value={formData.details}
                    onChange={e => setFormData({...formData, details: e.target.value})}
                  />
                </div>

                {/* 4. สถานที่ */}
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs text-slate-500 block">สถานที่ / ไซต์งาน</label>
                  
                  <select 
                    className="w-full p-3 border rounded-lg bg-white text-slate-900"
                    value={formData.projectId}
                    onChange={(e) => {
                       setFormData({
                         ...formData, 
                         projectId: e.target.value, 
                         locationText: '' 
                       });
                    }}
                  >
                    <option value="">-- ไม่ระบุ / นอกสถานที่ --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.documentId || p.id}>{p.name}</option>
                    ))}
                  </select>

                  {!formData.projectId && (
                    <input 
                      type="text" placeholder="ระบุชื่อสถานที่ (เช่น ร้านวัสดุ, HomePro)"
                      className="w-full p-3 border rounded-lg text-sm bg-slate-50 text-slate-900"
                      value={formData.locationText}
                      onChange={e => setFormData({...formData, locationText: e.target.value})}
                    />
                  )}

                  {/* พิกัด GPS */}
                  <div className="flex gap-2 items-center mt-2">
                     <div className="flex-1 relative">
                        <input 
                          type="text" 
                          placeholder="พิกัด (Lat, Long)" 
                          className="w-full p-2 pl-8 border rounded-lg text-xs bg-slate-50 text-slate-500"
                          value={formData.coordinates}
                          readOnly 
                        />
                        <MapPin size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                     </div>
                     <button
                       type="button"
                       onClick={handleGetLocation}
                       className="bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-200 active:scale-95 transition-all"
                     >
                       <LocateFixed size={16} />
                       เช็คอิน
                     </button>
                  </div>
                  {formData.coordinates && formData.projectId && formData.type === 'Site inspection' && (
                    <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1">
                       <MapPin size={10} /> ใช้พิกัดจากฐานข้อมูลโครงการ
                    </div>
                 )}
                </div>

                {/* 5. รูปภาพ */}
                <div className="pt-2 border-t">
                  <label className="flex items-center gap-2 text-blue-600 font-bold cursor-pointer bg-blue-50 p-3 rounded-lg justify-center border border-dashed border-blue-300">
                    <ImageIcon size={20} />
                    <span>{editingId ? 'เพิ่มรูปภาพเพิ่ม' : 'เพิ่มรูปภาพประกอบ'}</span>
                    <input 
                      type="file" multiple accept="image/*" className="hidden"
                      onChange={(e) => {
                        if (e.target.files) {
                           setFormData({...formData, photos: Array.from(e.target.files)});
                        }
                      }}
                    />
                  </label>
                  {formData.photos.length > 0 && (
                    <div className="text-xs text-slate-500 mt-2 text-center">
                       เลือกเพิ่ม {formData.photos.length} รูป
                    </div>
                  )}
                </div>

              </form>
            </div>

            <div className="p-4 border-t bg-white">
               <button 
                form="activity-form"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:bg-slate-300 flex justify-center items-center gap-2"
               >
                 {submitting && <Loader2 className="animate-spin" />}
                 {submitting ? 'บันทึก' : (editingId ? 'บันทึกการแก้ไข' : 'บันทึกกิจกรรม')}
               </button>
            </div>
          </div>
        </div>
      )}


      {/* =======================
          MODAL: REPORT PREVIEW
          ======================= */}
      {isReportOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
              <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                 <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                 สรุปรายงานวันนี้
              </h3>
              <button onClick={() => setIsReportOpen(false)}><X className="text-emerald-800" /></button>
            </div>
            
            <div className="p-4">
              <textarea 
                className="w-full h-64 p-3 bg-slate-50 border rounded-lg text-sm font-mono leading-relaxed resize-none focus:outline-emerald-500 text-slate-900"
                value={reportText}
                readOnly
              ></textarea>
            </div>

            <div className="p-4 border-t flex gap-3">
              <button 
                onClick={() => setIsReportOpen(false)}
                className="flex-1 py-3 text-slate-500 font-bold"
              >
                ปิด
              </button>
              <button 
                onClick={copyToClipboard}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 flex justify-center items-center gap-2"
              >
                <Copy size={18} /> คัดลอกส่ง LINE
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}