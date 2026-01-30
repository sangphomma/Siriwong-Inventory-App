// app/manage/project/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { STRAPI_URL } from "@/services/config";
import { 
  fetchProjectJobs, 
  createJob, 
  updateJob, 
  deleteJob,
  getProjectMembers,
  addProjectMember,
  updateProjectMember, // ✅ อย่าลืม Import ตัวนี้ (ต้องเพิ่มใน api.ts ก่อนนะ)
  deleteProjectMember,
  getAllUsers
} from "@/services/api"; 

// --- Helper: เลือกสีประจำตัว + เพิ่มค่า Glow (เงาฟุ้งสวยๆ) ---
const getUserColor = (name: string) => {
    if (!name) return { 
        bg: "bg-slate-100", 
        text: "text-slate-600", 
        avatar: "bg-slate-500", 
        border: "border-slate-300",
        glow: "ring-slate-200 shadow-slate-300" 
    };
    
    const themes = [
      { bg: "bg-blue-50", text: "text-blue-700", avatar: "bg-blue-500", border: "border-blue-200", glow: "ring-blue-200 shadow-blue-400/50" },
      { bg: "bg-emerald-50", text: "text-emerald-700", avatar: "bg-emerald-500", border: "border-emerald-200", glow: "ring-emerald-200 shadow-emerald-400/50" },
      { bg: "bg-amber-50", text: "text-amber-700", avatar: "bg-amber-500", border: "border-amber-200", glow: "ring-amber-200 shadow-amber-400/50" },
      { bg: "bg-violet-50", text: "text-violet-700", avatar: "bg-violet-500", border: "border-violet-200", glow: "ring-violet-200 shadow-violet-400/50" },
      { bg: "bg-rose-50", text: "text-rose-700", avatar: "bg-rose-500", border: "border-rose-200", glow: "ring-rose-200 shadow-rose-400/50" },
      { bg: "bg-cyan-50", text: "text-cyan-700", avatar: "bg-cyan-500", border: "border-cyan-200", glow: "ring-cyan-200 shadow-cyan-400/50" },
    ];
    
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    
    return themes[sum % themes.length];
};

