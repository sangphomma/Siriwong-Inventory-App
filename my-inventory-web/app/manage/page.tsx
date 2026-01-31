// app/manage/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  getAllProjects, createProject, deleteProject, updateProject, 
  getAllUsers, createUser, updateUser, deleteUser , getDefaultRole
} from "@/services/api"; 
import { useAuth } from "../context/AuthContext";

const OFFICE_LAT = 13.879714702894447;
const OFFICE_LNG = 100.63002504136652;

// ... (Icons Component เหมือนเดิม) ...
const Icons = {
  Login: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>
  ),
  Edit: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
  ),
  Delete: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
  ),
  UserAdd: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" /></svg>
  ),
  Logout: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
  ),
  ManageUsers: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
  )
};

export default function ManageProjectsPage() {
  const { user, logout, loading: authLoading } = useAuth();
  
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

  // ✅ Auto Calculate Distance: คำนวณทันทีเมื่อ coordinates เปลี่ยน
  useEffect(() => {
    if (projectForm.coordinates) {
        const parts = projectForm.coordinates.split(',').map(s => s.trim());
        if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            // ถ้าเป็นตัวเลขทั้งคู่ ให้คำนวณเลย
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
    if (projects.length === 0) return;
    if (!user) { setFilteredProjects(projects); return; }
    if (isAdmin) setFilteredProjects(projects);
    else {
        // const myProjects = projects.filter(p => p.creator?.id === user.id); 
        setFilteredProjects(projects); 
    }
  }, [projects, user, isAdmin]);

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
        // setCoordinates ปุ๊บ useEffect จะทำงานคำนวณ distance ให้เอง
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
    const payload = { ...projectForm, ownerId: Number(projectForm.ownerId) };
    try {
        if (editingId) await updateProject(editingId, payload); else await createProject(payload);
        resetProjectForm(); loadData();
    } catch(err) { console.error(err); alert("บันทึกไม่สำเร็จ"); }
  };
  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
      e.preventDefault(); e.stopPropagation(); if(confirm("ยืนยันลบโครงการนี้?")) { await deleteProject(id); loadData(); }
  };

  // --- User Management ---
  const resetUserForm = () => { setUserForm({ id: "", username: "", email: "", password: "", position: "" }); setIsEditingUser(false); };
  const handleEditUserClick = (u: any) => {
    setUserForm({ id: u.id, username: u.username, email: u.email, password: "", position: u.position || "" });
    setIsEditingUser(true);
  };
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (isEditingUser) {
            const payload: any = { username: userForm.username, email: userForm.email, position: userForm.position };
            if (userForm.password) payload.password = userForm.password;
            await updateUser(userForm.id, payload);
        } else {
            if (!userForm.password) return alert("กรุณาตั้งรหัสผ่าน");
            const defaultRoleId = await getDefaultRole();
            if (!defaultRoleId) return alert("ไม่พบข้อมูล Role ในระบบ");
            const { id, ...userData } = userForm; 
            await createUser({ ...userData, confirmed: true, role: defaultRoleId });
        }
        resetUserForm(); loadData();
    } catch (err: any) { alert("บันทึก User ไม่สำเร็จ"); }
  };
  const handleDeleteUser = async (id: string) => {
    if(confirm("ต้องการลบ User นี้หรือไม่?")) { try { await deleteUser(id); loadData(); } catch (err) { alert("ลบไม่สำเร็จ"); } }
  };

  if (authLoading || loading) return <div className="h-screen flex items-center justify-center text-slate-400 bg-slate-50">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans relative">
      <header className="bg-slate-900 text-white p-6 rounded-b-[2rem] shadow-lg mb-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
         <div className="flex justify-between items-start relative z-10">
             <div>
                <h1 className="text-2xl font-bold">Siriwong Portal 🏗️</h1>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                    {user ? (
                        <>สวัสดี, <span className="text-white font-bold">{user.username}</span> 
                        {isAdmin && <span className="bg-amber-500 text-black text-[10px] px-2 py-0.5 rounded-full font-bold">ADMIN</span>}</>
                    ) : (
                        <>สวัสดี, <span className="text-white font-bold">ผู้เยี่ยมชม</span> (View Only)</>
                    )}
                </p>
             </div>
             <div className="flex gap-2">
                 {user ? (
                     <>
                        {isAdmin && <button onClick={() => setIsUserMgrOpen(true)} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white w-10 h-10 flex items-center justify-center shadow-lg"><Icons.ManageUsers /></button>}
                        <button onClick={logout} className="bg-red-500/20 hover:bg-red-500/40 text-red-200 p-2 rounded-full w-10 h-10 flex items-center justify-center"><Icons.Logout /></button>
                     </>
                 ) : (
                     <Link href="/login" className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full w-auto h-10 flex items-center justify-center px-4 font-bold text-xs gap-1 border border-white/20"><Icons.Login /> เข้าสู่ระบบ</Link>
                 )}
             </div>
         </div>
      </header>

      <main className="px-4 space-y-4 max-w-md mx-auto pb-20">
        <h2 className="font-bold text-slate-700 mb-2 pl-2 border-l-4 border-slate-900">โครงการทั้งหมด ({filteredProjects.length})</h2>
        {filteredProjects.length === 0 ? (
            <div className="text-center py-20 text-slate-400 italic bg-white rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2"><span className="text-4xl opacity-50">📂</span><span className="font-light">ไม่พบโครงการ</span></div>
         ) : (
            filteredProjects.map((p) => {
             const status = { text: "กำลังดำเนินงาน", color: "bg-emerald-100 text-emerald-700", icon: "🟢" };
             const isOwner = user?.id && p.creator && p.creator.id === user.id;
             const canEdit = isAdmin || isOwner;
             return (
              <Link href={`/manage/project/${p.documentId}`} key={p.id} className="group block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all relative">
                 <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${status.color.split(' ')[0]}`}></div>
                 <div className="p-5 pl-7">
                    <div className="flex justify-between items-start mb-2">
                        <div className="pr-16">
                             <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 ${status.color}`}><span>{status.icon}</span> {status.text}</div>
                             <h2 className="font-bold text-lg text-slate-800 leading-tight">{p.name}</h2>
                             {p.creator && <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">👤 {p.creator.username} {isOwner && <span className="text-emerald-500 font-bold">(คุณ)</span>}</p>}
                        </div>
                        {canEdit && (
                            <div className="absolute top-4 right-4 flex gap-1 z-10">
                                <button onClick={(e) => handleEditProject(e, p)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 bg-slate-50 hover:bg-amber-50 hover:text-amber-500 shadow-sm border border-slate-100"><Icons.Edit /></button>
                                <button onClick={(e) => handleDeleteProject(e, p.documentId)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 bg-slate-50 hover:bg-red-50 hover:text-red-500 shadow-sm border border-slate-100"><Icons.Delete /></button>
                            </div>
                        )}
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2"><div className="h-full bg-slate-900 rounded-full" style={{ width: `50%` }}></div></div>
                 </div>
              </Link>
            );
         })
        )}
      </main>
      
      {user && <button onClick={() => { resetProjectForm(); setIsModalOpen(true); }} className="fixed bottom-8 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-[100]"><Icons.UserAdd /></button>}

      {/* --- MODAL: PROJECT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl h-[80vh] overflow-y-auto">
              <h3 className="font-bold text-lg mb-4 text-slate-800">{editingId ? "✏️ แก้ไขโครงการ" : "🏗️ สร้างโครงการใหม่"}</h3>
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                  {isAdmin && (
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                          <label className="text-xs font-bold text-blue-700 ml-1 mb-1 block">👤 Owner</label>
                          <select className="w-full p-2 bg-white text-sm rounded-lg border border-blue-200" value={projectForm.ownerId} onChange={e => setProjectForm({...projectForm, ownerId: e.target.value})}>
                             <option value="" disabled>-- เลือกคนดูแล --</option>
                             {users.map(u => (<option key={u.id} value={u.id}>{u.username} ({u.position})</option>))}
                          </select>
                      </div>
                  )}
                  <input placeholder="ชื่อโครงการ" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200" value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})} />
                  <div className="flex gap-2">
                     <button type="button" onClick={handleGetLocation} className="bg-slate-100 text-slate-600 px-3 rounded-xl border border-slate-200 text-xs font-bold flex items-center gap-1 hover:bg-slate-200">{gpsLoading ? "..." : "📍 GPS"}</button>
                     <input placeholder="พิกัด (Lat, Lng)" className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm" value={projectForm.coordinates} onChange={e => setProjectForm({...projectForm, coordinates: e.target.value})} />
                  </div>
                  {/* Distance จะถูกคำนวณอัตโนมัติ แต่ยังแก้ไขเองได้ */}
                  <input placeholder="ระยะทางจากสาขา (กม.)" type="number" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200" value={projectForm.distance} onChange={e => setProjectForm({...projectForm, distance: e.target.value})} />
                  <input placeholder="สถานที่ตั้ง" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200" value={projectForm.location} onChange={e => setProjectForm({...projectForm, location: e.target.value})} />
                  <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] font-bold text-slate-400 pl-1">วันเริ่ม</label><input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm" value={projectForm.start} onChange={e => setProjectForm({...projectForm, start: e.target.value})} /></div>
                      <div><label className="text-[10px] font-bold text-slate-400 pl-1">วันจบ</label><input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm" value={projectForm.end} onChange={e => setProjectForm({...projectForm, end: e.target.value})} /></div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={resetProjectForm} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold">ยกเลิก</button>
                    <button type="submit" className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold">{editingId ? "บันทึก" : "สร้าง"}</button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* --- MODAL: USER MANAGEMENT --- */}
      {isUserMgrOpen && isAdmin && (
          <div className="fixed inset-0 bg-black/80 z-[1100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl h-[85vh] overflow-y-auto relative">
                <button onClick={() => { setIsUserMgrOpen(false); resetUserForm(); }} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition">✕</button>
                <h3 className="font-bold text-xl mb-1 text-slate-800 flex items-center gap-2">จัดการผู้ใช้งาน <span className="text-slate-400 text-sm font-normal">(Users)</span></h3>
                <form onSubmit={handleUserSubmit} className="bg-slate-50 p-5 rounded-2xl mb-6 space-y-4 border border-slate-100 mt-4 shadow-inner">
                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">{isEditingUser ? "✏️ แก้ไขข้อมูล" : "➕ เพิ่มพนักงานใหม่"}</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <input required placeholder="Username" className="col-span-2 p-3 bg-white rounded-xl border border-slate-200 text-sm outline-none" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} />
                        <input required type="email" placeholder="Email" className="col-span-2 p-3 bg-white rounded-xl border border-slate-200 text-sm outline-none" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
                        <input type="password" placeholder={isEditingUser ? "รหัสผ่านใหม่ (ว่างไว้ถ้าไม่เปลี่ยน)" : "Password*"} className="col-span-2 p-3 bg-white rounded-xl border border-slate-200 text-sm outline-none" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">ตำแหน่ง</label>
                        <input placeholder="ระบุตำแหน่ง..." className="w-full p-3 bg-white rounded-xl border border-slate-200 text-sm outline-none mb-2" value={userForm.position} onChange={e => setUserForm({...userForm, position: e.target.value})} />
                        <div className="flex flex-wrap gap-2">{uniquePositions.map((pos, idx) => (<button key={idx} type="button" onClick={() => setUserForm({...userForm, position: pos})} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 transition">{pos}</button>))}</div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        {isEditingUser && <button type="button" onClick={resetUserForm} className="flex-1 py-3 text-xs bg-white border border-slate-200 text-slate-500 rounded-xl font-bold">ยกเลิก</button>}
                        <button type="submit" className="flex-1 py-3 text-xs bg-slate-900 text-white rounded-xl font-bold shadow-lg">{isEditingUser ? "อัปเดตข้อมูล" : "สร้าง User"}</button>
                    </div>
                </form>
                <div className="space-y-2 pb-6">
                    <p className="text-xs font-bold text-slate-400 ml-1 mb-2">รายชื่อพนักงาน ({users.length})</p>
                    {users.map(u => (
                        <div key={u.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 transition group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">{u.username.charAt(0).toUpperCase()}</div>
                                <div><p className="text-sm font-bold text-slate-700">{u.username} {u.role?.name === 'Admin' && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded border border-amber-200">ADMIN</span>}</p><p className="text-[10px] text-slate-400">{u.email} • {u.position || "-"}</p></div>
                            </div>
                            <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditUserClick(u)} className="p-2 rounded-full text-slate-400 hover:bg-white hover:text-amber-500 transition"><Icons.Edit /></button>
                                <button onClick={() => handleDeleteUser(u.id)} className="p-2 rounded-full text-slate-400 hover:bg-white hover:text-red-500 transition"><Icons.Delete /></button>
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