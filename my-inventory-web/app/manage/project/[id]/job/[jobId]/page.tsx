// app/manage/project/[id]/job/[jobId]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { 
  fetchJobDetailsById, 
  fetchProjectJobs, 
  createJobTask, 
  updateJobTask, 
  deleteJobTask 
} from "@/services/api";

// --- Icons Helper ---
const Icons = {
    Back: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>),
    Task: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" /></svg>),
    Trash: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
    Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>),
    Plus: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>)
};

export default function JobDetailPage({ params }: { params: Promise<{ id: string, jobId: string }> }) {
  // แกะ Params (Next.js 15+)
  const { id: projectId, jobId } = use(params);
  
  // Auth Logic
  const { user } = useAuth();
  
  // Data State
  const [job, setJob] = useState<any>(null);
  const [projectOwnerId, setProjectOwnerId] = useState<number | null>(null); // เก็บ ID เจ้าของโปรเจค
  const [loading, setLoading] = useState(true);

  // CRUD State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newTask, setNewTask] = useState({ name: "", quantity: "", unit: "" });
  const [editingTask, setEditingTask] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // 🔐 ACCESS CONTROL LOGIC (อัปเดตใหม่)
  // 1. isAdmin: เช็คจาก Role
  const isAdmin = user?.role?.name === 'Admin' || user?.role?.type === 'admin';
  // 2. isOwner: เช็คว่า ID ของ User ตรงกับ Creator ของโปรเจคไหม
  const isOwner = !!user && !!projectOwnerId && (user.id === projectOwnerId);
  // 3. canManage: ต้อง Login + (เป็น Admin หรือ Owner) เท่านั้น ถึงจะแก้ไขได้
  // * ถ้า user เป็น null (ไม่ได้ login) -> canManage จะเป็น false ทันที (View Only Mode)
  const canManage = !!user && (isAdmin || isOwner);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      // ดึง 2 อย่าง: ข้อมูล Job และ ข้อมูล Project (เพื่อเช็ค Owner)
      const [jobData, projectData] = await Promise.all([
        fetchJobDetailsById(jobId),
        fetchProjectJobs(projectId) // เราดึง Project มาเพื่อเอา creator.id
      ]);

      setJob(jobData);

      // หา ID ของเจ้าของโปรเจค
      if (projectData) {
          // fetchProjectJobs อาจจะ return array หรือ object ขึ้นอยู่กับ api.ts
          // ปกติ fetchProjectJobs return list ของ project, เราต้องหาตัวที่ตรงกับ id
          // หรือถ้า fetchProjectJobs ใน api.ts เขียนให้ return single project ก็ใช้ได้เลย
          // เพื่อความชัวร์จาก code เก่า: fetchProjectJobs return array หรือ foundProject
           const owner = projectData.creator?.id || projectData.find((p:any) => p.documentId === projectId)?.creator?.id;
           setProjectOwnerId(owner);
      }

    } catch (error) {
      console.error("Error loading job:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId && projectId) {
      loadData();
    }
  }, [jobId, projectId]);

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name) return alert("กรุณากรอกชื่องาน");
    try {
      setSubmitting(true);
      await createJobTask(newTask.name, jobId, Number(newTask.quantity) || 0, newTask.unit || "-");
      setNewTask({ name: "", quantity: "", unit: "" });
      setIsCreateOpen(false);
      await loadData();
    } catch (err) {
      alert("สร้างงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await updateJobTask(editingTask.documentId, {
        task_name: editingTask.task_name,
        quantity: editingTask.quantity,
        unit: editingTask.unit
      });
      setEditingTask(null);
      setIsEditOpen(false);
      await loadData();
    } catch (err) {
      alert("แก้ไขไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskDocId: string) => {
    e.preventDefault();
    e.stopPropagation(); // กันไม่ให้กดแล้วเด้งไปหน้าอื่น
    if (!confirm("ต้องการลบงานย่อยนี้?")) return;
    try {
      await deleteJobTask(taskDocId);
      await loadData();
    } catch (err) {
      alert("ลบไม่สำเร็จ");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400">Loading Job...</div>;
  if (!job) return <div className="text-center mt-10">ไม่พบข้อมูล</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
        
      {/* Header Section */}
      <div className="bg-slate-900 text-white rounded-b-[2.5rem] p-6 pb-12 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        
        <div className="relative z-10">
            <Link href={`/manage/project/${projectId}`} className="inline-flex items-center gap-1 text-slate-400 text-xs mb-4 hover:text-white transition">
                <Icons.Back /> กลับไปหน้าโปรเจค
            </Link>
            
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold leading-tight mb-1">{job.title}</h1>
                    <p className="text-slate-400 text-xs font-light">รายการสิ่งที่ต้องทำในหมวดนี้</p>
                </div>
                {/* Progress Circle */}
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" />
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125} strokeDashoffset={125 - (125 * (job.progress || 0)) / 100} className="text-blue-500 transition-all duration-1000 ease-out" />
                    </svg>
                    <span className="absolute text-[10px] font-bold">{job.progress}%</span>
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-4">
        
        {/* Task List */}
        <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 min-h-[50vh]">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    📋 งานย่อย
                    <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">{job.job_tasks?.length || 0}</span>
                </h2>
                {/* 🔒 PROTECTED BUTTON: เฉพาะคนมีสิทธิ์ถึงเห็นปุ่มเพิ่ม */}
                {canManage && (
                    <button onClick={() => setIsCreateOpen(true)} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-bold hover:bg-blue-100 flex items-center gap-1 transition">
                        <Icons.Plus /> เพิ่มรายการ
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {(!job.job_tasks || job.job_tasks.length === 0) ? (
                    <div className="text-center py-10 text-slate-400 italic text-xs">ยังไม่มีรายการงานย่อย</div>
                ) : (
                    job.job_tasks.map((task: any) => (
                        <Link 
                            key={task.id} 
                            href={`/manage/project/${projectId}/job/${jobId}/task/${task.documentId || task.id}`}
                            className="block group"
                        >
                            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all relative">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-700 text-sm">{task.task_name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${task.progress === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}`}>
                                            {task.progress || 0}%
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs text-slate-500">
                                        เป้าหมาย: <span className="font-medium text-slate-800">{task.quantity} {task.unit}</span>
                                    </div>
                                    
                                    {/* 🔒 PROTECTED ACTIONS: ปุ่มแก้ไข/ลบ จะโผล่เฉพาะคนมีสิทธิ์ */}
                                    {canManage && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingTask(task); setIsEditOpen(true); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                                            >
                                                <Icons.Edit />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteTask(e, task.documentId)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                            >
                                                <Icons.Trash />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${task.progress || 0}%` }}></div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </section>

      </main>

      {/* 🔒 CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 z-[50] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
                <h3 className="font-bold text-lg mb-4 text-slate-800">สร้างงานย่อยใหม่</h3>
                <form onSubmit={handleCreateTask} className="space-y-3">
                    <input type="text" placeholder="ชื่องาน (เช่น เทปูน, มุงหลังคา)" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={newTask.name} onChange={e => setNewTask({...newTask, name: e.target.value})} autoFocus />
                    <div className="flex gap-2">
                        <input type="number" placeholder="จำนวน" className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={newTask.quantity} onChange={e => setNewTask({...newTask, quantity: e.target.value})} />
                        <input type="text" placeholder="หน่วย" className="w-24 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={newTask.unit} onChange={e => setNewTask({...newTask, unit: e.target.value})} />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button>
                        <button type="submit" disabled={submitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* 🔒 EDIT MODAL */}
      {isEditOpen && editingTask && (
        <div className="fixed inset-0 bg-black/60 z-[50] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                <h3 className="font-bold text-lg mb-4 text-slate-800">แก้ไขงานย่อย</h3>
                <form onSubmit={handleUpdateTask} className="space-y-3">
                    <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={editingTask.task_name} onChange={e => setEditingTask({...editingTask, task_name: e.target.value})} />
                    <div className="flex gap-2">
                        <input type="number" className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={editingTask.quantity} onChange={e => setEditingTask({...editingTask, quantity: e.target.value})} />
                        <input type="text" className="w-24 p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={editingTask.unit} onChange={e => setEditingTask({...editingTask, unit: e.target.value})} />
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button>
                        <button type="submit" disabled={submitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">บันทึก</button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}