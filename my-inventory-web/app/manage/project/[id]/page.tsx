// app/manage/project/[id]/page.tsx
"use client";

import { useEffect, useState, use, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { STRAPI_URL } from "@/services/config";
import { useAuth } from "@/app/context/AuthContext"; 
import { 
  fetchProjectJobs, 
  createJob, 
  updateJob, 
  deleteJob,
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  deleteProjectMember,
  getAllUsers,
  fetchProjectLogs 
} from "@/services/api"; 

// --- Helper: เลือกสีประจำตัว + เพิ่มค่า Glow ---
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

// --- Helper: เลือกสี Badge สำหรับ Job ---
const getJobBadgeStyle = (jobTitle: string) => {
    if (!jobTitle) return "bg-slate-100 text-slate-500 border-slate-200";

    const themes = [
        "bg-blue-50 text-blue-600 border-blue-100",
        "bg-orange-50 text-orange-600 border-orange-100",
        "bg-emerald-50 text-emerald-600 border-emerald-100",
        "bg-purple-50 text-purple-600 border-purple-100",
        "bg-pink-50 text-pink-600 border-pink-100",
        "bg-cyan-50 text-cyan-600 border-cyan-100",
        "bg-indigo-50 text-indigo-600 border-indigo-100",
        "bg-rose-50 text-rose-600 border-rose-100",
        "bg-amber-50 text-amber-600 border-amber-100",
    ];

    let hash = 0;
    for (let i = 0; i < jobTitle.length; i++) {
        hash = jobTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    return themes[Math.abs(hash) % themes.length];
};

const getDayTheme = (index: number) => {
    const themes = [
        { dot: "bg-blue-500", border: "border-blue-200", bg: "bg-blue-50/50", text: "text-blue-700" },
        { dot: "bg-amber-500", border: "border-amber-200", bg: "bg-amber-50/50", text: "text-amber-700" },
        { dot: "bg-emerald-500", border: "border-emerald-200", bg: "bg-emerald-50/50", text: "text-emerald-700" },
        { dot: "bg-purple-500", border: "border-purple-200", bg: "bg-purple-50/50", text: "text-purple-700" },
        { dot: "bg-rose-500", border: "border-rose-200", bg: "bg-rose-50/50", text: "text-rose-700" },
    ];
    return themes[index % themes.length];
};

const Icons = {
  Calendar: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>),
  AddUser: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>),
  Trash: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>),
  Line: () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0c4.411 0 8 2.912 8 6.492 0 1.433-.555 2.723-1.715 3.994-1.678 1.932-5.431 1.374-5.822 1.33-.69.124-.976.634-.842 1.439.127.766.364 1.343.414 1.637.049.289.036.621-.295.775-.365.17-.954-.078-1.503-.452-2.213-1.507-4.474-3.513-4.474-3.513S0 10.35 0 6.492C0 2.912 3.589 0 8 0"/></svg>)
};

