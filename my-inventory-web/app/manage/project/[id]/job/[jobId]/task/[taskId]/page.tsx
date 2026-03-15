// app/manage/project/[id]/job/[jobId]/task/[taskId]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { 
  fetchTaskWithLogs, 
  createTaskLog, 
  updateTaskLog, 
  deleteTaskLog,
  fetchProjectJobs ,
  fetchDictionary,         // ✨ เพิ่มตัวนี้
  createDictionaryWord     // ✨ เพิ่มตัวนี้
} from "@/services/api";
import { STRAPI_URL } from "@/services/config";
import { resizeImage } from "@/utils/imageResizer"; 
import { SmartInput } from "@/app/components/SmartInput"; // ปรับ Path ตามจริงของคุณกร





// ✅ เพิ่มพิมพ์เขียวสำหรับ รูปภาพ
interface MediaImage {
  id: number;
  url: string;
}
// ✅ เพิ่มพิมพ์เขียวสำหรับ Log ของงาน
interface TaskLog {
  id: number;
  documentId: string;
  Description?: string;
  problems_found?: string;
  progress_percentage?: number;
  Log_Type?: 'Progress' | 'Info' | 'Defect' | 'Requirement' | 'Observation';
  action_date?: string;
  createdAt: string;
  Media?: MediaImage[];
}

// ✅ เพิ่มพิมพ์เขียวสำหรับ งาน (Task)
interface Task {
  documentId: string;
  task_name: string;
  progress: number;
  task_logs: TaskLog[];
}

// ✅ 1. ปรับ Interface ให้รองรับ Type ใหม่
interface LogFormData {
  id?: string;
  description: string;
  problems: string;
  progress: number;
  logType: 'Progress' | 'Info' | 'Defect' | 'Requirement' | 'Observation'; // 👈 เพิ่มตรงนี้
  newPhotos: File[];
  existingImages:MediaImage[];
  action_date: string;
}

// ✅ 2. เพิ่มสีและไอคอนสำหรับ Type ใหม่
const getTypeStyles = (type: string) => {
    switch (type) {
        case 'Progress': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '📈', badge: 'bg-blue-100 text-blue-700' };
        case 'Defect': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '⚠️', badge: 'bg-red-100 text-red-700' };
        
        // 👇 สีม่วง: สำหรับสเปค/ความต้องการ (Requirement)
        case 'Requirement': return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: '💎', badge: 'bg-purple-100 text-purple-700' };
        
        // 👇 สีส้ม: สำหรับข้อสังเกตหน้างาน (Observation)
        case 'Observation': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: '👀', badge: 'bg-orange-100 text-orange-800' };

        // Default: Info
        case 'Info': default: return { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', icon: 'ℹ️', badge: 'bg-cyan-100 text-cyan-700' };
    }
};

