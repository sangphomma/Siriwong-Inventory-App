"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { fetchTaskWithLogs, createTaskLog, updateTaskLog, deleteTaskLog } from "@/services/api";
import { STRAPI_URL } from "@/services/config";
import { resizeImage } from "@/utils/imageResizer"; 
import { useRouter } from "next/navigation";

// Interface
interface LogFormData {
  id?: string;
  description: string;
  problems: string;
  progress: number;
  newPhotos: File[];
  existingImages: any[];
}

export default function TaskLogFeedPage({ params }: { params: Promise<{ id: string, jobId: string, taskId: string }> }) {
  const { id, jobId, taskId } = use(params);
  
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // State Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  
  const [formData, setFormData] = useState<LogFormData>({
    description: "",
    problems: "",
    progress: 0,
    newPhotos: [],
    existingImages: []
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchTaskWithLogs(taskId);
      setTask(data);
      if (data && data.task_logs?.length > 0 && formMode === 'create') {
         setFormData(prev => ({ ...prev, progress: data.task_logs[0].progress_percentage || 0 }));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [taskId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const originalFiles = Array.from(e.target.files);
      const resizedPromises = originalFiles.map(file => resizeImage(file));
      const resizedFiles = await Promise.all(resizedPromises);
      setFormData(prev => ({ ...prev, newPhotos: [...prev.newPhotos, ...resizedFiles] }));
    }
  };

  const handleEditClick = (log: any) => {
    setFormMode('edit');
    setFormData({
      id: log.documentId,
      description: log.Description || "",
      problems: log.problems_found || "",
      progress: log.progress_percentage || 0,
      newPhotos: [],
      existingImages: log.Media || []
    });
    setIsFormOpen(true);
  };

  const handleDeleteClick = async (logId: string) => {
    if (!confirm("ต้องการลบบันทึกนี้ใช่หรือไม่?")) return;
    try {
      setLoading(true);
      await deleteTaskLog(logId, task.documentId);
      await loadData();
    } catch (error) {
      alert("ลบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return alert("กรุณาระบุรายละเอียด");

    try {
      setSubmitting(true);
      if (formMode === 'create') {
        await createTaskLog(taskId, {
          description: formData.description,
          problems: formData.problems,
          progress: formData.progress,
          photos: formData.newPhotos
        });
      } else {
        const existingIds = formData.existingImages.map(img => img.id);
        await updateTaskLog(formData.id!, {
          description: formData.description,
          problems: formData.problems,
          progress: formData.progress,
          photos: formData.newPhotos
        }, existingIds, taskId); // ส่ง taskId ไปเพื่อ sync progress
      }
      setIsFormOpen(false);
      setFormMode('create');
      setFormData(prev => ({ ...prev, description: "", problems: "", newPhotos: [], existingImages: [] }));
      await loadData();
    } catch (error) {
      alert("บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const removeNewPhoto = (index: number) => {
    const updated = [...formData.newPhotos];
    updated.splice(index, 1);
    setFormData({ ...formData, newPhotos: updated });
  };

  const removeExistingImage = (id: number) => {
    setFormData({
      ...formData,
      existingImages: formData.existingImages.filter(img => img.id !== id)
    });
  };

  if (loading && !task) return <div className="p-10 text-center text-slate-400">Loading...</div>;

  const currentProgress = task?.progress ?? task?.task_logs?.[0]?.progress_percentage ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-40 font-sans relative">
      
      {/* Header */}
      <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={`/manage/project/${id}/job/${jobId}`} className="text-slate-400 text-2xl">←</Link>
          <div className="flex-1">
            <h1 className="font-bold text-slate-800 text-base truncate">{task?.task_name}</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-blue-600 font-bold">Progress: {currentProgress}%</span>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-100">
          <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${currentProgress}%` }} />
        </div>
      </div>

      {/* Timeline List */}
      <main className="p-4 max-w-lg mx-auto space-y-6 mt-2">
        {/* ✅ เพิ่มส่วนเช็ค Empty State: ถ้าไม่มี Logs ให้แสดงข้อความ */}
        {(!task?.task_logs || task.task_logs.length === 0) ? (
          <div className="text-center py-12 flex flex-col items-center opacity-60">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-slate-400">ยังไม่มีบันทึกงาน<br/>กดปุ่มด้านล่างเพื่อเริ่มบันทึก</p>
          </div>
        ) : (
          task.task_logs.map((log: any) => (
            <div key={log.id} className="relative pl-6 border-l-2 border-slate-200 pb-4 last:border-0">
              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${log.problems_found ? "bg-red-100 border-red-500" : "bg-blue-100 border-blue-500"}`}></div>
              
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative -top-2">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] text-slate-400">
                    {log.createdAt ? new Date(log.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit' }) : '-'}
                  </span>
                  
                  <div className="flex gap-2">
                    <button onClick={() => handleEditClick(log)} className="text-slate-400 hover:text-blue-600 text-xs">✏️ แก้ไข</button>
                    <button onClick={() => handleDeleteClick(log.documentId)} className="text-slate-400 hover:text-red-600 text-xs">🗑️ ลบ</button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                   <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-600">{log.progress_percentage}%</span>
                   {log.problems_found && <span className="text-xs text-red-600 font-bold">⚠️ พบปัญหา</span>}
                </div>
                
                <p className="text-slate-800 text-sm mb-2 whitespace-pre-wrap">{log.Description}</p>
                {log.problems_found && <div className="bg-red-50 p-2 rounded text-xs text-red-700 mb-2">⚠️ {log.problems_found}</div>}

                {log.Media && log.Media.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {log.Media.map((img: any) => (
                      <img 
                        key={img.id} 
                        src={img.url.startsWith('http') ? img.url : `${STRAPI_URL}${img.url}`} 
                        className="w-full h-24 object-cover rounded-lg bg-slate-100"
                        alt="Task Evidence"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Form Action Sheet */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-30 transition-transform duration-300 rounded-t-3xl border-t ${isFormOpen ? 'translate-y-0' : 'translate-y-[100%]'}`}>
         {!isFormOpen && (
            <div className="absolute -top-20 right-4 left-4">
               <button onClick={() => { setFormMode('create'); setIsFormOpen(true); }} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
                 <span>📷</span> บันทึกความคืบหน้า
               </button>
            </div>
         )}

         {isFormOpen && (
           <div className="p-5 max-h-[85vh] overflow-y-auto">
             <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10">
               <h3 className="font-bold text-slate-800 text-lg">
                 {formMode === 'create' ? '📝 บันทึกงานใหม่' : '✏️ แก้ไขบันทึก'}
               </h3>
               <button onClick={() => setIsFormOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500">✕</button>
             </div>

             <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <label>ความคืบหน้า (%)</label>
                    <span className="font-bold text-blue-600 text-xl">{formData.progress}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={formData.progress} onChange={e => setFormData({...formData, progress: Number(e.target.value)})} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                </div>

                <textarea placeholder="รายละเอียดงาน..." className="w-full p-3 font-medium text-blue-800 bg-white border border-slate-200 rounded-xl text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                <input type="text" placeholder="⚠️ ปัญหาที่พบ (ถ้ามี)" className="w-full p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 outline-none" value={formData.problems} onChange={e => setFormData({...formData, problems: e.target.value})} />

                <div className="space-y-2">
                   <label className="text-xs font-bold text-slate-500">รูปภาพแนบ</label>
                   <div className="flex gap-2 overflow-x-auto pb-2">
                      {formData.existingImages.map((img) => (
                        <div key={img.id} className="relative flex-shrink-0 w-20 h-20">
                          <img src={img.url.startsWith('http') ? img.url : `${STRAPI_URL}${img.url}`} className="w-full h-full object-cover rounded-lg border" />
                          <button type="button" onClick={() => removeExistingImage(img.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs shadow">✕</button>
                        </div>
                      ))}
                      {formData.newPhotos.map((file, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-20 h-20">
                          <img src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded-lg border opacity-80" />
                          <button type="button" onClick={() => removeNewPhoto(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-500 text-white rounded-full text-xs shadow">✕</button>
                        </div>
                      ))}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-center text-sm font-bold flex flex-col items-center justify-center gap-1 border border-slate-200">
                         <span>📸 ถ่ายรูป</span>
                         <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                      </label>
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-center text-sm font-bold flex flex-col items-center justify-center gap-1 border border-slate-200">
                         <span>🖼️ อัลบั้ม</span>
                         <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                      </label>
                   </div>
                </div>

                <button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 disabled:bg-slate-300">
                   {submitting ? "กำลังบันทึก..." : (formMode === 'create' ? "บันทึกข้อมูล" : "อัปเดตการแก้ไข")}
                </button>
             </form>
           </div>
         )}
      </div>
    </div>
  );
}