export default function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { user } = useAuth();
  
  const [project, setProject] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Site Diary States
  const [siteLogs, setSiteLogs] = useState<any[]>([]);
  const [logPage, setLogPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  // CRUD States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberForm, setMemberForm] = useState({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" });

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.type === 'admin';
  const isOwner = !!user && !!project?.creator && project.creator.id === user.id;
  const canManage = !!user && (isAdmin || isOwner);

  // --- Logic คำนวณความล่าช้า/ตรงแผน ---
  const calculateProjectStatus = (proj: any) => {
    if (!proj.start_date) return { text: "ยังไม่ระบุวันเริ่ม", color: "text-slate-500" };
    
    const start = new Date(proj.start_date).getTime();
    const end = proj.end_date ? new Date(proj.end_date).getTime() : new Date().getTime(); 
    const today = new Date().getTime();
    
    // ถ้ายังไม่เริ่ม
    if (today < start) return { text: "⏳ รอเริ่มงาน", color: "text-blue-500" };

    const totalDuration = end - start;
    const timeElapsed = today - start;
    
    // % เวลาที่ผ่านไปแล้ว
    let timeProgress = (timeElapsed / totalDuration) * 100;
    if (timeProgress > 100) timeProgress = 100;

    // % งานจริง
    let actualProgress = 0;
    if (proj.jobs && proj.jobs.length > 0) {
       const totalJobProg = proj.jobs.reduce((sum: number, j: any) => sum + (j.progress || 0), 0);
       actualProgress = totalJobProg / proj.jobs.length;
    }

    const diff = actualProgress - timeProgress;
    
    if (actualProgress >= 100) return { text: "✅ เสร็จสมบูรณ์", color: "text-green-600" };
    if (diff >= -5) return { text: "✨ ตามแผนงาน", color: "text-green-600" }; // ยอมให้ช้าได้ 5%
    if (diff < -5) return { text: `⚠️ ช้ากว่าแผน ${Math.round(diff)}%`, color: "text-red-500" };
    return { text: "กำลังดำเนินงาน", color: "text-blue-500" };
  };

  // ✅ Helper: สร้างข้อความรายงาน
  const generateReport = () => {
    if (!project) return "";
    
    const status = calculateProjectStatus(project);
    const startDate = project.start_date ? new Date(project.start_date).toLocaleDateString('th-TH') : "-";
    const endDate = project.end_date ? new Date(project.end_date).toLocaleDateString('th-TH') : "-";
    const start = project.start_date ? new Date(project.start_date).getTime() : 0;
    const end = project.end_date ? new Date(project.end_date).getTime() : 0;
    const duration = start && end ? Math.ceil((end - start) / (1000 * 60 * 60 * 24)) : 0;

    // ✅ ปรับข้อความระยะทางตามที่ขอ
    const distanceText = project.distance_from_branch 
        ? `ระยะทางประมาณ ${project.distance_from_branch} กม. เทียบกับออฟฟิต-สาขาบางเขน` 
        : "-";

    let text = `📅 *รายงานความคืบหน้าประจำวัน*\n`;
    text += `----------------------------\n`;
    text += `🏠 *โครงการ:* ${project.name}\n`;
    text += `📍 *พิกัด:* ${project.location || "-"} (${distanceText})\n\n`;
    text += `📊 *ภาพรวมโครงการ*\n`;
    text += `• แผน: ${startDate} - ${endDate} (${duration} วัน)\n`;
    text += `• สถานะ: ${status.text} (งานจริง ~${Math.round(project.jobs?.reduce((sum:number, j:any) => sum + (j.progress||0), 0) / (project.jobs?.length || 1))}%)\n\n`;

    text += `🏗️ *รายละเอียดงาน*\n`;
    if (project.jobs && project.jobs.length > 0) {
        project.jobs.forEach((job: any, index: number) => {
            text += `${index + 1}. ${job.title} (${job.progress || 0}%)\n`;
            if (job.job_tasks && job.job_tasks.length > 0) {
                job.job_tasks.forEach((task: any) => {
                     // กรองเฉพาะงานที่ Active เพื่อประหยัดพื้นที่ข้อความ
                     if (task.progress > 0 && task.progress < 100) {
                        text += `   ▫️ ${task.task_name}: ${task.progress}%\n`;
                     } else if (task.progress === 100) {
                        text += `   ✅ ${task.task_name}: 100%\n`;
                     }
                });
            }
            text += `\n`;
        });
    } else {
        text += `(ยังไม่มีหมวดงาน)\n`;
    }

    text += `----------------------------\n`;
    text += `🔗 *ดูรายละเอียด/รูปภาพ:*\n`;
    text += `${window.location.href}\n\n`;
    
    // ✅ เพิ่ม Credential
    text += `(สำหรับผู้ที่ยังไม่มี Account)\n`;
    text += `👤 User: siriwong\n`;
    text += `🔑 Pass: 123456`;
    
    return text;
  };

  // ✅ ฟังก์ชัน 1: ส่ง LINE (พยายามเปิด App)
  const handleShareLine = () => {
    const report = generateReport();
    // ตัดข้อความถ้ายาวเกินไป (ป้องกัน Error)
    const safeReport = report.length > 1500 
        ? report.substring(0, 1500) + "\n...(ข้อความยาวเกินไป โปรดดูต่อในเว็บ)" 
        : report;
        
    // ใช้ line://msg/text/ แบบระบุเจาะจง (ไม่อ้อมไป web)
    window.location.href = `line://msg/text/${encodeURIComponent(safeReport)}`;
  };

  // ✅ ฟังก์ชัน 2: คัดลอกลง Clipboard (ชัวร์สุด)
  const handleCopyReport = async () => {
    const report = generateReport();
    try {
        await navigator.clipboard.writeText(report);
        alert("คัดลอกรายงานแล้ว! \nไปที่ LINE แล้วกดวาง (Ctrl+V) ได้เลยครับ 📋");
    } catch (err) {
        alert("คัดลอกไม่สำเร็จ (Browser ไม่รองรับ)");
    }
  };

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const projData = await fetchProjectJobs(projectId);
      setProject(projData);

      try {
          const membersData = await getProjectMembers(projectId);
          setMembers(membersData);
      } catch (err) {
          console.warn("Guest View: Permission Warning", err);
          setMembers([]); 
      }

      if (user) {
          try {
             const usersData = await getAllUsers();
             setUsers(usersData);
          } catch (e) {}
      }
    } catch (error) { console.error("Critical Error:", error); } 
    finally { setLoading(false); }
  };

  const loadLogs = async (page: number, reset: boolean = false) => {
      try {
          setLoadingLogs(true);
          const res = await fetchProjectLogs(projectId, page, 5); 
          if (reset) setSiteLogs(res.data);
          else setSiteLogs(prev => [...prev, ...res.data]);
          setHasMoreLogs(res.meta?.pagination?.page < res.meta?.pagination?.pageCount);
      } catch (error) { console.error("Error loading logs:", error); } 
      finally { setLoadingLogs(false); }
  };

  useEffect(() => { 
      if (projectId) { loadProjectData(); loadLogs(1, true); }
  }, [projectId]);

  const lastLogElementRef = useCallback((node: HTMLAnchorElement) => {
    if (loadingLogs) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMoreLogs) {
            setLogPage(prev => { const nextPage = prev + 1; loadLogs(nextPage); return nextPage; });
        }
    });
    if (node) observer.current.observe(node);
  }, [loadingLogs, hasMoreLogs]);

  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    siteLogs.forEach((log) => {
        const dateObj = new Date(log.createdAt);
        const dateKey = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(log);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[1][0].createdAt).getTime() - new Date(a[1][0].createdAt).getTime());
  }, [siteLogs]);

  const handleCreateJob = async (e: React.FormEvent) => { e.preventDefault(); if (!newJobTitle) return alert("กรุณากรอกชื่อหมวดงาน"); try { setSubmitting(true); await createJob(newJobTitle, project.documentId); setNewJobTitle(""); setIsCreateOpen(false); await loadProjectData(); } catch (error) { alert("สร้างหมวดงานไม่สำเร็จ"); } finally { setSubmitting(false); } };
  const handleDeleteJob = async (e: React.MouseEvent, jobDocId: string, jobTitle: string) => { e.preventDefault(); e.stopPropagation(); if (!confirm(`ต้องการลบหมวดงาน "${jobTitle}" ใช่หรือไม่?`)) return; try { setLoading(true); await deleteJob(jobDocId); await loadProjectData(); } catch (error) { alert("ลบไม่สำเร็จ"); } finally { setLoading(false); } };
  const openEditJob = (e: React.MouseEvent, job: any) => { e.preventDefault(); e.stopPropagation(); setEditingJob({ ...job }); setIsEditOpen(true); };
  const handleUpdateJob = async (e: React.FormEvent) => { e.preventDefault(); try { await updateJob(editingJob.documentId, editingJob.title); setIsEditOpen(false); setEditingJob(null); await loadProjectData(); } catch (error) { alert("แก้ไขไม่สำเร็จ"); } };
  const openEditMember = (member: any) => { setEditingMember(member); setMemberForm({ userId: member.user?.id || "", role: member.role_in_project || "", responsibility: member.responsibility || "", start_date: member.start_date || "", end_date: member.end_date || "" }); setIsMemberModalOpen(true); };
  const openCreateMember = () => { setEditingMember(null); setMemberForm({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" }); setIsMemberModalOpen(true); }
  const handleSaveMember = async (e: React.FormEvent) => { e.preventDefault(); if (!memberForm.userId || !memberForm.role || !memberForm.start_date) return alert("กรุณากรอกข้อมูลให้ครบ"); try { if (editingMember) { await updateProjectMember(editingMember.documentId, memberForm); } else { await addProjectMember({ projectSiteId: projectId, ...memberForm }); } setIsMemberModalOpen(false); setEditingMember(null); setMemberForm({ userId: "", role: "", responsibility: "", start_date: "", end_date: "" }); await loadProjectData(); } catch (err) { alert("บันทึกไม่สำเร็จ"); console.error(err); } };
  const handleDeleteMember = async (memberId: string) => { if(confirm("ต้องการลบประวัติการทำงานนี้?")) { try { await deleteProjectMember(memberId); await loadProjectData(); } catch(err) { alert("ลบไม่สำเร็จ"); } } };
  const openNavigateMap = (e: React.MouseEvent, coords: string) => { e.preventDefault(); e.stopPropagation(); if (!coords) return; window.open(`https://www.google.com/maps/search/?api=1&query=${coords}`, '_blank'); };

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

                <div className="flex gap-2">
                    {/* ✅ ปุ่ม Copy (Backup) */}
                    {canManage && (
                        <button onClick={handleCopyReport} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-full shadow-lg transition active:scale-95 flex items-center justify-center gap-1" title="คัดลอกรายงาน">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
                             </svg>
                             <span className="text-xs font-bold px-1 hidden sm:inline">คัดลอก</span>
                        </button>
                    )}

                    {/* ✅ ปุ่ม LINE (Original) */}
                    {canManage && (
                        <button onClick={handleShareLine} className="bg-[#06C755] hover:bg-[#05b64c] text-white p-2 rounded-full shadow-lg transition active:scale-95 flex items-center justify-center gap-1">
                             <Icons.Line />
                             <span className="text-xs font-bold px-1 hidden sm:inline">ส่ง LINE</span>
                        </button>
                    )}
                </div>
            </div>
            
            {/* ... (ส่วนอื่นๆ ของ Header เหมือนเดิม) ... */}
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
            
            {/* Team Summary */}
            <div>
                <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Summary Team</div>
                <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-3 border border-white/5 overflow-x-auto">
                   {members.length > 0 ? members.slice(0, 5).map((m: any, idx: number) => {
                       const theme = getUserColor(m.user?.username || "");
                       let avatarUrl = null;
                       if (m.user?.avatar?.url) avatarUrl = m.user.avatar.url.startsWith("http") ? m.user.avatar.url : `${STRAPI_URL}${m.user.avatar.url}`;
                       return (
                           <div key={idx} className="flex flex-col items-center min-w-[3rem]">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10 ${theme.avatar} text-white overflow-hidden relative`}>
                                    {avatarUrl ? <img src={avatarUrl} alt={m.user?.username} className="w-full h-full object-cover" /> : <span>{m.user?.username?.charAt(0).toUpperCase()}</span>}
                                </div>
                                <span className="text-[8px] mt-1 text-slate-300 truncate w-10 text-center">{m.user?.username}</span>
                           </div>
                       )
                   }) : <span className="text-[10px] text-slate-500 px-2">{loading ? "..." : "ยังไม่มีทีมงาน"}</span>}
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 -mt-8 relative z-20 space-y-6">
        
        {/* 1. TIMELINE TEAM */}
        <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    👷 Timeline ทีมงาน
                    <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{members.length}</span>
                </h2>
                {canManage && (
                    <button onClick={openCreateMember} className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-bold hover:bg-blue-100 flex items-center gap-1 active:scale-95 transition">
                        <Icons.AddUser /> เพิ่ม/มอบหมาย
                    </button>
                )}
            </div>
            <div className="relative">
                {members.length === 0 ? <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl text-xs text-slate-400">ยังไม่มีประวัติการทำงาน</div> : (
                    <div className="border-l-2 border-dashed border-slate-200 ml-4 space-y-8 pb-2">
                        {members.sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()).map((m: any) => {
                            const theme = getUserColor(m.user?.username || "");
                            const isActive = !m.end_date || new Date(m.end_date) >= new Date(new Date().setHours(0,0,0,0));
                            let avatarUrl = null;
                            if (m.user?.avatar?.url) avatarUrl = m.user.avatar.url.startsWith("http") ? m.user.avatar.url : `${STRAPI_URL}${m.user.avatar.url}`;
                            return (
                                <div key={m.id} className="relative pl-8">
                                    <div className={`absolute -left-[9px] top-0 flex flex-col items-center`}>
                                        <div className={`w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-2 -mt-1">
                                        <span className={`text-xs font-bold ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{new Date(m.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                        <div className="h-[1px] w-4 bg-slate-200"></div>
                                        {isActive ? <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md font-bold border border-green-200">Active Now</span> : <span className="text-[9px] text-slate-400 italic">(สิ้นสุด: {new Date(m.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })})</span>}
                                    </div>
                                    <div className={`relative group p-4 rounded-2xl border shadow-sm flex items-start gap-3 transition-all hover:shadow-md ${isActive ? `bg-white ${theme.border}` : 'bg-slate-50 border-slate-200 opacity-70 grayscale-[0.8]'}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden relative z-10 transition-all duration-300 ${isActive ? `${theme.avatar} ring-[3px] ring-offset-2 ${theme.glow} shadow-lg` : 'bg-slate-300 grayscale opacity-80 ring-1 ring-slate-200'}`}>
                                            {avatarUrl ? <img src={avatarUrl} alt={m.user?.username} className="w-full h-full object-cover" /> : <span>{m.user?.username?.charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <div><p className={`font-bold text-sm ${isActive ? theme.text : 'text-slate-600'}`}>{m.user?.username || "Unknown"}</p><p className="text-[10px] text-slate-500 font-medium">{m.role_in_project}</p></div>
                                                {canManage && (<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-200"><button onClick={() => openEditMember(m)} className="text-slate-300 hover:text-blue-500 p-1 hover:bg-blue-50 rounded-full transition scale-90"><Icons.Edit /></button><button onClick={() => handleDeleteMember(m.documentId)} className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded-full transition scale-90"><Icons.Trash /></button></div>)}
                                            </div>
                                            {m.responsibility && <div className={`mt-2 text-[10px] p-2 rounded-lg border leading-relaxed ${isActive ? 'bg-slate-50 text-slate-600 border-slate-100' : 'bg-transparent text-slate-500 border-transparent italic'}`}>"{m.responsibility}"</div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>

        {/* 2. SECTION: รายการหมวดงาน */}
        <section>
            <div className="flex justify-between items-end px-2 mb-3">
                <h2 className="font-bold text-slate-800 text-lg">รายการหมวดงาน</h2>
                <span className="text-xs text-slate-500">{jobs.length} รายการ</span>
            </div>
            {jobs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 italic bg-white rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2 shadow-sm">
                <span className="text-4xl">🏗️</span>
                <span>ยังไม่มีหมวดงาน</span>
                {canManage && <button onClick={() => setIsCreateOpen(true)} className="text-blue-500 text-sm font-bold mt-2 hover:underline">+ สร้างหมวดงานแรก</button>}
            </div>
            ) : (
            jobs.map((job: any) => (
                <div key={job.id} className="relative group mb-4">
                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative hover:shadow-md transition-shadow">
                    {canManage && (<div className="absolute top-4 right-4 flex gap-1 z-20"><button onClick={(e) => openEditJob(e, job)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-blue-50 text-slate-300 hover:text-blue-600 rounded-full transition-colors">✎</button><button onClick={(e) => handleDeleteJob(e, job.documentId, job.title)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-600 rounded-full transition-colors">🗑</button></div>)}
                    <div className="mb-4 pr-16">
                        <div className="text-[10px] text-slate-400 mb-1">JOB ID: {job.id}</div>
                        <h2 className="font-bold text-slate-800 text-lg leading-tight truncate">{job.title || "หมวดงาน (ไม่มีชื่อ)"}</h2>
                        <div className="flex items-center gap-2 mt-3"><div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${job.progress || 0}%` }}></div></div><span className="text-xs font-bold text-blue-600">{job.progress || 0}%</span></div>
                    </div>
                    <Link href={`/manage/project/${projectId}/job/${job.documentId || job.id}`} className="flex items-center justify-between w-full bg-slate-50 hover:bg-slate-100 text-slate-600 px-4 py-3 rounded-xl text-xs font-bold transition-colors group-active:scale-[0.98]"><span>ดูรายการย่อย ({job.job_tasks?.length || 0})</span><span>→</span></Link>
                </div>
                </div>
            ))
            )}
        </section>

        {/* 3. SECTION: SITE DIARY (Timeline) */}
        <section className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                   📝 Site Diary
                   <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">Live</span>
                </h2>
                {siteLogs.length > 0 && <span className="text-xs text-slate-400">โหลดแล้ว {siteLogs.length} รายการ</span>}
            </div>

            <div className="relative pl-2">
                <div className="absolute left-[7px] top-2 bottom-4 w-[2px] bg-slate-100"></div>

                {groupedLogs.length === 0 && !loadingLogs ? (
                    <div className="text-center py-8 text-slate-400 italic text-xs flex flex-col items-center gap-2 ml-4">
                        <span className="text-2xl opacity-30">📅</span>
                        <span>ยังไม่มีบันทึกหน้างาน</span>
                    </div>
                ) : (
                    groupedLogs.map(([dateKey, logs], groupIndex) => {
                        const theme = getDayTheme(groupIndex);
                        return (
                            <div key={dateKey} className="mb-8 relative last:mb-0">
                                <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className={`w-4 h-4 rounded-full border-[3px] border-white shadow-sm ${theme.dot} shrink-0`}></div>
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${theme.bg} ${theme.text} ${theme.border}`}>
                                        {dateKey}
                                    </span>
                                </div>
                                <div className="space-y-3 ml-6">
                                    {logs.map((log: any, idx: number) => {
                                        let icon = "📝";
                                        let borderColor = "border-slate-100";
                                        let iconBg = "bg-slate-50 text-slate-500";
                                        
                                        if (log.Log_Type === 'Defect') { 
                                            icon = "⚠️"; 
                                            borderColor = "border-red-100";
                                            iconBg = "bg-red-50 text-red-500";
                                        } else if (log.Log_Type === 'Progress') { 
                                            icon = "📈"; 
                                            borderColor = "border-blue-100";
                                            iconBg = "bg-blue-50 text-blue-500";
                                        }

                                        const isLastElement = (groupIndex === groupedLogs.length - 1) && (idx === logs.length - 1);

                                        return (
                                            <Link 
                                                ref={isLastElement ? lastLogElementRef : null}
                                                key={`${log.documentId}-${idx}`}
                                                href={`/manage/project/${projectId}/job/${log.jobId}/task/${log.taskId}`}
                                                className={`block bg-white p-3 rounded-2xl border ${borderColor} shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all active:scale-[0.99] relative group`}
                                            >
                                                <div className="absolute -left-[3.5rem] top-4 text-[9px] text-slate-400 font-medium w-8 text-right">
                                                    {new Date(log.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute:'2-digit' })}
                                                </div>
                                                <div className="absolute -left-[1.65rem] top-[1.1rem] w-1.5 h-1.5 rounded-full bg-slate-200 ring-2 ring-white"></div>
                                                <div className="flex gap-3">
                                                    {log.Media && log.Media.length > 0 ? (
                                                        <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 overflow-hidden border border-slate-100">
                                                            <img src={log.Media[0].url.startsWith('http') ? log.Media[0].url : `${STRAPI_URL}${log.Media[0].url}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg ${iconBg}`}>
                                                            {icon}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0 py-0.5">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="text-xs font-bold text-slate-700 truncate pr-2">{log.taskName}</h4>
                                                            {log.Log_Type === 'Progress' && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{log.progress_percentage}%</span>}
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{log.Description || "ไม่มีรายละเอียด"}</p>
                                                        <div className="mt-2">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold border ${getJobBadgeStyle(log.jobTitle)}`}>
                                                                #{log.jobTitle}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
                {loadingLogs && (
                    <div className="text-center py-4 ml-6">
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce mr-1"></span>
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce mr-1 delay-75"></span>
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></span>
                    </div>
                )}
                {!hasMoreLogs && siteLogs.length > 0 && <div className="text-center py-4 text-[10px] text-slate-300 ml-6">--- สิ้นสุดรายการ ---</div>}
            </div>
        </section>

      </main>

      {canManage && <button onClick={() => setIsCreateOpen(true)} className="fixed bottom-8 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-400/50 flex items-center justify-center text-4xl pb-1 hover:bg-black active:scale-90 transition-all z-[999]">+</button>}

      {isCreateOpen && ( <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"><div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10"><h3 className="font-bold text-lg mb-4 text-slate-800">🏗️ เพิ่มหมวดงานใหม่</h3><form onSubmit={handleCreateJob} className="space-y-4"><input type="text" placeholder="ชื่อหมวดงาน" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} autoFocus /><div className="flex gap-2"><button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button><button type="submit" disabled={submitting} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">สร้าง</button></div></form></div></div> )}
      {isEditOpen && editingJob && ( <div className="fixed inset-0 bg-black/50 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"><h3 className="font-bold text-lg mb-4 text-slate-800">✏️ แก้ไขหมวดงาน</h3><form onSubmit={handleUpdateJob} className="space-y-4"><input type="text" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 outline-none" value={editingJob.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} /><div className="flex gap-2"><button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button><button type="submit" className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">บันทึก</button></div></form></div></div> )}
      
      {isMemberModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">{editingMember ? "✏️ แก้ไขข้อมูล" : "👷 มอบหมายงาน"}</h3>
              <button onClick={() => setIsMemberModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveMember} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">เลือกพนักงาน</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" value={memberForm.userId} onChange={e => setMemberForm({...memberForm, userId: e.target.value})} required>
                  <option value="" disabled>-- เลือกรายชื่อ --</option>
                  {users.map(u => (<option key={u.id} value={u.id}>{u.username} ({u.position || "ไม่ระบุ"})</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">หน้าที่</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} required />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">เริ่ม</label>
                  <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" value={memberForm.start_date} onChange={e => setMemberForm({...memberForm, start_date: e.target.value})} required />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">ถึง (ถ้ามี)</label>
                  <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none" value={memberForm.end_date} onChange={e => setMemberForm({...memberForm, end_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 ml-1">รายละเอียด</label>
                <textarea rows={3} className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm outline-none resize-none" value={memberForm.responsibility} onChange={e => setMemberForm({...memberForm, responsibility: e.target.value})} />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg mt-2">{editingMember ? "บันทึกการแก้ไข" : "บันทึก"}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}