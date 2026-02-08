"use client";

import { useState, useEffect, useRef, useCallback } from "react";
// ✅ ใช้ Portal เพื่อแก้ปัญหาเมนูบัง (วาร์ป Modal ไปที่ Body)
import { createPortal } from "react-dom";
import { STRAPI_URL } from "@/services/config";
import { 
    createProjectGallery, 
    getProjectGalleries, 
    uploadFilesOnly, 
    deleteProjectGallery, 
    getGalleryPhotos,       
    removePhotoFromGallery,
    addPhotosToGallery
} from "@/services/api";

interface ProjectGalleryProps {
    projectId: string;
    // ไม่จำเป็นต้องใช้ onModalStateChange แล้ว เพราะ Portal จะทับเมนูเอง
    onModalStateChange?: (isOpen: boolean) => void;
}

export default function ProjectGallery({ projectId }: ProjectGalleryProps) {
    const [galleries, setGalleries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    // --- INFINITE SCROLL STATE ---
    const [viewingAlbum, setViewingAlbum] = useState<any | null>(null);
    const [allPhotos, setAllPhotos] = useState<any[]>([]);          
    const [loadedPhotos, setLoadedPhotos] = useState<any[]>([]);    
    const [hasMorePhotos, setHasMorePhotos] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);

    // Form States
    const [newCategory, setNewCategory] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Add Photos State
    const [isAddingPhotos, setIsAddingPhotos] = useState(false);

    // ✅ State สำหรับ Portal (ป้องกัน Error: document is not defined)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // ---------------------- LOAD DATA ----------------------

    const loadGalleries = async () => {
        try {
            setLoading(true);
            const data = await getProjectGalleries(projectId);
            setGalleries(data);
        } catch (error) {
            console.error("Load Gallery Failed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (projectId) loadGalleries(); }, [projectId]);

    const refreshAlbumPhotos = async (albumDocId: string) => {
        try {
            const freshData = await getGalleryPhotos(albumDocId);
            
            if (freshData.photos && Array.isArray(freshData.photos) && freshData.photos.length > 0) {
                const sortedPhotos = freshData.photos.sort((a: any, b: any) => 
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setAllPhotos(sortedPhotos);
                const firstBatch = sortedPhotos.slice(0, 20);
                setLoadedPhotos(firstBatch);
                setHasMorePhotos(firstBatch.length < sortedPhotos.length);
            } else {
                setAllPhotos([]);
                setLoadedPhotos([]);
                setHasMorePhotos(false);
            }
        } catch (error) {
            console.error("Error fetching photos:", error);
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleOpenAlbum = async (album: any) => {
        setViewingAlbum(album);
        setAllPhotos([]);
        setLoadedPhotos([]);
        setHasMorePhotos(true);
        setIsLoadingMore(true);
        await refreshAlbumPhotos(album.documentId);
    };

    const loadNextBatch = () => {
        if (isLoadingMore || !hasMorePhotos) return;
        const currentLength = loadedPhotos.length;
        const totalLength = allPhotos.length;
        const nextBatchSize = 20;

        if (currentLength < totalLength) {
            const nextPhotos = allPhotos.slice(currentLength, currentLength + nextBatchSize);
            setLoadedPhotos(prev => [...prev, ...nextPhotos]);
            if (currentLength + nextBatchSize >= totalLength) setHasMorePhotos(false);
        } else {
            setHasMorePhotos(false);
        }
    };

    const lastPhotoRef = useCallback((node: any) => {
        if (isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMorePhotos) {
                loadNextBatch();
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoadingMore, hasMorePhotos, loadedPhotos.length, allPhotos.length]);


    // ---------------------- ACTIONS ----------------------

    const handleCreateGallery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory || !selectedFiles || selectedFiles.length === 0) return alert("ระบุชื่อและเลือกรูป");

        try {
            setSubmitting(true);
            const uploadedFiles = await uploadFilesOnly(selectedFiles);
            const fileIds = uploadedFiles.map((f: any) => f.id);

            await createProjectGallery({
                category_name: newCategory,
                description: newDesc,
                project: projectId,
                photos: fileIds
            });

            setNewCategory(""); setNewDesc(""); setSelectedFiles(null); setIsCreateOpen(false);
            loadGalleries();
        } catch (error) {
            console.error(error); alert("เกิดข้อผิดพลาด");
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddMorePhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !viewingAlbum) return;
        
        const confirmMsg = `ยืนยันเพิ่ม ${e.target.files.length} รูป เข้าอัลบั้ม "${viewingAlbum.category_name}"?`;
        if (!confirm(confirmMsg)) return;

        try {
            setIsAddingPhotos(true);
            const uploadedFiles = await uploadFilesOnly(e.target.files);
            // ✅ ใช้ ID (Integer) ในการ Connect
            const fileIds = uploadedFiles.map((f: any) => f.id);

            await addPhotosToGallery(viewingAlbum.documentId, fileIds);

            await refreshAlbumPhotos(viewingAlbum.documentId);
            loadGalleries();

        } catch (error) {
            console.error("Add Photos Failed:", error);
            alert("เพิ่มรูปไม่สำเร็จ");
        } finally {
            setIsAddingPhotos(false);
        }
    };

    const handleDeleteAlbum = async (e: React.MouseEvent, docId: string, name: string) => {
        e.stopPropagation();
        if (!confirm(`ต้องการลบอัลบั้ม "${name}" ใช่ไหม?`)) return;
        try {
            await deleteProjectGallery(docId);
            loadGalleries();
        } catch (error) {
            alert("ลบไม่สำเร็จ");
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!confirm("ต้องการลบรูปนี้ออกจากอัลบั้ม?")) return;
        if (!viewingAlbum) return;

        try {
            await removePhotoFromGallery(viewingAlbum.documentId, photoId);
            setAllPhotos(prev => prev.filter(p => p.documentId !== photoId && p.id !== photoId));
            setLoadedPhotos(prev => prev.filter(p => p.documentId !== photoId && p.id !== photoId));
        } catch (error) {
            console.error(error);
            alert("ลบรูปไม่สำเร็จ");
        }
    };

    if (loading && !viewingAlbum) return <div className="text-center py-10 text-slate-400 animate-pulse font-bold">Loading Gallery...</div>;

    return (
        <div className="pb-24 font-sans">
            <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="font-black text-slate-800 text-lg">📸 อัลบั้มรูปงาน ({galleries.length})</h2>
                <button onClick={() => setIsCreateOpen(true)} className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full font-black text-xs shadow-sm border border-emerald-100 active:scale-95 transition-transform">+ สร้างอัลบั้ม</button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {galleries.map((album) => {
                    const coverImage = album.photos && album.photos.length > 0 ? album.photos[0] : null;
                    const photoCount = album.photos?.length || 0;

                    return (
                        <div key={album.documentId} onClick={() => handleOpenAlbum(album)} className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 cursor-pointer group hover:shadow-md transition-all relative">
                            <button onClick={(e) => handleDeleteAlbum(e, album.documentId, album.category_name)} className="absolute top-6 right-6 z-20 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:scale-110">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.664-1.452Z" clipRule="evenodd" /></svg>
                            </button>
                            <div className="aspect-video w-full bg-slate-100 rounded-[1.5rem] overflow-hidden mb-4 relative z-10">
                                {coverImage ? (
                                    <img src={coverImage.url.startsWith('http') ? coverImage.url : `${STRAPI_URL}${coverImage.url}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">📷</div>
                                )}
                                <div className="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] px-3 py-1 rounded-full font-black backdrop-blur-sm">
                                    {photoCount > 0 ? `${photoCount} รูป` : 'อัลบั้ม'}
                                </div>
                            </div>
                            <div className="px-2">
                                <h3 className="font-black text-slate-800 text-lg leading-tight mb-1">{album.category_name}</h3>
                                {album.description && <p className="text-slate-400 text-xs truncate">{album.description}</p>}
                                <p className="text-[10px] text-slate-300 mt-2 font-bold uppercase tracking-wider">{new Date(album.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit'})}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ✅ 1. CREATE MODAL (PORTAL) */}
            {mounted && isCreateOpen && createPortal(
                <div className="fixed inset-0 bg-slate-900/80 z-[99999] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10">
                        <h3 className="font-black text-xl mb-6 text-slate-800 text-center">📁 สร้างอัลบั้มใหม่</h3>
                        <form onSubmit={handleCreateGallery} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">ชื่อหมวดหมู่</label>
                                <input type="text" placeholder="เช่น งานเทปูน" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100" value={newCategory} onChange={e => setNewCategory(e.target.value)} autoFocus />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">รายละเอียด</label>
                                <textarea rows={2} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-700 outline-none resize-none" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 ml-1 mb-1 block uppercase">เลือกรูปภาพ</label>
                                <input type="file" multiple accept="image/*" onChange={e => setSelectedFiles(e.target.files)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">ยกเลิก</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-200">{submitting ? 'กำลังอัปโหลด...' : 'สร้างอัลบั้ม'}</button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ✅ 2. VIEW ALBUM MODAL (PORTAL) */}
            {mounted && viewingAlbum && createPortal(
                <div className="fixed inset-0 bg-black/95 z-[99999] overflow-y-auto p-4 animate-in fade-in">
                    {/* ปุ่มปิด */}
                    <button onClick={() => setViewingAlbum(null)} className="fixed top-6 right-6 w-14 h-14 bg-white/20 rounded-full text-white flex items-center justify-center hover:bg-white/30 backdrop-blur-md z-[99999] shadow-lg border border-white/10 active:scale-90 transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    
                    <div className="max-w-2xl mx-auto pt-20 pb-20">
                        <div className="text-center mb-8">
                            <h2 className="text-white text-2xl font-black mb-2">{viewingAlbum.category_name}</h2>
                            <p className="text-white/60 text-sm mb-6">{viewingAlbum.description}</p>
                            
                            <label className={`inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-black text-sm cursor-pointer shadow-lg shadow-emerald-900/50 active:scale-95 transition-all ${isAddingPhotos ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isAddingPhotos ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>กำลังอัปโหลด...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M12 3.75a.75.75 0 0 1 .75.75v6.75h6.75a.75.75 0 0 1 0 1.5h-6.75v6.75a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" /></svg>
                                        <span>เพิ่มรูปในอัลบั้มนี้</span>
                                    </>
                                )}
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={handleAddMorePhotos}
                                    disabled={isAddingPhotos}
                                />
                            </label>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {loadedPhotos.map((photo: any, idx: number) => {
                                const isLast = idx === loadedPhotos.length - 1;
                                return (
                                    <div key={`${photo.id}-${idx}`} ref={isLast ? lastPhotoRef : null} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="rounded-2xl overflow-hidden bg-slate-900 shadow-2xl">
                                            <img src={photo.url.startsWith('http') ? photo.url : `${STRAPI_URL}${photo.url}`} className="w-full h-auto object-contain" loading="lazy" />
                                        </div>
                                        <button onClick={() => handleDeletePhoto(photo.documentId || photo.id)} className="absolute top-4 right-4 bg-red-500/80 text-white p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg backdrop-blur-sm z-20">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.664-1.452Z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {isLoadingMore && <div className="text-center py-8"><div className="inline-block w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div></div>}
                        {!hasMorePhotos && loadedPhotos.length > 0 && <div className="text-center py-8 text-white/30 text-xs font-bold uppercase tracking-widest">--- End of Album ---</div>}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}