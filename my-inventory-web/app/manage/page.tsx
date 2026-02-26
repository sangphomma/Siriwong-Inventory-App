// app/manage/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react"; // ✅ นำเข้า Suspense
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  getAllProjects, createProject, deleteProject, updateProject, 
  getAllUsers, createUser, updateUser, deleteUser , getDefaultRole
} from "@/services/api"; 
import { useAuth } from "../context/AuthContext";

const OFFICE_LAT = 13.879714702894447;
const OFFICE_LNG = 100.63002504136652;

// Icons (เหมือนเดิม)
const Icons = {
  Login: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>),
  Edit: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>),
  Delete: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>),
  UserAdd: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>),
  Logout: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>),
  ManageUsers: () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>),
  Home: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
};

// ✅ แยกเนื้อหาหลักออกมาเป็น Component ย่อย
function ManageProjectsContent() {
  const { user, logout, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  
  const isSurveyMode = searchParams.get('status') === 'survey';
  
  const [projects, setProjects] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [isUserMgrOpen, setIsUserMgrOpen] = useState(false);
  const [userForm, setUserForm] = useState({ id: "", username: "", email: "", password: "", position: "" });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [uniquePositions, setUniquePositions] = useState<string[]>([]);

  const [projectForm, setProjectForm] = useState({
    name: "", location: "", coordinates: "", distance: "", start: "", end: "", ownerId: "" 
  });

  const isAdmin = user?.role?.name === 'Admin' || user?.role?.type === 'admin'; 

  const theme = isSurveyMode 
    ? { 
        header: "bg-purple-900", badge: "bg-purple-500", button: "bg-purple-600",
        title: "งานสำรวจ (Survey Jobs)", empty: "ไม่พบงานสำรวจ", createBtn: "bg-purple-900 shadow-purple-900/30"
      }
    : { 
        header: "bg-slate-900", badge: "bg-amber-500", button: "bg-blue-600",
        title: "โครงการก่อสร้าง (Construction Projects)", empty: "ไม่พบโครงการ", createBtn: "bg-slate-900 shadow-slate-900/30"
      };

  useEffect(() => {
    if (projectForm.coordinates) {
        const parts = projectForm.coordinates.split(',').map(s => s.trim());
        if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
                const dist = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
                setProjectForm(prev => ({ ...prev, distance: dist }));
            }
        }
    }
  }, [projectForm.coordinates]);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsData = await getAllProjects();
      setProjects(projectsData);

      if (user) {
        try {
            const usersData = await getAllUsers();
            setUsers(usersData);
            const positions = Array.from(new Set(usersData.map((u: any) => u.position).filter((p: any) => p && p.trim() !== "")));
            setUniquePositions(positions as string[]);
        } catch (err) { console.log("Skipping user load: Not authorized"); }
      }
    } catch (error) { console.error("Error loading data:", error); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
    if (!authLoading) loadData();
  }, [user, authLoading]);

  useEffect(() => {
    if (projects.length === 0) {
        setFilteredProjects([]);
        return;
    }
    
    if (isSurveyMode) {
      const surveys = projects.filter(p => p.project_status === 'survey');
      setFilteredProjects(surveys);
    } else {
      const constructions = projects.filter(p => p.project_status !== 'survey'); 
      setFilteredProjects(constructions);
    }
  }, [projects, isSurveyMode]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; const dLat = (lat2 - lat1) * (Math.PI / 180); const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("Browser ไม่รองรับ GPS");
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition((pos) => {
        const lat = pos.coords.latitude; const lng = pos.coords.longitude;
        setProjectForm(prev => ({ ...prev, coordinates: `${lat}, ${lng}` }));
        setGpsLoading(false);
    }, () => { alert("ดึงตำแหน่งไม่ได้"); setGpsLoading(false); });
  };

  const resetProjectForm = () => {
    setProjectForm({ name: "", location: "", coordinates: "", distance: "", start: "", end: "", ownerId: user ? String(user.id) : "" });
    setEditingId(null); setIsModalOpen(false);
  };

  const handleEditProject = (e: React.MouseEvent, project: any) => {
    e.preventDefault(); e.stopPropagation();
    const startDate = project.start_date ? project.start_date.split('T')[0] : "";
    const endDate = project.end_date ? project.end_date.split('T')[0] : "";
    setProjectForm({
      name: project.name || "", location: project.location || "", coordinates: project.coordinates || "",
      distance: project.distance_from_branch ? String(project.distance_from_branch) : "",
      start: startDate, end: endDate, ownerId: project.creator ? String(project.creator.id) : ""
    });
    setEditingId(project.documentId); setIsModalOpen(true);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if(!projectForm.name) return alert("กรุณาใส่ชื่อโครงการ");
    
    const autoStatus = isSurveyMode ? 'survey' : 'active';
    const payload = { 
        ...projectForm, 
        ownerId: Number(projectForm.ownerId),
        project_status: autoStatus 
    };

    try {
        if (editingId) {
             const { project_status, ...updatePayload } = payload; 
             await updateProject(editingId, updatePayload); 
        } else {
             await createProject(payload);
        }
        resetProjectForm(); loadData();
    } catch(err) { console.error(err); alert("บันทึกไม่สำเร็จ"); }
  };
  
  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
      e.preventDefault(); e.stopPropagation(); if(confirm("ยืนยันลบโครงการนี้?")) { await deleteProject(id); loadData(); }
  };

  const resetUserForm = () => { setUserForm({ id: "", username: "", email: "", password: "", position: "" }); setIsEditingUser(false); };
  const handleEditUserClick = (u: any) => { setUserForm({ id: u.id, username: u.username, email: u.email, password: "", position: u.position || "" }); setIsEditingUser(true); };
  const handleUserSubmit = async (e: React.FormEvent) => { e.preventDefault(); try { if (isEditingUser) { const payload: any = { username: userForm.username, email: userForm.email, position: userForm.position }; if (userForm.password) payload.password = userForm.password; await updateUser(userForm.id, payload); } else { if (!userForm.password) return alert("กรุณาตั้งรหัสผ่าน"); const defaultRoleId = await getDefaultRole(); if (!defaultRoleId) return alert("ไม่พบข้อมูล Role ในระบบ"); const { id, ...userData } = userForm; await createUser({ ...userData, confirmed: true, role: defaultRoleId }); } resetUserForm(); loadData(); } catch (err: any) { alert("บันทึก User ไม่สำเร็จ"); } };
  const handleDeleteUser = async (id: string) => { if(confirm("ต้องการลบ User นี้หรือไม่?")) { try { await deleteUser(id); loadData(); } catch (err) { alert("ลบไม่สำเร็จ"); } } };

  if (authLoading || loading) return <div className="h-screen flex items-center justify-center text-slate-400 bg-slate-50">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans relative">
      <header className={`${theme.header} text-white p-6 rounded-b-[2.5rem] shadow-lg mb-6 relative overflow-hidden transition-colors duration-500`}>
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
         <div className="flex justify-between items-start relative z-10">
             <div>
                <h1 className="text-2xl font-bold">Siriwong Portal 🏗️</h1>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                    {user ? (
                        <>สวัสดี, <span className="text-white font-bold">{user.username}</span> 
                        {isAdmin && <span className={`${theme.badge} text-white text-[10px] px-2 py-0.5 rounded-full font-bold ml-1 border-none`}>ADMIN</span>}</>
                    ) : (
                        <>สวัสดี, <span className="text-white font-bold">ผู้เยี่ยมชม</span> (View Only)</>
                    )}
                </p>
             </div>
             
             <div className="flex gap-2">
                 <Link href="/" className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center shadow-lg border border-white/10 transition-colors" title="กลับหน้าเมนูหลัก">
                    <Icons.Home />
                 </Link>

                 {user ? (
                     <>
                        {isAdmin && <button onClick={() => setIsUserMgrOpen(true)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white w-10 h-10 flex items-center justify-center shadow-lg transition-colors"><Icons.ManageUsers /></button>}
                        <button onClick={logout} className="bg-red-500/20 hover:bg-red-500/40 text-red-200 p-2 rounded-full w-10 h-10 flex items-center justify-center transition-colors"><Icons.Logout /></button>
                     </>
                 ) : (
                     <Link href="/login" className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full w-auto h-10 flex items-center justify-center px-4 font-bold text-xs gap-1 border border-white/20"><Icons.Login /> เข้าสู่ระบบ</Link>
                 )}
             </div>
         </div>
      </header>

      <main className="px-4 space-y-4 max-w-md mx-auto pb-20">
        <div className="flex justify-between items-end mb-2 pl-2 border-l-4 border-slate-900">
            <h2 className="font-bold text-slate-700 uppercase text-xs tracking-widest">{theme.title}</h2>
            <span className="text-[10px] text-slate-400 font-bold">({filteredProjects.length})</span>
        </div>
        
        <Link href="/" className="text-xs text-slate-400 mb-4 inline-block hover:text-blue-500">← กลับหน้าเมนูหลัก</Link>

        {filteredProjects.length === 0 ? (
            <div className="text-center py-20 text-slate-400 italic bg-white rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2">
                <span className="text-4xl opacity-50">{isSurveyMode ? '📐' : '📂'}</span>
                <span className="font-light">{theme.empty}</span>
            </div>
         ) : (
            filteredProjects.map((p) => {
             const isSurvey = p.project_status === 'survey';
             const statusConfig = isSurvey 
                ? { text: "Survey Mode", color: "bg-purple-50 text-purple-700 border-purple-100", icon: "📐" }
                : { text: "Construction", color: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: "🏗️" };
                
             const isOwner = user?.id && p.creator && p.creator.id === user.id;
             const canEdit = isAdmin || isOwner;

             const projProgress = p.jobs && p.jobs.length > 0 
                ? Math.round(p.jobs.map((job: any) => {
                    if (!job.job_tasks || job.job_tasks.length === 0) return job.progress || 0;
                    return job.job_tasks.reduce((s: number, t: any) => s + (t.progress || 0), 0) / job.job_tasks.length;
                    }).reduce((sum: number, avg: number) => sum + avg, 0) / p.jobs.length)
                : 0;
                
             const targetLink = isSurveyMode ? `/manage/survey/${p.documentId}` : `/manage/project/${p.documentId}`;

             return (
              <Link href={targetLink} key={p.id} className="group block bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all relative">
                 <div className="p-6 flex justify-between items-center">
                    <div className="flex-1 pr-4">
                        <div className="flex justify-between items-start mb-2">
                            <div className="pr-8">
                                 <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 border ${statusConfig.color}`}><span>{statusConfig.icon}</span> {statusConfig.text}</div>
                                 <h2 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{p.name}</h2>
                                 {p.creator && <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Owner: {p.creator.username} {isOwner && <span className="text-emerald-500">(คุณ)</span>}</p>}
                            </div>
                            {canEdit && (
                                <div className="absolute top-4 right-4 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => handleEditProject(e, p)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 bg-slate-50 hover:bg-amber-50 hover:text-amber-500 shadow-sm border border-slate-100"><Icons.Edit /></button>
                                    <button onClick={(e) => handleDeleteProject(e, p.documentId)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 bg-slate-50 hover:bg-red-50 hover:text-red-500 shadow-sm border border-slate-100"><Icons.Delete /></button>
                                </div>
                            )}
                        </div>
                        
                        {!isSurveyMode && (
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-3 border border-slate-50">
                               <div className="h-full bg-slate-900 rounded-full transition-all duration-1000" style={{ width: `${projProgress}%` }}></div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-center justify-center border-l-2 border-slate-50 pl-6 shrink-0 min-w-[80px]">
                        {!isSurveyMode ? (
                            <>
                                <span className="text-4xl font-black text-slate-900 leading-none tracking-tighter">{projProgress}%</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest opacity-60">Status</span>
                            </>
                        ) : (
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                                <span className="text-2xl">📸</span>
                            </div>
                        )}
                    </div>
                 </div>
              </Link>
            );
         })
        )}
      </main>
      
      {user && (
          <button 
            onClick={() => { resetProjectForm(); setIsModalOpen(true); }} 
            className={`fixed bottom-8 right-6 w-16 h-16 ${theme.createBtn} text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-[100] text-3xl font-light`}
          >
            +
          </button>
      )}

      {/* --- MODAL: PROJECT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl h-[80vh] overflow-y-auto animate-in slide-in-from-bottom-10">
              <h3 className="font-bold text-xl mb-6 text-slate-800">
                {editingId ? "✏️ แก้ไขข้อมูล" : (isSurveyMode ? "📐 เพิ่มงานสำรวจใหม่" : "🏗️ สร้างโครงการใหม่")}
              </h3>
              
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                  {isAdmin && (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
                          <label className="text-[10px] font-black text-blue-700 ml-1 mb-2 block uppercase tracking-wider">👤 Project Owner</label>
                          <select className="w-full p-3 bg-white text-sm rounded-xl border border-blue-200 font-bold outline-none" value={projectForm.ownerId} onChange={e => setProjectForm({...projectForm, ownerId: e.target.value})}>
                             <option value="" disabled>-- เลือกคนดูแล --</option>
                             {users.map(u => (<option key={u.id} value={u.id}>{u.username} ({u.position || 'พนักงาน'})</option>))}
                          </select>
                      </div>
                  )}
                  <input placeholder="ชื่อโครงการ / ลูกค้า" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold text-slate-700" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
                  <div className="flex gap-2">
                     <button type="button" onClick={handleGetLocation} className="bg-slate-100 text-slate-600 px-4 rounded-2xl border border-slate-200 text-xs font-black flex items-center gap-1 hover:bg-slate-200 active:scale-95 transition-all">{gpsLoading ? "..." : "📍 GPS"}</button>
                     <input placeholder="พิกัด (Lat, Lng)" className="flex-1 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold outline-none" value={projectForm.coordinates} onChange={e => setProjectForm({...projectForm, coordinates: e.target.value})} />
                  </div>
                  <input placeholder="ระยะทางจากสาขา (กม.)" type="number" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold" value={projectForm.distance} onChange={e => setProjectForm({...projectForm, distance: e.target.value})} />
                  <input placeholder="สถานที่ตั้ง" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none font-bold" value={projectForm.location} onChange={e => setProjectForm({...projectForm, location: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] font-black text-slate-400 pl-2 uppercase">วันเริ่ม</label><input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold outline-none" value={projectForm.start} onChange={e => setProjectForm({...projectForm, start: e.target.value})} /></div>
                      <div><label className="text-[10px] font-black text-slate-400 pl-2 uppercase">วันจบ</label><input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold outline-none" value={projectForm.end} onChange={e => setProjectForm({...projectForm, end: e.target.value})} /></div>
                  </div>
                  
                  <div className="flex gap-3 pt-6">
                    <button type="button" onClick={resetProjectForm} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase text-xs tracking-widest">ยกเลิก</button>
                    <button type="submit" className={`flex-1 py-4 rounded-2xl ${isSurveyMode ? 'bg-purple-600' : 'bg-slate-900'} text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-slate-200`}>{editingId ? "บันทึก" : "สร้าง"}</button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* --- MODAL: USER MANAGEMENT --- */}
      {isUserMgrOpen && isAdmin && (
          <div className="fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl h-[85vh] overflow-y-auto relative animate-in zoom-in-95">
                <button onClick={() => { setIsUserMgrOpen(false); resetUserForm(); }} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">✕</button>
                <h3 className="font-bold text-2xl mb-2 text-slate-800 flex items-center gap-2">จัดการผู้ใช้งาน</h3>
                <form onSubmit={handleUserSubmit} className="bg-slate-50 p-6 rounded-3xl mb-8 space-y-4 border border-slate-100 mt-6 shadow-inner">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">{isEditingUser ? "✏️ แก้ไขข้อมูลพนักงาน" : "➕ เพิ่มพนักงานใหม่"}</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <input required placeholder="Username" className="col-span-2 p-4 bg-white rounded-2xl border border-slate-200 text-sm outline-none font-bold" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
                        <input required type="email" placeholder="Email" className="col-span-2 p-4 bg-white rounded-2xl border border-slate-200 text-sm outline-none font-bold" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                        <input type="password" placeholder={isEditingUser ? "รหัสผ่านใหม่ (ว่างไว้ถ้าไม่เปลี่ยน)" : "Password*"} className="col-span-2 p-4 bg-white rounded-2xl border border-slate-200 text-sm outline-none font-bold" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 ml-1 mb-2 block uppercase tracking-widest">ตำแหน่ง</label>
                        <input placeholder="ระบุตำแหน่ง..." className="w-full p-4 bg-white rounded-2xl border border-slate-200 text-sm outline-none mb-3 font-bold" value={userForm.position} onChange={e => setUserForm({...userForm, position: e.target.value})} />
                        <div className="flex flex-wrap gap-2">{uniquePositions.map((pos, idx) => (<button key={idx} type="button" onClick={() => setUserForm({...userForm, position: pos})} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] text-slate-600 transition font-bold hover:bg-blue-50 hover:border-blue-200">{pos}</button>))}</div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        {isEditingUser && <button type="button" onClick={resetUserForm} className="flex-1 py-4 text-xs bg-white border border-slate-200 text-slate-500 rounded-2xl font-black uppercase tracking-widest">ยกเลิก</button>}
                        <button type="submit" className="flex-1 py-4 text-xs bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg">{isEditingUser ? "อัปเดตข้อมูล" : "สร้าง User"}</button>
                    </div>
                </form>
                <div className="space-y-3 pb-6">
                    <p className="text-[10px] font-black text-slate-400 ml-1 mb-4 uppercase tracking-widest">รายชื่อพนักงาน ({users.length})</p>
                    {users.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 border border-slate-50 rounded-3xl hover:bg-slate-50 transition-all group shadow-sm bg-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-slate-200">{u.username.charAt(0).toUpperCase()}</div>
                                <div><p className="text-sm font-black text-slate-800">{u.username} {u.role?.name === 'Admin' && <span className="text-[8px] bg-amber-500 text-white px-2 py-0.5 rounded-full ml-1 border-none shadow-sm">ADMIN</span>}</p><p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{u.email} • {u.position || "-"}</p></div>
                            </div>
                            <div className="flex gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditUserClick(u)} className="p-2.5 rounded-xl text-slate-400 bg-slate-50 hover:text-amber-500 transition-colors"><Icons.Edit /></button>
                                <button onClick={() => handleDeleteUser(u.id)} className="p-2.5 rounded-xl text-slate-400 bg-slate-50 hover:text-red-500 transition-colors"><Icons.Delete /></button>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
      )}
    </div>
  );
}

// ✅ 3. สร้าง Main Component ที่ครอบด้วย Suspense
export default function ManageProjectsPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-400 bg-slate-50">กำลังโหลดข้อมูล...</div>}>
      <ManageProjectsContent />
    </Suspense>
  );
}