export default function TaskLogFeedPage({ params }: { params: Promise<{ id: string, jobId: string, taskId: string }> }) {
  const { id: projectId, jobId, taskId } = use(params);
  const { user } = useAuth();
  
  const [task, setTask] = useState<Task | null>(null);
  const [projectOwnerId, setProjectOwnerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // ✨ 1. State สำหรับเก็บคำแนะนำที่ดึงจาก Strapi
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);

  
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  
  const [formData, setFormData] = useState<LogFormData>({
    description: "",
    problems: "",
    progress: 0,
    logType: 'Info', 
    newPhotos: [],
    existingImages: [],
    action_date: new Date().toISOString().slice(0, 16)
  });

  // ✨ 2. ดึงคำศัพท์จาก Strapi ทุกครั้งที่เปลี่ยน Tab (Progress, Defect, ฯลฯ)
  useEffect(() => {
    const loadDictionary = async () => {
      const categoryName = `TaskLog_${formData.logType}`; // ระบุหมวดหมู่ เช่น TaskLog_Progress
      const words = await fetchDictionary(categoryName);
      setDynamicSuggestions(words);
    };
    if (isFormOpen) {
      loadDictionary();
    }
  }, [formData.logType, isFormOpen]);

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.type === 'admin';
  const isOwner = !!user && !!projectOwnerId && (user.id === projectOwnerId);
  const canManage = !!user && (isAdmin || isOwner);

  const loadData = async () => {
    try {
      setLoading(true);
      const [taskData, projectData] = await Promise.all([
          fetchTaskWithLogs(taskId),
          fetchProjectJobs(projectId)
      ]);
      setTask(taskData);
      if (projectData) {
        const owner = projectData.creator?.id || projectData.find((p: { documentId: string; creator?: { id: number } }) => p.documentId === projectId);
        setProjectOwnerId(owner);
      }
      if (taskData && formMode === 'create') {
         const lastProgressLog = taskData.task_logs?.find((l: TaskLog) => l.Log_Type === 'Progress') ;
         const currentProg = lastProgressLog ? lastProgressLog.progress_percentage : (taskData.progress || 0);
         setFormData(prev => ({ ...prev, progress: currentProg }));
      }
    } catch (error) { console.error("Error:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if(taskId && projectId) loadData(); }, [taskId, projectId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const originalFiles = Array.from(e.target.files);
      const resizedPromises = originalFiles.map(file => resizeImage(file));
      const resizedFiles = await Promise.all(resizedPromises);
      setFormData(prev => ({ ...prev, newPhotos: [...prev.newPhotos, ...resizedFiles] }));
    }
  };

  const handleEditClick = (log: TaskLog) => {
    setFormMode('edit');
    setFormData({
      id: log.documentId,
      description: log.Description || "",
      problems: log.problems_found || "",
      progress: log.progress_percentage || 0,
      logType: log.Log_Type || 'Info',
      newPhotos: [],
      existingImages: log.Media || [],
      action_date: log.action_date 
        ? new Date(log.action_date).toISOString().slice(0, 16) 
        : new Date(log.createdAt).toISOString().slice(0, 16)
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (logId: string) => {
    if (!confirm("ต้องการลบบันทึกนี้ใช่หรือไม่?")) return;
    if (!task) return;
    try {
      setLoading(true);
      await deleteTaskLog(logId, task.documentId);
      await loadData();
    } catch (error) { alert("ลบไม่สำเร็จ"); } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return alert("กรุณาระบุรายละเอียด");
    if (formData.logType === 'Defect' && !formData.problems) return alert("กรุณาระบุปัญหาที่พบ (ช่องสีแดง)");

    try {
      setSubmitting(true);
      // ✨✨ LOGIC ใหม่: ตรวจสอบและบันทึกคำใหม่ ✨✨
      const categoryName = `TaskLog_${formData.logType}`;
      const descTrimmed = formData.description.trim();

      // เงื่อนไข: ถ้าคำสั้นกว่า 50 ตัวอักษร (ไม่ใช่การพิมพ์เรียงความ) และยังไม่เคยมีในระบบ ให้แอบเซฟเลย!
      if (descTrimmed.length > 0 && descTrimmed.length <= 50 && !dynamicSuggestions.includes(descTrimmed)) {
          await createDictionaryWord(descTrimmed, categoryName);
      }
      // ถ้าเป็นปัญหา (Defect) ก็ดักเก็บคำจากช่องปัญหาด้วย
      const problemTrimmed = formData.problems.trim();
      if (formData.logType === 'Defect' && problemTrimmed.length > 0 && problemTrimmed.length <= 50) {
          // แอบดึงคำศัพท์ปัญหามาเช็คก่อนว่ามีไหม
          const defectWords = await fetchDictionary('TaskLog_Defect_Problem');
          if (!defectWords.includes(problemTrimmed)) {
              await createDictionaryWord(problemTrimmed, 'TaskLog_Defect_Problem');
          }
      }
      // ✨✨ จบ LOGIC บันทึกคำใหม่ ✨✨

      const payload = {
          description: formData.description,
          problems: formData.problems,
          progress: formData.progress,
          logType: formData.logType, 
          photos: formData.newPhotos,
          action_date: formData.action_date
      };

      if (formMode === 'create') {
        await createTaskLog(taskId, payload);
      } else {
        const existingIds = formData.existingImages.map(img => img.id);
        await updateTaskLog(formData.id!, payload, existingIds, taskId); 
      }
      setIsFormOpen(false);
      setFormMode('create');
      setFormData(prev => ({ 
          ...prev, 
          description: "", problems: "", logType: 'Info', newPhotos: [], existingImages: [], 
          action_date: new Date().toISOString().slice(0, 16) 
      }));
      await loadData();
    } catch (error) { alert("บันทึกไม่สำเร็จ"); } finally { setSubmitting(false); }
  };

  const TypeButton = ({ type, label, icon, activeColor }: { type: 'Progress' | 'Info' | 'Defect' | 'Requirement' | 'Observation', label: string, icon: string, activeColor: string }) => (
      <button 
          type="button"
          onClick={() => setFormData({ ...formData, logType: type })}
          className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1
            ${formData.logType === type 
                ? `${activeColor} border-transparent shadow-sm scale-105` 
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
      >
          <span>{icon}</span> {label}
      </button>
  );

  const removeNewPhoto = (index: number) => {
    const updated = [...formData.newPhotos];
    updated.splice(index, 1);
    setFormData({ ...formData, newPhotos: updated });
  };
  const removeExistingImage = (id: number) => {
    setFormData({ ...formData, existingImages: formData.existingImages.filter(img => img.id !== id) });
  };

  if (loading && !task) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  const currentProgress = task?.progress || 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans relative">
      <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={`/manage/project/${projectId}/job/${jobId}`} className="text-slate-400 text-2xl">←</Link>
          <div className="flex-1">
            <h1 className="font-bold text-slate-800 text-base truncate">{task?.task_name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500"><span className="text-blue-600 font-bold">Total Progress: {currentProgress}%</span></div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-100"><div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${currentProgress}%` }} /></div>
      </div>

      <main className="p-4 max-w-lg mx-auto space-y-6 mt-2">
        {(!task?.task_logs || task.task_logs.length === 0) ? (
          <div className="text-center py-12 flex flex-col items-center opacity-60"><div className="text-4xl mb-2">📋</div><p className="text-slate-400">{canManage ? "เริ่มบันทึกหน้างาน (Site Diary)\nกดปุ่มด้านล่างได้เลย" : "ยังไม่มีบันทึกการทำงาน"}</p></div>
        ) : (
          task?.task_logs.map((log: TaskLog) => {
              const style = getTypeStyles(log.Log_Type || 'Info');
              const logDate = log.action_date ? new Date(log.action_date) : new Date(log.createdAt);
              
              return (
                <div key={log.id} className="relative pl-6 border-l-2 border-slate-200 pb-6 last:border-0 last:pb-0">
                  <div className={`absolute -left-[11px] top-0 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center text-[10px] shadow-sm z-10 ${style.border}`}>{style.icon}</div>
                  <div className={`p-4 rounded-2xl shadow-sm border relative -top-2 ${style.bg} ${style.border}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${style.badge}`}>{log.Log_Type || 'Info'}</span>
                         <span className="text-[10px] text-slate-400">
                            {logDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit' })}
                         </span>
                      </div>
                      {canManage && (
                          <div className="flex gap-2 bg-white/50 rounded-lg px-1">
                            <button onClick={() => handleEditClick(log)} className="text-slate-400 hover:text-blue-600 text-[10px] p-1">✏️</button>
                            <button onClick={() => handleDeleteClick(log.documentId)} className="text-slate-400 hover:text-red-600 text-[10px] p-1">🗑️</button>
                          </div>
                      )}
                    </div>
                    {log.Log_Type === 'Progress' && (<div className="flex items-center gap-2 mb-2"><div className="h-1.5 w-24 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${log.progress_percentage}%` }}></div></div><span className="text-xs font-bold text-blue-700">{log.progress_percentage}%</span></div>)}
                    <p className={`text-sm mb-2 whitespace-pre-wrap leading-relaxed ${style.text}`}>{log.Description}</p>
                    {(log.problems_found || log.Log_Type === 'Defect') && log.problems_found && (<div className="bg-red-100/50 border border-red-200 p-2 rounded-lg text-xs text-red-700 mb-2 flex gap-2 items-start"><span>⚠️</span> <span>{log.problems_found}</span></div>)}
                    {log.Media && log.Media.length > 0 && (<div className="grid grid-cols-2 gap-2 mt-3">{log.Media.map((img: MediaImage) => (<img key={img.id} src={img.url.startsWith('http') ? img.url : `${STRAPI_URL}${img.url}`} className="w-full h-24 object-cover rounded-lg bg-white border border-slate-100 shadow-sm" alt="Task Evidence"/>))}</div>)}
                  </div>
                </div>
              );
          })
        )}
      </main>

      {canManage && (
          <div className={`fixed bottom-0 left-0 right-0 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-30 transition-transform duration-300 rounded-t-[2rem] border-t ${isFormOpen ? 'translate-y-0' : 'translate-y-[100%]'}`}>
             {!isFormOpen && (
                <div className="absolute -top-20 right-4 left-4"><button onClick={() => { setFormMode('create'); setIsFormOpen(true); }} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"><span>📝</span> บันทึก Site Diary</button></div>
             )}
             {isFormOpen && (
               <div className="p-6 max-h-[85vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6 sticky top-0 bg-white py-2 z-10">
                   <h3 className="font-bold text-slate-800 text-lg">{formMode === 'create' ? '📝 บันทึกงานใหม่' : '✏️ แก้ไขบันทึก'}</h3>
                   <button onClick={() => setIsFormOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">✕</button>
                 </div>
                 <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 ml-1 block mb-1">📅 วันที่/เวลาที่บันทึก</label>
                        <input 
                            type="datetime-local" 
                            className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none font-bold text-slate-700" 
                            value={formData.action_date}
                            onChange={(e) => setFormData({...formData, action_date: e.target.value})}
                        />
                    </div>

                    {/* ✅ 3. ปรับปุ่มเลือก Type ให้ครบ 5 แบบ แบ่ง 2 แถว */}
                    <div className="space-y-2">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                            <TypeButton type="Progress" label="คืบหน้า" icon="📈" activeColor="bg-blue-600 text-white" />
                            <TypeButton type="Defect" label="ปัญหา" icon="⚠️" activeColor="bg-red-500 text-white" />
                            <TypeButton type="Info" label="ทั่วไป" icon="ℹ️" activeColor="bg-cyan-500 text-white" />
                        </div>
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                             <TypeButton type="Requirement" label="สเปค/บรีฟลูกค้า" icon="💎" activeColor="bg-purple-600 text-white" />
                             <TypeButton type="Observation" label="ข้อสังเกตหน้างาน" icon="👀" activeColor="bg-orange-500 text-white" />
                        </div>
                    </div>

                    {/* Progress Bar (แสดงเฉพาะเมื่อเลือก Progress) */}
                    {formData.logType === 'Progress' && (<div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2"><div className="flex justify-between text-xs text-blue-600 mb-2"><label className="font-bold">อัปเดตความคืบหน้า (%)</label><span className="font-bold text-2xl">{formData.progress}%</span></div><input type="range" min="0" max="100" step="5" value={formData.progress} onChange={e => setFormData({...formData, progress: Number(e.target.value)})} className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /><p className="text-[10px] text-blue-400 mt-2 text-center">*ค่านี้จะถูกนำไปคำนวณ Progress รวมของงาน</p></div>)}
                    
                    {/* ✅ 4. Placeholder ปรับตาม Type */}
                    {/* ✅ 1. กล่องรายละเอียดการทำงาน (ใช้ SmartInput แบบหลายบรรทัด) */}
                    <SmartInput 
                        multiline={true}
                        rows={4}
                        placeholder={
                            formData.logType === 'Defect' ? "รายละเอียดปัญหาที่พบหน้างาน..." : 
                            formData.logType === 'Requirement' ? "ระบุสเปควัสดุ หรือบรีฟจากลูกค้า (เช่น ปูน 240ksc)..." :
                            formData.logType === 'Observation' ? "สภาพหน้างานที่พบ (เช่น ดินทรุด, ทางแคบ)..." :
                            "อธิบายรายละเอียดการทำงาน..."
                        }
                        value={formData.description}
                        onValueChange={(val) => setFormData({...formData, description: val})}
                        suggestions={dynamicSuggestions} // 👈 เปลี่ยนจาก DICTIONARY[...] เป็นตัวนี้
                    />

                    {/* ✅ 2. กล่องระบุหัวข้อปัญหา (ซ่อน/แสดงตามประเภท Log) */}
                    <div className={`transition-all duration-300 overflow-hidden ${formData.logType === 'Defect' ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                        <SmartInput 
                            multiline={false}
                            placeholder="⚠️ ระบุหัวข้อปัญหา (จำเป็นต้องระบุ)*"
                            value={formData.problems}
                            onValueChange={(val) => setFormData({...formData, problems: val})}
                            isError={true} // ให้กล่องเป็นสีแดงเสมอเพราะเป็นหน้าปัญหา
                            suggestions={["โครงสร้าง", "สถาปัตย์", "ระบบไฟ", "ระบบน้ำ", "เครื่องจักร", "สภาพอากาศ", "วัสดุ"]} 
                        />
                    </div>

                    
                    <div className="space-y-2 pt-2"><label className="text-xs font-bold text-slate-500 ml-1">รูปภาพแนบ</label><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{formData.existingImages.map((img) => (<div key={img.id} className="relative flex-shrink-0 w-20 h-20 group"><img src={img.url.startsWith('http') ? img.url : `${STRAPI_URL}${img.url}`} className="w-full h-full object-cover rounded-xl border shadow-sm" /><button type="button" onClick={() => removeExistingImage(img.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-white text-red-500 rounded-full text-xs shadow-md border border-slate-100 flex items-center justify-center">✕</button></div>))}{formData.newPhotos.map((file, idx) => (<div key={idx} className="relative flex-shrink-0 w-20 h-20 group"><img src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded-xl border shadow-sm opacity-90" /><button type="button" onClick={() => removeNewPhoto(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-700 text-white rounded-full text-xs shadow-md flex items-center justify-center">✕</button></div>))}
                    <label className="flex-shrink-0 w-20 h-20 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer text-slate-400 transition-colors">
                        <span className="text-xl">📷</span>
                        <span className="text-[10px] font-bold">เพิ่มรูป</span>
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                    </div></div>

                    <button type="submit" disabled={submitting} className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] ${formData.logType === 'Progress' ? 'bg-blue-600 hover:bg-blue-700' : formData.logType === 'Defect' ? 'bg-red-500 hover:bg-red-600' : formData.logType === 'Requirement' ? 'bg-purple-600 hover:bg-purple-700' : formData.logType === 'Observation' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-cyan-500 hover:bg-cyan-600'}`}>{submitting ? "กำลังบันทึก..." : (formMode === 'create' ? "บันทึกข้อมูล" : "อัปเดตการแก้ไข")}</button>
                 </form>
               </div>
             )}
          </div>
      )}
    </div>
  );
}