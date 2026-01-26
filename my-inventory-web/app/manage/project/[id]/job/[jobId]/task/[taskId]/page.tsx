"use client";

import { useEffect, useState, use } from "react";
import { fetchTaskWithLogs, createTaskLog, STRAPI_URL } from "@/services/api";
import Link from "next/link";

export default function TaskLogFeedPage({ params }: { params: Promise<{ id: string, jobId: string, taskId: string }> }) {
  const { id, jobId, taskId } = use(params);
  const [task, setTask] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State สำหรับการ "โพสต์" ใหม่
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const loadData = async () => {
    try {
      // เรียกข้อมูล Task และ Logs ที่เกี่ยวข้องทั้งหมด
      const data = await fetchTaskWithLogs(taskId);
      setTask(data);
      setLogs(data.task_logs || []);
    } catch (err) {
      console.error("Fetch Feed Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [taskId]);

  // ในไฟล์ page.tsx
const handlePost = async () => {
  if (!description && photos.length === 0) return alert("กรุณาใส่รายละเอียดหรือรูปภาพ");
  try {
    setLoading(true);
    // ✅ ส่งตัวแปรชื่อ description (ให้ตรงกับ State ด้านบน)
    await createTaskLog(taskId, { description: description, photos: photos }); 
    setDescription(""); 
    setPhotos([]);
    await loadData(); 
  } catch (err) {
    alert("ไม่สามารถบันทึกข้อมูลได้");
  } finally {
    setLoading(false);
  }
};

  if (loading && !task) return <div className="p-10 text-center italic">กำลังเปิดสมุดบันทึกงาน...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <header className="bg-white p-4 border-b flex items-center gap-4 sticky top-0 z-30 shadow-sm">
        <Link href={`/manage/project/${id}/job/${jobId}`} className="text-slate-400 p-2">←</Link>
        <div>
           <h1 className="font-bold text-slate-800 leading-tight">{task?.task_name}</h1>
           <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Timeline Logbook</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* ส่วนการ "โพสต์" (Add TaskLog) */}
        <section className="bg-white rounded-[32px] p-6 shadow-sm border border-blue-100 space-y-4 animate-in fade-in zoom-in duration-300">
          <textarea 
            placeholder="รายงานความคืบหน้า หรือ ปัญหาที่พบ..."
            className="w-full bg-slate-50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <label className="cursor-pointer bg-slate-100 p-2 rounded-xl hover:bg-slate-200 transition-colors">
              <span className="text-xs text-slate-600 font-bold">📸 แนบรูปภาพ ({photos.length})</span>
              <input type="file" multiple hidden onChange={(e) => setPhotos(Array.from(e.target.files || []))} />
            </label>
            <button 
              onClick={handlePost}
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50 transition-all"
            >
              {loading ? "กำลังส่ง..." : "โพสต์"}
            </button>
          </div>
        </section>

        {/* รายการ Feed (Timeline) */}
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic bg-white rounded-[32px] border-2 border-dashed">
              ยังไม่มีการบันทึกงานในรายการนี้
            </div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    {new Date(log.createdAt).toLocaleString('th-TH')}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">{log.description}</p>
                
                {/* แสดงรูปภาพใน Log */}
                <div className="grid grid-cols-2 gap-2">
                  {log.Media?.map((img: any) => (
                    <img key={img.id} src={`${STRAPI_URL}${img.url}`} className="rounded-2xl w-full h-40 object-cover border border-slate-50" alt="evidence" />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}