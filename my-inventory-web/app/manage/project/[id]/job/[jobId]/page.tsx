"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
// ✅ เช็คให้ชัวร์ว่า api.ts ของคุณ export ฟังก์ชัน updateJob แล้วนะครับ
import { 
  fetchJobDetailsById, 
  deleteJobTask, 
  updateJobTask, 
  createJobTask, 
  updateJob
} from "@/services/api"; 
import { STRAPI_URL } from "@/services/config";
import { useRouter } from "next/navigation";

export default function JobDetailPage({ params }: { params: Promise<{ id: string, jobId: string }> }) {
  const { id, jobId } = use(params); 
  const router = useRouter();
  
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal แก้ไข
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  // State สำหรับ Modal สร้างงานใหม่
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTask, setNewTask] = useState({ taskName: "", quantity: "", unit: "" });
  const [submitting, setSubmitting] = useState(false);

  // 🔄 ฟังก์ชันช่วยคำนวณและ Sync Progress กลับเข้า Job (แม่)
  const syncJobProgress = async (jobData: any) => {
    if (!jobData || !jobData.job_tasks) return;

    const tasks = jobData.job_tasks;
    // สูตรคำนวณค่าเฉลี่ย (ถ้าไม่มีงานเลย ให้เป็น 0)
    let newAvgProgress = 0;
    if (tasks.length > 0) {
        const totalProgress = tasks.reduce((acc: number, curr: any) => acc + (curr.progress || 0), 0);
        newAvgProgress = Math.round(totalProgress / tasks.length);
    }

    // ถ้าค่าใน DB (jobData.progress) ไม่ตรงกับที่คำนวณได้ ให้สั่ง Update ทันที
    // เพื่อให้หน้า Project (Level 2) เห็นเลขที่ถูกต้อง
    if (jobData.progress !== newAvgProgress) {
        console.log(`🔄 Auto-Syncing Job Progress: ${jobData.progress}% -> ${newAvgProgress}%`);
        try {
            await updateJob(jobData.documentId, { progress: newAvgProgress });
        } catch (err) {
            console.error("Failed to auto-sync job progress", err);
        }
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchJobDetailsById(jobId);
      
      // ✅ เรียก Sync ทันทีหลังจากดึงข้อมูลเสร็จ
      if (data) {
          await syncJobProgress(data);
      }

      setJob(data);
    } catch (error) {
      console.error("Error loading job:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [jobId]);

  // ฟังก์ชันลบ Task
  const handleDelete = async (e: React.MouseEvent, taskDocId: string, taskName: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    if(!confirm(`ต้องการลบงาน "${taskName}" ใช่หรือไม่?\n(Log และรูปภาพทั้งหมดจะถูกลบไปด้วย)`)) return;
    try {
      setLoading(true);
      await deleteJobTask(taskDocId);
      await loadData(); // ✅ พอโหลดใหม่ มันจะ Sync ค่าเฉลี่ยใหม่ให้อัตโนมัติ
    } catch (error) {
      alert("ลบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // เปิด Modal แก้ไข
  const openEditModal = (e: React.MouseEvent, task: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingTask({ ...task }); 
    setIsEditOpen(true);
  };

  // บันทึกการแก้ไข
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateJobTask(editingTask.documentId, editingTask);
      setIsEditOpen(false);
      setEditingTask(null);
      await loadData(); // ✅ โหลดใหม่เพื่อ Sync ค่าเฉลี่ย
    } catch (error) {
      alert("แก้ไขไม่สำเร็จ");
    }
  };

  // บันทึกการสร้างงานใหม่
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.taskName || !newTask.quantity) return alert("กรุณากรอกข้อมูลให้ครบ");

    try {
      setSubmitting(true);
      await createJobTask(
        newTask.taskName,
        job.documentId, 
        Number(newTask.quantity),
        newTask.unit
      );

      setNewTask({ taskName: "", quantity: "", unit: "" });
      setIsCreateOpen(false);
      await loadData(); // ✅ โหลดใหม่เพื่อ Sync ค่าเฉลี่ย (ตัวหารเปลี่ยน ค่าเฉลี่ยเปลี่ยน)
    } catch (error) {
      console.error(error);
      alert("สร้างงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !job) return <div className="p-10 text-center text-slate-400">Loading...</div>;
  if (!job) return <div className="p-10 text-center text-red-500">Not Found</div>;

  const tasks = job.job_tasks || [];
  // คำนวณเพื่อแสดงผลบนหน้าจอ (Display Only)
  const totalProgress = tasks.reduce((acc: number, curr: any) => acc + (curr.progress || 0), 0);
  const avgProgress = tasks.length > 0 ? Math.round(totalProgress / tasks.length) : 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32 relative">
      
      {/* Header */}
      <div className="bg-slate-900 text-white pt-6 pb-12 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <Link href={`/manage/project/${id}`} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition text-xl">←</Link>
          <div className="flex-1 overflow-hidden">
             <div className="text-xs text-slate-300 uppercase tracking-wider">หมวดงาน</div>
             <h1 className="text-xl font-bold truncate">{job.title || "รายละเอียดงาน"}</h1>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
          <div>
            <div className="text-sm text-slate-300 mb-1">ความคืบหน้าหมวดนี้</div>
            <div className="text-4xl font-bold">{avgProgress}%</div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-slate-600 flex items-center justify-center relative bg-slate-800">
             <div 
                className="absolute inset-0 rounded-full border-4 border-blue-400 transition-all duration-1000" 
                style={{ clipPath: `inset(${100 - avgProgress}% 0 0 0)` }}
             ></div>
             <span className="text-[10px] text-slate-300 relative z-10">Overall</span>
          </div>
        </div>
      </div>

      {/* Task List */}
      <main className="px-4 -mt-6 relative z-10 space-y-4">
        {tasks.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl text-center text-slate-400 shadow-sm border border-slate-100 flex flex-col items-center gap-2">
            <span className="text-4xl">📦</span>
            <span>ยังไม่มีงานย่อยในหมวดนี้</span>
          </div>
        ) : (
          tasks.map((task: any) => {
            // ✅ Logic เลือกรูปภาพปก: หา Log ที่มีรูป -> เอา Log ใหม่สุด -> เอารูปแรก
            const lastLogWithImage = task.task_logs?.find((log:any) => log.Media && log.Media.length > 0);
            const lastImage = lastLogWithImage?.Media?.[0];

            return (
              <Link 
                key={task.id} 
                href={`/manage/project/${id}/job/${jobId}/task/${task.documentId}`}
                className="block bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.99] transition-all relative group"
              >
                {/* ปุ่มจัดการ (Edit / Delete) */}
                <div className="absolute top-4 right-4 flex gap-2 z-20">
                  <button 
                    onClick={(e) => openEditModal(e, task)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-full transition-colors shadow-sm"
                  >
                    ✎
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, task.documentId, task.task_name)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-full transition-colors shadow-sm"
                  >
                    🗑
                  </button>
                </div>

                <div className="flex gap-4 pr-16">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-100">
                    {lastImage ? (
                      <img 
                        src={lastImage.url.startsWith('http') ? lastImage.url : `${STRAPI_URL}${lastImage.url}`} 
                        className="w-full h-full object-cover" 
                        alt="Thumbnail"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-xl">📋</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-base mb-1 truncate">{task.task_name}</h3>
                    <div className="text-xs text-slate-400 mb-2">
                       เป้า: {task.quantity} {task.unit}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${task.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${task.progress || 0}%` }}></div>
                      </div>
                      <span className={`text-[10px] font-bold ${task.progress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>{task.progress}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </main>

      {/* ปุ่ม (+) แบบ Z-Index สูงสุด ป้องกันการจม */}
      <button 
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-400/50 flex items-center justify-center text-4xl pb-1 hover:bg-blue-700 active:scale-90 transition-all z-[999]"
      >
        +
      </button>

      {/* Modal แก้ไข */}
      {isEditOpen && editingTask && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-slate-800">✏️ แก้ไขงานย่อย</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">ชื่องาน</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 text-blue-900 font-medium rounded-xl border border-slate-200 outline-none"
                  value={editingTask.task_name}
                  onChange={e => setEditingTask({...editingTask, task_name: e.target.value})}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">เป้าหมาย</label>
                  <input 
                    type="number" 
                    className="w-full p-3 bg-slate-50 text-blue-950 font-bold rounded-xl border border-slate-200 outline-none"
                    value={editingTask.quantity}
                    onChange={e => setEditingTask({...editingTask, quantity: e.target.value})}
                  />
                </div>
                <div className="w-1/3">
                  <label className="text-xs font-bold text-slate-500 ml-1">หน่วย</label>
                  <input 
                    type="text" 
                    className="w-full p-3 text-blue-950 bg-slate-50 rounded-xl border border-slate-200 outline-none"
                    value={editingTask.unit}
                    onChange={e => setEditingTask({...editingTask, unit: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal สร้างงานใหม่ */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800">✨ เพิ่มงานใหม่</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 block mb-1">ชื่องาน</label>
                <input 
                  type="text" 
                  placeholder="เช่น เทคอนกรีต, ติดตั้งโครงเหล็ก"
                  className="w-full p-3 bg-slate-50 text-blue-900 font-medium rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newTask.taskName}
                  onChange={e => setNewTask({...newTask, taskName: e.target.value})}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 ml-1 block mb-1">เป้าหมาย</label>
                  <input 
                    type="number" 
                    placeholder="0"
                    className="w-full p-3 bg-slate-50 text-blue-950 font-bold rounded-xl border border-slate-200 outline-none"
                    value={newTask.quantity}
                    onChange={e => setNewTask({...newTask, quantity: e.target.value})}
                  />
                </div>
                <div className="w-1/3">
                  <label className="text-xs font-bold text-slate-500 ml-1 block mb-1">หน่วย</label>
                  <input 
                    type="text" 
                    placeholder="ตร.ม."
                    className="w-full p-3 text-blue-950 bg-slate-50 rounded-xl border border-slate-200 outline-none text-center"
                    value={newTask.unit}
                    onChange={e => setNewTask({...newTask, unit: e.target.value})}
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 mt-2 active:scale-95 transition-transform disabled:bg-slate-300"
              >
                {submitting ? "กำลังสร้าง..." : "สร้างงานใหม่"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}