const Icons = {
  Calendar: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>),
  AddUser: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>),
  Trash: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>)
};

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States เดิม (Jobs)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);

  // States ใหม่ (Project Members)
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null); // ✅ เก็บคนที่จะแก้

  const [memberForm, setMemberForm] = useState({
    userId: "",
    role: "",
    responsibility: "",
    start_date: "",
    end_date: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [projData, membersData, usersData] = await Promise.all([
        fetchProjectJobs(projectId),
        getProjectMembers(projectId),
        getAllUsers()
      ]);
      setProject(projData);
      setMembers(membersData);
      setUsers(usersData);
    } catch (error) { console.error("Error loading project data:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { if (projectId) loadData(); }, [projectId]);

  const openNavigateMap = (e: React.MouseEvent, coords: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!coords) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${coords}`, '_blank');
  };

  // --- CRUD Functions (Jobs) ---
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle) return alert("กรุณากรอกชื่อหมวดงาน");
    try {
      setSubmitting(true);
      await createJob(newJobTitle, project.documentId); 
      setNewJobTitle("");
      setIsCreateOpen(false);
      await loadData();
    } catch (error) { alert("สร้างหมวดงานไม่สำเร็จ"); } finally { setSubmitting(false); }
  };

  const handleDeleteJob = async (e: React.MouseEvent, jobDocId: string, jobTitle: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`ต้องการลบหมวดงาน "${jobTitle}" ใช่หรือไม่?`)) return;
    try {
      setLoading(true);
      await deleteJob(jobDocId);
      await loadData();
    } catch (error) { alert("ลบไม่สำเร็จ"); } finally { setLoading(false); }
  };

  const openEditJob = (e: React.MouseEvent, job: any) => {
    e.preventDefault(); e.stopPropagation();
    setEditingJob({ ...job });
    setIsEditOpen(true);
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateJob(editingJob.documentId, editingJob.title);
      setIsEditOpen(false);
      setEditingJob(null);
      await loadData();
    } catch (error) { alert("แก้ไขไม่สำเร็จ"); }
  };

  // --- CRUD Functions (Members) ---
  
  // 1. เปิด Modal แก้ไข (ดึงข้อมูลเก่ามาใส่ฟอร์ม)
  const openEditMember = (member: any) => {
    setEditingMember(member);
    setMemberForm({
        userId: member.user?.id || "", 
        role: member.role_in_project || "",
        responsibility: member.responsibility || "",
        start_date: member.start_date || "",
        end_date: member.end_date || ""
    });
    setIsMemberModalOpen(true);
  };

  // 2. เปิด Modal สร้างใหม่ (เคลียร์ค่า)
  const openCreateMember = () => {
      setEditingMember(null);
      setMemberForm({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" });
      setIsMemberModalOpen(true);
  }

  // 3. บันทึก (แยกเคส สร้างใหม่ vs แก้ไข)
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.userId || !memberForm.role || !memberForm.start_date) return alert("กรุณากรอกข้อมูลให้ครบ");
    
    try {
        if (editingMember) {
            // โหมดแก้ไข
            await updateProjectMember(editingMember.documentId, memberForm);
        } else {
            // โหมดสร้างใหม่
            await addProjectMember({ projectSiteId: projectId, ...memberForm });
        }
        
        setIsMemberModalOpen(false);
        setEditingMember(null); 
        setMemberForm({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" }); 
        await loadData(); 
    } catch (err) { alert("บันทึกไม่สำเร็จ"); console.error(err); }
  };

  const handleDeleteMember = async (memberId: string) => {
      if(confirm("ต้องการลบประวัติการทำงานนี้?")) {
          try { await deleteProjectMember(memberId); await loadData(); } 
          catch(err) { alert("ลบไม่สำเร็จ"); }
      }
  };

  if (loading && !project) return <div className="h-screen flex items-center justify-center text-slate-400">Loading...</div>;

  const displayData = {
    name: project?.name || "โครงการ (ไม่มีชื่อ)",
    address: project?.location || "ไม่ระบุที่ตั้ง",
    distance: project?.distance_from_branch ? `${project.distance_from_branch} กม.` : "-",
    coordinates: project?.coordinates,
    dates: (project?.start_date && project?.end_date) ? `${new Date(project.start_date).toLocaleDateString('th-TH')} - ${new Date(project.end_date).toLocaleDateString('th-TH')}` : "ยังไม่ระบุวัน",
  };
  const jobs = project?.jobs || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans relative">
      
      {/* Header */}
      <div className="bg-slate-900 text-white rounded-b-[2.5rem] p-6 pb-14 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <Link href="/manage" className="inline-flex items-center gap-1 text-slate-400 text-xs mb-2 hover:text-white transition">← กลับหน้ารวม</Link>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded">ON-GOING</span>
                        <span className="text-slate-400 text-xs">Project #{projectId}</span>
                    </div>
                    <h1 className="text-2xl font-bold leading-tight">{displayData.name}</h1>
                    <p className="text-sm text-slate-300 flex items-center gap-1 mt-1">📍 {displayData.address}</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div onClick={(e) => displayData.coordinates ? openNavigateMap(e, displayData.coordinates) : null} className={`bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5 relative group overflow-hidden ${displayData.coordinates ? 'cursor-pointer hover:bg-white/20' : ''}`}>
                    <div className="text-xs text-slate-400 mb-1 flex justify-between"><span>ระยะทางโรงงาน</span>{displayData.coordinates && <span className="text-[10px] bg-blue-500 text-white px-1 rounded">นำทาง ↗</span>}</div>
                    <div className="text-lg font-bold flex items-center gap-1">🚗 {displayData.distance}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/5">
                    <div className="text-xs text-slate-400 mb-1">แผนงาน</div>
                    <div className="text-xs font-bold flex items-center gap-1 mt-1 leading-tight">📅 {displayData.dates}</div>
                </div>
            </div>
            
            {/* Team Summary (Header ส่วนบน) */}
            <div>
                <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Summary Team</div>
                <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-3 border border-white/5 overflow-x-auto">
                   {members.length > 0 ? members.slice(0, 5).map((m: any, idx: number) => {
                       const theme = getUserColor(m.user?.username || "");
                       
                       // 🖼️ Avatar Logic (Header)
                       let avatarUrl = null;
                       if (m.user?.avatar?.url) {
                            avatarUrl = m.user.avatar.url.startsWith("http") ? m.user.avatar.url : `${STRAPI_URL}${m.user.avatar.url}`;
                       }

                       return (
                           <div key={idx} className="flex flex-col items-center min-w-[3rem]">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10 ${theme.avatar} text-white overflow-hidden relative`}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt={m.user?.username} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{m.user?.username?.charAt(0).toUpperCase()}</span>
                                    )}
                                </div>
                                <span className="text-[8px] mt-1 text-slate-300 truncate w-10 text-center">{m.user?.username}</span>
                           </div>
                       )
                   }) : <span className="text-[10px] text-slate-500 px-2">ยังไม่มีทีมงาน</span>}
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-6">
        
        {/* ✅ SECTION: Timeline ทีมงาน (อัปเกรดใหม่: มี Glow + Edit) */}
        <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    👷 Timeline ทีมงาน
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{members.length}</span>
                </h2>
                <button onClick={openCreateMember} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-bold hover:bg-blue-100 flex items-center gap-1 active:scale-95 transition">
                    <Icons.AddUser /> เพิ่ม/มอบหมาย
                </button>
            </div>

            <div className="relative">
                {members.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-xs text-slate-400">
                        ยังไม่มีประวัติการทำงาน
                    </div>
                ) : (
                    // 1. เส้นแกนหลัก (Vertical Line)
                    <div className="border-l-2 border-dashed border-slate-200 ml-4 space-y-8 pb-2">
                        {members
                          // 2. Sorting: เรียงตาม Start Date (ใหม่สุดอยู่บน)
                          .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                          .map((m: any) => {
                            
                            // 🎨 Logic สีและการคำนวณวัน
                            const theme = getUserColor(m.user?.username || "");
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const startDate = new Date(m.start_date);
                            const endDate = m.end_date ? new Date(m.end_date) : null;
                            const isActive = !endDate || endDate >= today;

                            // 🖼️ Avatar Logic (Timeline)
                            let avatarUrl = null;
                            if (m.user?.avatar?.url) {
                                avatarUrl = m.user.avatar.url.startsWith("http") ? m.user.avatar.url : `${STRAPI_URL}${m.user.avatar.url}`;
                            }

                            return (
                                <div key={m.id} className="relative pl-8">
                                    
                                    {/* 📍 Node (จุดกลมๆ บนเส้น Timeline) */}
                                    <div className={`absolute -left-[9px] top-0 flex flex-col items-center`}>
                                        <div className={`w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 
                                            ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}>
                                        </div>
                                    </div>

                                    {/* 📅 Date Label (หัวข้อวันที่) */}
                                    <div className="flex items-center gap-2 mb-2 -mt-1">
                                        <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                                            {startDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                        </span>
                                        <div className="h-[1px] w-4 bg-slate-200"></div>
                                        {isActive ? (
                                            <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-bold border border-green-200">
                                                Active Now
                                            </span>
                                        ) : (
                                            <span className="text-[9px] text-slate-400 italic">
                                                (สิ้นสุด: {endDate?.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})
                                            </span>
                                        )}
                                    </div>

                                    {/* 🃏 Content Card */}
                                    <div className={`relative group p-4 rounded-2xl border shadow-sm flex items-start gap-3 transition-all hover:shadow-md
                                        ${isActive ? `bg-white ${theme.border}` : 'bg-slate-50 border-slate-200 opacity-70 grayscale-[0.8]'}`}>
                                        
                                        {/* ✅ AVATAR WITH GLOW EFFECT */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden relative z-10 transition-all duration-300
                                            ${isActive 
                                                ? `${theme.avatar} ring-[3px] ring-offset-2 ${theme.glow} shadow-lg` 
                                                : 'bg-slate-300 grayscale opacity-80 ring-1 ring-slate-200'
                                            }`}>
                                            
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt={m.user?.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span>{m.user?.username?.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className={`font-bold text-sm ${isActive ? theme.text : 'text-slate-600'}`}>
                                                        {m.user?.username || "Unknown"}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 font-medium">
                                                        {m.role_in_project}
                                                    </p>
                                                </div>
                                                
                                                {/* ✅ Actions (Edit & Delete) */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-200">
                                                    {/* ปุ่ม Edit */}
                                                    <button onClick={() => openEditMember(m)} className="text-slate-300 hover:text-blue-500 p-1 hover:bg-blue-50 rounded-full transition scale-90">
                                                        <Icons.Edit />
                                                    </button>
                                                    {/* ปุ่ม Delete */}
                                                    <button onClick={() => handleDeleteMember(m.documentId)} className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-full transition scale-90">
                                                        <Icons.Trash />
                                                    </button>
                                                </div>
                                            </div>

                                            {m.responsibility && (
                                                <div className={`mt-2 text-[10px] p-2 rounded-lg border leading-relaxed
                                                    ${isActive ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-transparent text-slate-500 border-transparent italic'}`}>
                                                    "{m.responsibility}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>

        {/* SECTION: Jobs (คงเดิม) */}
        <section>
            <div className="flex justify-between items-end px-2 mb-3">
                <h2 className="font-bold text-slate-800 text-lg">รายการหมวดงาน</h2>
                <span className="text-xs text-slate-500">{jobs.length} รายการ</span>
            </div>
            {jobs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic bg-white rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2 shadow-sm">
                <span className="text-4xl">🏗️</span>
                <span>ยังไม่มีหมวดงาน</span>
                <button onClick={() => setIsCreateOpen(true)} className="text-blue-500 text-sm font-bold mt-2 hover:underline">+ สร้างหมวดงานแรก</button>
            </div>
            ) : (
            jobs.map((job: any) => (
                <div key={job.id} className="relative group mb-4">
                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative hover:shadow-md transition-shadow">
                    <div className="absolute top-4 right-4 flex gap-1 z-20">
                    <button onClick={(e) => openEditJob(e, job)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-blue-50 text-slate-300 hover:text-blue-600 rounded-full transition-colors">✎</button>
                    <button onClick={(e) => handleDeleteJob(e, job.documentId, job.title)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-full transition-colors">🗑</button>
                    </div>
                    <div className="mb-4 pr-16">
                    <div className="text-[10px] text-slate-400 mb-1">JOB ID: {job.id}</div>
                    <h2 className="font-bold text-slate-800 text-lg leading-tight truncate">{job.title || "หมวดงาน (ไม่มีชื่อ)"}</h2>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${job.progress || 0}%` }}></div></div>
                        <span className="text-xs font-bold text-blue-600">{job.progress || 0}%</span>
                    </div>
                    </div>
                    <Link href={`/manage/project/${projectId}/job/${job.documentId || job.id}`} className="flex items-center justify-between w-full bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-3 rounded-xl text-xs font-bold transition-colors group-active:scale-[0.98]">
                    <span>ดูรายการย่อย ({job.job_tasks?.length || 0})</span><span>→</span>
                    </Link>
                </div>
                </div>
            ))
            )}
        </section>
      </main>

      <button onClick={() => setIsCreateOpen(true)} className="fixed bottom-8 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-400/50 flex items-center justify-center text-4xl pb-1 hover:bg-black active:scale-90 transition-all z-[999]">+</button>

      {/* --- Modals for Jobs (Create/Edit) --- */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <h3 className="font-bold text-lg mb-4 text-slate-800">🏗️ เพิ่มหมวดงานใหม่</h3>
            <form onSubmit={handleCreateJob} className="space-y-4">
              <input type="text" placeholder="ชื่อหมวดงาน" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} autoFocus />
              <div className="flex gap-2">
                 <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button>
                 <button type="submit" disabled={submitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">สร้าง</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && editingJob && (
         <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
                <h3 className="font-bold text-lg mb-4 text-slate-800">✏️ แก้ไขหมวดงาน</h3>
                <form onSubmit={handleUpdateJob} className="space-y-4">
                   <input type="text" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={editingJob.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} />
                   <div className="flex gap-2"><button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button><button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">บันทึก</button></div>
                </form>
             </div>
         </div>
      )}

      {/* ✅ Member Modal (Create + Edit) */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    {/* เปลี่ยนหัวข้อตามโหมด */}
                    <h3 className="font-bold text-lg text-slate-800">
                        {editingMember ? "✏️ แก้ไขข้อมูล" : "👷 มอบหมายงาน"}
                    </h3>
                    <button onClick={() => setIsMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <form onSubmit={handleSaveMember} className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-slate-500 ml-1">เลือกพนักงาน</label>
                        {/* ถ้า Edit อยู่ ก็ยังยอมให้เปลี่ยนคนได้ (หรือจะ Disabled ก็ได้แล้วแต่ Logic) */}
                        <select className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" value={memberForm.userId} onChange={e => setMemberForm({...memberForm, userId: e.target.value})} required>
                            <option value="" disabled>-- เลือกรายชื่อ --</option>
                            {users.map(u => (<option key={u.id} value={u.id}>{u.username} ({u.position || "ไม่ระบุ"})</option>))}
                        </select>
                    </div>
                    <div><label className="text-xs font-bold text-slate-500 ml-1">หน้าที่</label><input className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} required /></div>
                    <div className="flex gap-2"><div className="flex-1"><label className="text-xs font-bold text-slate-500 ml-1">เริ่ม</label><input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" value={memberForm.start_date} onChange={e => setMemberForm({...memberForm, start_date: e.target.value})} required /></div><div className="flex-1"><label className="text-xs font-bold text-slate-500 ml-1">ถึง (ถ้ามี)</label><input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" value={memberForm.end_date} onChange={e => setMemberForm({...memberForm, end_date: e.target.value})} /></div></div>
                    <div><label className="text-xs font-bold text-slate-500 ml-1">รายละเอียด</label><textarea rows={3} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none resize-none" value={memberForm.responsibility} onChange={e => setMemberForm({...memberForm, responsibility: e.target.value})} /></div>
                    
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg mt-2">
                        {editingMember ? "บันทึกการแก้ไข" : "บันทึก"}
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}