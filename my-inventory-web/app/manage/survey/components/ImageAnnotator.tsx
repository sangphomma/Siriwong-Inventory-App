'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric'; 
// ✅ เพิ่ม Minus (แทนเส้นตรง), Palette, CircleIcon, Square, Trash2 เข้ามา
import { Save, X, Type, Pencil, Square, Circle as CircleIcon, Minus, Palette, Trash2 } from 'lucide-react';

interface Props {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

// ✅ กำหนดค่าสีมาตรฐาน
const AVAILABLE_COLORS = [
  { name: 'Red', value: '#ef4444' },    // แดง Tailwind
  { name: 'Blue', value: '#3b82f6' },   // น้ำเงิน Tailwind
  { name: 'Green', value: '#10b981' },  // เขียว Tailwind
];

export const ImageAnnotator = ({ imageUrl, onSave, onClose }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  
  // ✅ State เก็บสีที่เลือกปัจจุบัน (เริ่มต้นเป็นสีแดง)
  const [currentColor, setCurrentColor] = useState(AVAILABLE_COLORS[0].value);
  const [mode, setMode] = useState<'draw' | 'text' | 'shape'>('draw');

  useEffect(() => {
    if (!canvasRef.current) return;

    const initCanvas = async () => {
      const containerWidth = window.innerWidth > 500 ? 460 : window.innerWidth - 60;
      const canvas = new fabric.Canvas(canvasRef.current!, {
        width: containerWidth,
        height: 450,
        backgroundColor: '#1e293b', 
      });
      fabricRef.current = canvas;

      try {
        const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });
        
        const canvasWidth = canvas.width!;
        const canvasHeight = canvas.height!;
        const scale = Math.min(canvasWidth / img.width!, canvasHeight / img.height!);

        img.set({
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false
        });

        canvas.add(img);
        canvas.centerObject(img); // จัดกึ่งกลางอัตโนมัติ
        canvas.renderAll();
      } catch (error) {
        console.error("Error loading image:", error);
      }

      // ✅ ตั้งค่าปากกาเริ่มต้น
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = 5;
      canvas.freeDrawingBrush.color = currentColor; // ✅ ใช้สีจาก State
    };

    initCanvas();

    return () => {
      fabricRef.current?.dispose();
    };
  }, [imageUrl]);

  // ✅ ฟังก์ชันเปลี่ยนสีวาด
  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    if (!fabricRef.current) return;
    
    // อัพเดตสีปากกาวาด
    if (fabricRef.current.freeDrawingBrush) {
      fabricRef.current.freeDrawingBrush.color = color;
    }

    // อัพเดตสีของ Object ที่กำลังเลือกอยู่ (ถ้ามี)
    const activeObject = fabricRef.current.getActiveObject();
    if (activeObject) {
      if (activeObject instanceof fabric.IText) {
        activeObject.set('fill', color);
      } else {
        // สำหรับ Rect, Circle, Line ใช้ stroke
        activeObject.set('stroke', color);
      }
      fabricRef.current.renderAll();
    }
  };

  // ✅ ฟังก์ชันตั้งค่า Object ทั่วไป
  const setupNewObject = (obj: fabric.Object) => {
    if (!fabricRef.current) return;
    // ปิดโหมดวาดเส้นเมื่อเพิ่มทรง
    fabricRef.current.isDrawingMode = false;
    setMode('shape');
    
    fabricRef.current.add(obj);
    fabricRef.current.setActiveObject(obj);
    fabricRef.current.renderAll();
  };

  // ✅ ฟังก์ชันเพิ่มสี่เหลี่ยม
  const addRect = () => {
    const rect = new fabric.Rect({
      left: 100, top: 100, width: 100, height: 100,
      fill: 'transparent',
      stroke: currentColor, // ✅ ใช้สีที่เลือก
      strokeWidth: 4,
      cornerColor: '#3b82f6', borderColor: '#3b82f6', transparentCorners: false,
    });
    setupNewObject(rect);
  };

  // ✅ ฟังก์ชันเพิ่มวงกลม
  const addCircle = () => {
    const circle = new fabric.Circle({
      left: 100, top: 100, radius: 50,
      fill: 'transparent',
      stroke: currentColor, // ✅ ใช้สีที่เลือก
      strokeWidth: 4,
      cornerColor: '#3b82f6', borderColor: '#3b82f6', transparentCorners: false,
    });
    setupNewObject(circle);
  };

  // ✅ ฟังก์ชันเพิ่มเส้นตรง
  const addLine = () => {
    // สร้างเส้นจากพิกัด [x1, y1, x2, y2]
    const line = new fabric.Line([50, 50, 200, 50], {
      left: 100, top: 100,
      stroke: currentColor, // ✅ ใช้สีที่เลือก
      strokeWidth: 4,
      cornerColor: '#3b82f6', borderColor: '#3b82f6', transparentCorners: false,
    });
    setupNewObject(line);
  };

  const deleteSelected = () => {
    if (!fabricRef.current) return;
    fabricRef.current.getActiveObjects().forEach((obj) => {
      fabricRef.current?.remove(obj);
    });
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
  };

  const handleSave = () => {
    if (!fabricRef.current) return;
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    const dataUrl = fabricRef.current.toCanvasElement().toDataURL('image/jpeg', 0.8);
    fetch(dataUrl).then(res => res.blob()).then(blob => onSave(blob));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100001] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><Palette size={18} className="text-violet-600"/> แก้ไขรูปภาพ Survey</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500"><X size={24} /></button>
        </div>

        {/* ✅ แถบเลือกสี (Palette) */}
        <div className="flex gap-4 p-3 bg-white border-b justify-center items-center">
            {AVAILABLE_COLORS.map(color => (
                <button 
                    key={color.value} 
                    onClick={() => handleColorChange(color.value)}
                    className={`w-10 h-10 rounded-full border-4 shadow-inner transition-all ${currentColor === color.value ? 'border-violet-600 scale-110 shadow-lg' : 'border-white'}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                />
            ))}
        </div>
        
        {/* Toolbar (เลื่อนซ้ายขวาได้) */}
        <div className="flex gap-2 p-3 bg-white border-b overflow-x-auto">
          <button type="button" onClick={() => { setMode('draw'); fabricRef.current!.isDrawingMode = true; fabricRef.current!.discardActiveObject(); fabricRef.current!.renderAll(); }} 
            className={`shrink-0 py-2 px-3 rounded-xl flex items-center gap-2 font-bold text-sm ${mode === 'draw' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Pencil size={16}/> ปากกา
          </button>
          
          {/* ✅ ปุ่มเส้นตรง */}
          <button type="button" onClick={addLine} 
            className={`shrink-0 py-2 px-3 rounded-xl flex items-center gap-2 font-bold text-sm ${mode === 'shape' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Minus size={16} className="rotate-[-45deg]"/> เส้นตรง
          </button>

          <button type="button" onClick={addRect} 
            className={`shrink-0 py-2 px-3 rounded-xl flex items-center gap-2 font-bold text-sm ${mode === 'shape' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Square size={16}/> สี่เหลี่ยม
          </button>
          <button type="button" onClick={addCircle} 
            className={`shrink-0 py-2 px-3 rounded-xl flex items-center gap-2 font-bold text-sm ${mode === 'shape' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <CircleIcon size={16}/> วงกลม
          </button>
          <button type="button" onClick={() => {
            const text = new fabric.IText('จดบันทึก...', { left: 100, top: 100, fill: currentColor, fontSize: 24, fontWeight: 'bold', fontFamily: 'Sarabun' });
            setupNewObject(text);
            setMode('text');
          }} className={`shrink-0 py-2 px-3 rounded-xl flex items-center gap-2 font-bold text-sm ${mode === 'text' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
            <Type size={16}/> ข้อความ
          </button>
          
          <button type="button" onClick={deleteSelected} 
            className="shrink-0 py-2 px-3 rounded-xl flex items-center gap-2 font-bold text-sm bg-red-50 text-red-500 hover:bg-red-100 ml-auto">
            <Trash2 size={16}/> ลบ
          </button>
        </div>

        {/* Canvas พื้นที่วาดรูป */}
        <div className="flex justify-center bg-slate-800 p-2"><canvas ref={canvasRef} className="rounded-xl shadow-inner"/></div>
        
        {/* Footer */}
        <div className="p-4 flex gap-3 border-t bg-slate-50">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500">ยกเลิก</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-emerald-500 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-emerald-100">
            <Save size={18}/> ยืนยันแก้ไขรูป
          </button>
        </div>
      </div>
    </div>
  );
};