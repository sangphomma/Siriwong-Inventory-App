"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { 
  fetchProjectJobs, 
  createJob, 
  updateJob, 
  deleteJob 
} from "@/services/api"; 

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Modal สร้าง/แก้ไข Job
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);

  // โหลดข้อมูล
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchProjectJobs(projectId);
      setProject(data);
    } catch (error) {
      console.error("Error loading project jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadData();
  }, [projectId]);

  // ✅ ฟังก์ชันเปิด Google Maps นำทาง
  const openNavigateMap = (e: React.MouseEvent, coords: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!coords) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${coords}`, '_blank');
  };

  // --- CRUD Functions ---

  // 1. สร้าง Job ใหม่
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle) return alert("กรุณากรอกชื่อหมวดงาน");
    try {
      setSubmitting(true);
      await createJob(newJobTitle, project.documentId); 
      setNewJobTitle("");
      setIsCreateOpen(false);
      await loadData();
    } catch (error) {
      console.error(error);
      alert("สร้างหมวดงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. ลบ Job
  const handleDelete = async (e: React.MouseEvent, jobDocId: string, jobTitle: string) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (!confirm(`ต้องการลบหมวดงาน "${jobTitle}" ใช่หรือไม่?`)) return;
    try {
      setLoading(true);
      await deleteJob(jobDocId);
      await loadData();
    } catch (error) {
      alert("ลบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // 3. เปิด Modal แก้ไข
  const openEditModal = (e: React.MouseEvent, job: any) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingJob({ ...job });
    setIsEditOpen(true);
  };

  // 4. บันทึกการแก้ไข
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateJob(editingJob.documentId, editingJob.title);
      setIsEditOpen(false);
      setEditingJob(null);
      await loadData();
    } catch (error) {
      alert("แก้ไขไม่สำเร็จ");
    }
  };
  // ------------------------------------

  if (loading && !project) return <div className="p-10 text-center italic text-slate-500">กำลังดึงข้อมูล...</div>;

  // 🛠️ Map ข้อมูล
  const displayData = {
    name: project?.name || "โครงการ (ไม่มีชื่อ)",
    address: project?.location || "ไม่ระบุที่ตั้ง",
    distance: project?.distance_from_branch ? `${project.distance_from_branch} กม.` : "-",
    coordinates: project?.coordinates, // ✅ ดึงพิกัดมาใช้
    
    // แปลงวันที่
    dates: (project?.start_date && project?.end_date)
       ? `${new Date(project.start_date).toLocaleDateString('th-TH')} - ${new Date(project.end_date).toLocaleDateString('th-TH')}`
       : "ยังไม่ระบุวัน",

    // ป้องกัน Error กรณี team_members เป็น null
    team: {
        sales: project?.team_members?.[0]?.username || "-",
        pm: project?.team_members?.[1]?.username || "-",
        tech: project?.team_members?.[2]?.username || "-"
    }
  };

  const jobs = project?.jobs || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans relative">
      
      {/* Header Design */}
      <div className="bg-slate-900 text-white rounded-b-[2.5rem] p-6 pb-14 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10">
            {/* Top Bar */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded">ON-GOING</span>
                        <span className="text-slate-400 text-xs">Project #{projectId}</span>
                    </div>
                    {/* ชื่อโครงการจริงจาก DB */}
                    <h1 className="text-2xl font-bold leading-tight">{displayData.name}</h1>
                    <p className="text-sm text-slate-300 flex items-center gap-1 mt-1">
                        📍 {displayData.address}
                    </p>
                </div>
            </div>

            {/* Info Cards Row */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {/* ✅ Card ระยะทาง (กดได้ถ้ามีพิกัด) */}
                <div 
                    onClick={(e) => displayData.coordinates ? openNavigateMap(e, displayData.coordinates) : null}
                    className={`bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5 relative group overflow-hidden ${displayData.coordinates ? 'cursor-pointer hover:bg-white/20 active:scale-95 transition-all' : ''}`}
                >
                    <div className="text-xs text-slate-400 mb-1 flex justify-between">
                        <span>ระยะทางโรงงาน</span>
                        {/* ไอคอนนำทางเล็กๆ มุมขวา */}
                        {displayData.coordinates && <span className="text-[10px] bg-blue-500 text-white px-1 rounded opacity-80 group-hover:opacity-100">นำทาง ↗</span>}
                    </div>
                    <div className="text-lg font-bold flex items-center gap-1">
                        🚗 {displayData.distance} 
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5">
                    <div className="text-xs text-slate-400 mb-1">แผนงาน</div>
                    <div className="text-xs font-bold flex items-center gap-1 mt-1 leading-tight">
                        📅 {displayData.dates}
                    </div>
                </div>
            </div>

            {/* Team Section */}
            <div>
                <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">ทีมผู้รับผิดชอบ</div>
                <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-3 border border-white/5">
                   <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold border-2 border-slate-900 shadow-lg">Sale</div>
                        <span className="text-[10px] mt-1 text-slate-300 truncate w-12 text-center">{displayData.team.sales}</span>
                   </div>
                   <div className="w-px h-8 bg-white/10"></div>
                   <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold border-2 border-slate-900 shadow-lg">PM</div>
                        <span className="text-[10px] mt-1 text-slate-300 truncate w-12 text-center">{displayData.team.pm}</span>
                   </div>
                   <div className="w-px h-8 bg-white/10"></div>
                   <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold border-2 border-slate-900 shadow-lg">Tech</div>
                        <span className="text-[10px] mt-1 text-slate-300 truncate w-12 text-center">{displayData.team.tech}</span>
                   </div>
                </div>
            </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-4">
        
        <div className="flex justify-between items-end px-2">
            <h2 className="font-bold text-slate-800 text-lg">รายการหมวดงาน</h2>
            <span className="text-xs text-slate-500">{jobs.length} รายการ</span>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 italic bg-white rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2 shadow-sm">
            <span className="text-4xl">🏗️</span>
            <span>ยังไม่มีหมวดงาน</span>
            <button onClick={() => setIsCreateOpen(true)} className="text-blue-500 text-sm font-bold mt-2 hover:underline">
              + สร้างหมวดงานแรก
            </button>
          </div>
        ) : (
          jobs.map((job: any) => (
            <div key={job.id} className="relative group">
              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative hover:shadow-md transition-shadow">
                
                {/* ปุ่ม Edit/Delete */}
                <div className="absolute top-4 right-4 flex gap-1 z-20">
                  <button 
                    onClick={(e) => openEditModal(e, job)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-blue-50 text-slate-300 hover:text-blue-600 rounded-full transition-colors"
                  >
                    ✎
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, job.documentId, job.title)}
                    className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-full transition-colors"
                  >
                    🗑
                  </button>
                </div>

                <div className="mb-4 pr-16">
                  <div className="text-[10px] text-slate-400 mb-1">JOB ID: {job.id}</div>
                  <h2 className="font-bold text-slate-800 text-lg leading-tight truncate">
                    {job.title || "หมวดงาน (ไม่มีชื่อ)"} 
                  </h2>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${job.progress || 0}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-blue-600">{job.progress || 0}%</span>
                  </div>
                </div>
                
                <Link 
                  href={`/manage/project/${projectId}/job/${job.documentId || job.id}`}
                  className="flex items-center justify-between w-full bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-3 rounded-xl text-xs font-bold transition-colors group-active:scale-[0.98]"
                >
                  <span>ดูรายการย่อย ({job.job_tasks?.length || 0})</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Floating Action Button (+) */}
      <button 
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-8 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-400/50 flex items-center justify-center text-4xl pb-1 hover:bg-black active:scale-90 transition-all z-[999]"
      >
        +
      </button>

      {/* Modal สร้างหมวดงานใหม่ */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-slate-800">🏗️ เพิ่มหมวดงานใหม่</h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1 block mb-1">ชื่อหมวดงาน</label>
                <input 
                  type="text" 
                  placeholder="เช่น งานโครงสร้าง, งานระบบไฟ"
                  className="w-full p-3 bg-slate-50 text-slate-900 font-medium rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-500 outline-none"
                  value={newJobTitle}
                  onChange={e => setNewJobTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold shadow-lg mt-2 active:scale-95 transition-transform disabled:bg-slate-400"
              >
                {submitting ? "กำลังสร้าง..." : "สร้างหมวดงาน"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal แก้ไขหมวดงาน */}
      {isEditOpen && editingJob && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-slate-800">✏️ แก้ไขหมวดงาน</h3>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">ชื่อหมวดงาน</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 text-slate-900 font-medium rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-500 outline-none"
                  value={editingJob.title}
                  onChange={e => setEditingJob({...editingJob, title: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold">ยกเลิก</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-lg">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}