import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";

interface Product {
  documentId: string;
  name: string;
  stock: number;
}

// ฟังก์ชันดึงข้อมูลเก่ามาโชว์ (ดึงตาม ID)
async function getProduct(id: string) {
  const res = await fetch(`http://localhost:1337/api/products/${id}`, {
    cache: "no-store",
  });
  const json = await res.json();
  return json.data;
}

export default async function EditPage({ params }: { params: { id: string } }) {
  // 1. รับ ID จาก URL และดึงข้อมูลเก่ามาเตรียมไว้
  // ใน Next.js รุ่นใหม่ params ต้อง await ก่อนครับ
  const { id } = await params; 
  const product: Product = await getProduct(id);

  // ⚡ 2. Server Action สำหรับบันทึกการแก้ไข
  async function updateProduct(formData: FormData) {
    "use server";

    const name = formData.get("name");
    const stock = formData.get("stock");

    // ยิง PUT ไปที่ Strapi
    await fetch(`http://localhost:1337/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          name: name,
          stock: Number(stock),
        },
      }),
    });

    // สั่งรีเฟรชหน้าแรก และดีดกลับไป
    revalidatePath("/");
    redirect("/");
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-indigo-600 text-center">
          ✏️ แก้ไขสินค้า
        </h1>

        <form action={updateProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">ชื่อสินค้า</label>
            <input
              name="name"
              type="text"
              // ใส่ข้อมูลเก่าลงไปเป็นค่าเริ่มต้น (defaultValue)
              defaultValue={product.name}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">จำนวน</label>
            <input
              name="stock"
              type="number"
              // ใส่ข้อมูลเก่าลงไป
              defaultValue={product.stock}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

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
              บันทึกแก้ไข
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}