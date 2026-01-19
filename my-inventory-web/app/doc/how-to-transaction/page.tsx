// app/doc/how-to-transaction/page.tsx
import React from 'react';
import Link from 'next/link';

export default function HowToTransaction() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        
        {/* ส่วนหัว */}
        <div className="bg-indigo-600 p-6 text-white">
          <h1 className="text-2xl font-bold">📱 วิธีการเบิกสินค้า (Withdrawal)</h1>
          <p className="opacity-80">Siriwong Inventory System</p>
        </div>

        {/* เนื้อหา */}
        <div className="p-6 space-y-6">
          
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</div>
            <div>
              <h3 className="font-bold text-lg">เข้าเมนูเบิกสินค้า</h3>
              <p className="text-slate-600">ที่หน้าแรก กดปุ่มสีส้ม "เบิกออก" (Withdraw)</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</div>
            <div>
              <h3 className="font-bold text-lg">ค้นหาสินค้า</h3>
              <p className="text-slate-600">พิมพ์ชื่อสินค้าในช่องค้นหา รายการแนะนำจะเด้งขึ้นมา เลือกสินค้าที่ต้องการ</p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</div>
            <div>
              <h3 className="font-bold text-lg">ระบุจำนวนและยืนยัน</h3>
              <p className="text-slate-600">ใส่จำนวนที่เบิก แล้วกดปุ่ม "บันทึกรายการ"</p>
            </div>
          </div>

        </div>

        {/* ปุ่มกลับ */}
        <div className="bg-slate-100 p-4 text-center">
             <Link href="/" className="text-indigo-600 hover:underline">กลับหน้าหลัก</Link>
        </div>

      </div>
    </div>
  );
}