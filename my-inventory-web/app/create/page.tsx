// src/app/create/page.tsx
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

export default function CreateProductPage() {

  async function createProduct(formData: FormData) {
    "use server";
    
    // 1. ดึงข้อมูลพื้นฐาน
    const name = formData.get("name") as string;
    const stock = formData.get("stock");
    const file = formData.get("image") as File; // 👈 ดึงไฟล์รูปมา

    let imageId = null;

    // 2. 📸 ถ้ามีการเลือกรูป -> ให้อัปโหลดไป Strapi ก่อน
    if (file && file.size > 0) {
        const uploadData = new FormData();
        uploadData.append("files", file);

        try {
            const uploadRes = await fetch("http://localhost:1337/api/upload", {
                method: "POST",
                body: uploadData, // ส่งไฟล์ไปตรงๆ
            });

            if (uploadRes.ok) {
                const json = await uploadRes.json();
                imageId = json[0].id; // ✅ ได้ ID ของรูปมาแล้ว!
            }
        } catch (error) {
            console.error("Upload failed:", error);
        }
    }

    // 3. สร้างสินค้า และแนบ ID รูปไปด้วย (ถ้ามี)
    const payload = {
        data: {
            name: name,
            stock: Number(stock),
            image: imageId // 👈 ผูกรูปตรงนี้
        }
    };

    const res = await fetch("http://localhost:1337/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      revalidatePath("/");
      redirect("/");
    }
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-indigo-600 text-center">
          ➕ เพิ่มสินค้าพร้อมรูป
        </h1>

        <form action={createProduct} className="space-y-4">
          
          {/* ส่วนชื่อ */}
          <div>
            <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
            <input
              name="name"
              type="text"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="เช่น iPhone 16"
            />
          </div>

          {/* ส่วนจำนวน */}
          <div>
            <label className="block text-sm font-medium text-gray-700">จำนวน</label>
            <input
              name="stock"
              type="number"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="0"
            />
          </div>

          {/* 🖼️ ส่วนอัปโหลดรูป (เพิ่มใหม่) */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition">
            <label className="block text-sm font-medium text-gray-700 mb-2">รูปสินค้า</label>
            <input 
                name="image" 
                type="file" 
                accept="image/*" // รับเฉพาะไฟล์รูป
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100"
            />
          </div>

          {/* ปุ่มกด */}
          <div className="flex gap-4 mt-6">
            <Link 
                href="/"
                className="w-1/2 py-2 px-4 border border-gray-300 rounded-md text-center text-gray-700 hover:bg-gray-50"
            >
                ยกเลิก
            </Link>
            <button
              type="submit"
              className="w-1/2 py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold"
            >
              บันทึก
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}