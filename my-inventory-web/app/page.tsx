import Link from "next/link";
import { revalidatePath } from "next/cache";
import Image from "next/image"; // 👈 1. เรียกใช้ตัวแสดงรูปของ Next.js

interface Product {
  documentId: string;
  name: string;
  stock: number;
  image?: { url: string };
  // 👇 เพิ่มตรงนี้
  location?: { 
    name: string;
  };
}

// ฟังก์ชันดึงข้อมูล (ต้องเพิ่ม ?populate=* เพื่อบอก Strapi ให้ส่งข้อมูลรูปมาด้วย)
async function getProducts() {
  try {
    // 👇 สำคัญมาก! ต้องเติม ?populate=* ต่อท้าย ไม่งั้น Strapi ไม่ส่งรูปมาให้
    const res = await fetch('http://localhost:1337/api/products?populate=*', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export default async function Home() {
  const data = await getProducts();

  async function deleteProduct(formData: FormData) {
    "use server";
    const id = formData.get("id");
    await fetch(`http://localhost:1337/api/products/${id}`, { method: "DELETE" });
    revalidatePath("/");
  }

  return (
    <main className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-3xl mx-auto">
        
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-600">📦 My Inventory</h1>
            <Link href="/create" className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 transition-colors flex items-center gap-2">
              + เพิ่มสินค้า
            </Link>
        </div>

        <div className="space-y-4">
          {data.length === 0 ? (
            <p className="text-center text-gray-500">ไม่พบสินค้า</p>
          ) : (
            data.map((item: Product) => {
              // เช็คว่ามีรูปไหม? ถ้ามีให้เอา URL มาต่อกับ Host ของ Strapi
              const imageUrl = item.image 
                ? `http://localhost:1337${item.image.url}` 
                : null;

              return (
                <div key={item.documentId} className="bg-white p-4 rounded-lg shadow-md flex items-center gap-4 hover:shadow-lg transition-shadow">
                  
                  {/* 🖼️ ส่วนแสดงรูปภาพ */}
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden relative">
                    {imageUrl ? (
                      <img 
  src={imageUrl} 
  alt={item.name} 
  className="w-full h-full object-cover" 
/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="flex-grow">
                    {/* ... (ส่วนชื่อสินค้า) */}
<h2 className="text-xl font-semibold text-gray-800">{item.name}</h2>

{/* 👇 เพิ่มบรรทัดนี้: แสดงสถานที่เก็บ */}
{item.location && (
    <p className="text-sm text-indigo-500 font-medium">
        📍 เก็บที่: {item.location.name}
    </p>
)}

<p className="text-gray-500 text-sm">ID: {item.documentId}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 px-4 py-2 rounded-full">
                      <span className="text-indigo-600 font-bold">{item.stock} ชิ้น</span>
                    </div>

                    <Link href={`/edit/${item.documentId}`} className="text-indigo-500 hover:text-indigo-700 p-2 border border-indigo-100 rounded-md hover:bg-indigo-50">
                      ✏️ แก้ไข
                    </Link>

                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={item.documentId} />
                      <button type="submit" className="text-red-500 hover:text-red-700 p-2 border border-red-100 rounded-md hover:bg-red-50 transition-colors">
                        🗑️ ลบ
                      </button>
                    </form>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </main>
  );
}