"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllProjects, createProject, deleteProject, updateProject } from "@/services/api"; 

// 📍 พิกัดออฟฟิศบางเขน (Constant)
const OFFICE_LAT = 13.879714702894447;
const OFFICE_LNG = 100.63002504136652;

export default function ManageProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); 
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [projectForm, setProjectForm] = useState({
    name: "",
    location: "",
    coordinates: "", 
    distance: "",
    start: "",
    end: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllProjects();
      setProjects(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // สูตรคำนวณระยะทาง
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  // ฟังก์ชันดึง GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("Browser ไม่รองรับ GPS");
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const dist = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
        
        setProjectForm(prev => ({
          ...prev,
          distance: dist,
          coordinates: `${lat}, ${lng}`
        }));
        setGpsLoading(false);
      },
      (error) => {
        alert("ดึงตำแหน่งไม่ได้");
        setGpsLoading(false);
      }
    );
  };

  const openGoogleMapsPicker = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${OFFICE_LAT},${OFFICE_LNG}`, '_blank');
  };

  // ✅ ฟังก์ชันเปิด Google Maps นำทาง
  const openNavigateMap = (e: React.MouseEvent, coords: string) => {
    e.preventDefault(); // ป้องกันการกด Link ซ้อน
    e.stopPropagation();
    if (!coords) return;
    // เปิด Google Maps แบบ Search Query (ใช้ได้ทั้งบนมือถือและคอม)
    window.open(`https://www.google.com/maps/search/?api=1&query=${coords}`, '_blank');
  };

  const handleCoordinateChange = (val: string) => {
     setProjectForm(prev => ({...prev, coordinates: val}));
     const parts = val.split(',');
     if(parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if(!isNaN(lat) && !isNaN(lng)) {
            const dist = calculateDistance(lat, lng, OFFICE_LAT, OFFICE_LNG);
            setProjectForm(prev => ({ ...prev, coordinates: val, distance: dist }));
        }
     }
  };

  const resetForm = () => {
    setProjectForm({ name: "", location: "", coordinates: "", distance: "", start: "", end: "" });
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEditClick = (e: React.MouseEvent, project: any) => {
    e.preventDefault(); 
    e.stopPropagation();

    const startDate = project.start_date ? project.start_date.split('T')[0] : "";
    const endDate = project.end_date ? project.end_date.split('T')[0] : "";

    setProjectForm({
      name: project.name || "",
      location: project.location || "",
      coordinates: project.coordinates || "",
      distance: project.distance_from_branch ? String(project.distance_from_branch) : "",
      start: startDate,
      end: endDate
    });
    setEditingId(project.documentId);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!projectForm.name) return alert("กรุณาใส่ชื่อโครงการ");

    try {
        if (editingId) {
            await updateProject(editingId, projectForm);
        } else {
            await createProject(projectForm);
        }
        resetForm();
        loadData();
    } catch(err) {
        console.error(err);
        alert("บันทึกไม่สำเร็จ");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      if(confirm("ยืนยันลบโครงการนี้?")) {
          await deleteProject(id);
          loadData();
      }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans relative">
      <header className="bg-slate-900 text-white p-6 rounded-b-[2rem] shadow-lg mb-6 relative overflow-hidden">
         {/* ปุ่มย้อนกลับไปหน้า Main Hub */}
         <Link href="/" className="absolute top-6 left-4 text-white/50 hover:text-white text-xl z-20 transition-colors">
            🏠
         </Link>
         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
         <div className="ml-6">
            <h1 className="text-2xl font-bold relative z-10">Project List 🏗️</h1>
            <p className="text-slate-400 text-sm relative z-10">รายการโครงการทั้งหมด</p>
         </div>
      </header>

      {/* Main Content */}
      <main className="px-4 space-y-4 max-w-md mx-auto pb-20">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-2xl shadow-sm h-32 animate-pulse border border-slate-100 relative overflow-hidden">
                <div className="h-6 bg-slate-100 rounded-md w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-50 rounded-md w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-50 rounded-md w-1/3"></div>
            </div>
          ))
        ) : projects.length === 0 ? (
            <div className="text-center py-20 text-slate-400 italic bg-white rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2">
                <span className="text-4xl opacity-50">📂</span>
                <span className="font-light">ยังไม่มีโครงการ</span>
            </div>
         ) : (
         projects.map((p) => {
            const today = new Date().setHours(0,0,0,0);
            const start = p.start_date ? new Date(p.start_date).setHours(0,0,0,0) : null;
            const end = p.end_date ? new Date(p.end_date).setHours(0,0,0,0) : null;
            
            let status = { text: "รอกำหนด", color: "bg-slate-100 text-slate-500", icon: "⚪" };
            
            if (start && end) {
                if (today < start) status = { text: "รอเริ่มงาน", color: "bg-amber-100 text-amber-700", icon: "⏳" };
                else if (today >= start && today <= end) status = { text: "กำลังดำเนินงาน", color: "bg-emerald-100 text-emerald-700", icon: "🟢" };
                else if (today > end) status = { text: "จบโครงการ", color: "bg-blue-100 text-blue-700", icon: "🏁" };
            }

            let projectProgress = 0;
            if (p.jobs && p.jobs.length > 0) {
                const jobsProgressSum = p.jobs.reduce((sumJob: number, job: any) => {
                    const tasks = job.job_tasks || [];
                    if (tasks.length === 0) return sumJob + 0;
                    const totalTaskProgress = tasks.reduce((sumTask: number, task: any) => sumTask + (task.progress || 0), 0);
                    return sumJob + (totalTaskProgress / tasks.length);
                }, 0);
                projectProgress = Math.round(jobsProgressSum / p.jobs.length);
            } else if (status.text === "จบโครงการ") {
                projectProgress = 100;
            }

            return (
              <Link 
                href={`/manage/project/${p.documentId}`} 
                key={p.id} 
                className="group block bg-white rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative"
              >
                 <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${status.color.split(' ')[0]}`}></div>

                 <div className="p-5 pl-7">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="pr-16">
                             <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1 ${status.color}`}>
                                <span>{status.icon}</span> {status.text}
                             </div>
                             <h2 className="font-bold text-lg text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                                {p.name}
                             </h2>
                        </div>
                        
                        {/* Edit/Delete Buttons */}
                        <div className="absolute top-4 right-4 flex gap-1 bg-slate-50 p-1 rounded-full border border-slate-100 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => handleEditClick(e, p)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-amber-500 hover:shadow-sm transition-all">✏️</button>
                            <button onClick={(e) => handleDelete(e, p.documentId)} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-sm transition-all">🗑</button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                        <div className="flex justify-between items-end mb-1">
                             <span className="text-[10px] text-slate-400 font-medium">ความคืบหน้าภาพรวม</span>
                             <span className="text-xs font-bold text-slate-700">{projectProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out" style={{ width: `${projectProgress}%` }}></div>
                        </div>
                    </div>

                    {/* Content: ข้อมูลสถานที่ & ปุ่ม Map */}
                    <div className="space-y-1 mb-4 pt-2 border-t border-slate-50">
                        <p className="text-sm text-slate-600 flex items-start gap-2">
                           <span className="mt-0.5 text-xs">📍</span> 
                           <span className="line-clamp-1">{p.location || "ไม่ระบุที่ตั้ง"}</span>
                        </p>
                        
                        {/* ✅ โซนระยะทาง + ปุ่มนำทาง */}
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-500 flex items-center gap-2">
                               <span className="text-xs">🛣️</span> 
                               <span>ห่างจาก สนง. <b className="text-slate-700">{p.distance_from_branch || "-"}</b> กม.</span>
                            </p>
                            
                            {/* ถ้ามีพิกัด ให้โชว์ปุ่มนำทาง */}
                            {p.coordinates && (
                                <button 
                                    onClick={(e) => openNavigateMap(e, p.coordinates)}
                                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold hover:bg-blue-100 transition-colors z-20"
                                >
                                    <span>🧭</span> นำทาง
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Footer Date */}
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                            📅 
                            {p.start_date ? (
                                <span>
                                    {new Date(p.start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} 
                                    {" - "}
                                    {p.end_date ? new Date(p.end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : "..."}
                                </span>
                            ) : <span>ไม่ระบุวัน</span>}
                        </div>
                    </div>
                 </div>
              </Link>
            );
         })
        )}
      </main>

      {/* Button Open Modal */}
      <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="fixed bottom-8 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-400/50 flex items-center justify-center text-4xl pb-1 hover:bg-black active:scale-90 transition-all z-[999]">+</button>

      {/* Modal ... (คงเดิม) ... */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
              <h3 className="font-bold text-lg mb-4 text-slate-800">
                {editingId ? "✏️ แก้ไขโครงการ" : "🏗️ สร้างโครงการใหม่"}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                      <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">ชื่อโครงการ</label>
                      <input 
                        placeholder="เช่น บ้านคุณสมจิตร" 
                        className="w-full p-3 bg-slate-50 text-slate-900 font-medium rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400" 
                        value={projectForm.name} 
                        onChange={e => setProjectForm({...projectForm, name: e.target.value})} 
                        autoFocus 
                      />
                  </div>
                  {/* Location */}
                  <div>
                      <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">ที่ตั้ง (ชื่อสถานที่)</label>
                      <input 
                        placeholder="เช่น หมู่บ้านลัดดารมย์, ซอย 5" 
                        className="w-full p-3 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400 text-sm" 
                        value={projectForm.location} 
                        onChange={e => setProjectForm({...projectForm, location: e.target.value})} 
                      />
                  </div>
                  {/* GPS */}
                  <div>
                      <div className="flex justify-between items-center mb-1 ml-1">
                        <label className="text-xs font-bold text-slate-500">พิกัด GPS</label>
                        <div className="flex gap-1">
                             <button type="button" onClick={openGoogleMapsPicker} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full hover:bg-slate-50">🗺️ เปิดแผนที่</button>
                             <button type="button" onClick={handleGetLocation} disabled={gpsLoading} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold hover:bg-blue-200">{gpsLoading ? "..." : "📍 ดึงตำแหน่งปัจจุบัน"}</button>
                        </div>
                      </div>
                      <input 
                        placeholder="13.xxxx, 100.xxxx" 
                        className="w-full p-3 bg-slate-50 text-slate-600 font-mono text-xs rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400" 
                        value={projectForm.coordinates} 
                        onChange={e => handleCoordinateChange(e.target.value)} 
                      />
                  </div>
                  {/* Distance */}
                  <div>
                      <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">ระยะทางจากโรงงาน (กม.)</label>
                      <input 
                        type="number" 
                        placeholder="0.0" 
                        className="w-full p-3 bg-slate-50 text-slate-900 font-bold rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-slate-400" 
                        value={projectForm.distance} 
                        onChange={e => setProjectForm({...projectForm, distance: e.target.value})} 
                      />
                  </div>
                  {/* Dates */}
                  <div className="flex gap-3 pt-2">
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">วันเริ่ม</label>
                          <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm" value={projectForm.start} onChange={e => setProjectForm({...projectForm, start: e.target.value})} />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 ml-1 mb-1 block">วันจบ</label>
                          <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm" value={projectForm.end} onChange={e => setProjectForm({...projectForm, end: e.target.value})} />
                      </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={resetForm} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold">ยกเลิก</button>
                    <button type="submit" className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold shadow-lg">
                        {editingId ? "บันทึกการแก้ไข" : "สร้างโครงการ"}
                    </button>
                  </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}