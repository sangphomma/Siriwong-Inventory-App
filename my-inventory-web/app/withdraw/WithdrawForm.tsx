// src/app/withdraw/WithdrawForm.tsx
"use client"; // 👈 บรรทัดนี้สำคัญ! บอกว่าไฟล์นี้ทำงานบนหน้าจอมือถือ/คอมฯ ของ User

import { useState } from "react";
import { useRouter } from "next/navigation";

// กำหนดหน้าตาข้อมูล
interface Product {
  documentId: string;
  name: string;
  stock: number;
}

interface CartItem {
  product: Product;
  amount: number;
}

export default function WithdrawForm({ products }: { products: Product[] }) {
  const router = useRouter();
  
  // สร้างตัวแปรเก็บค่าต่างๆ (State)
  const [userName, setUserName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [amount, setAmount] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]); // ตะกร้าสินค้า
  const [loading, setLoading] = useState(false);

  // ฟังก์ชัน: หยิบของใส่ตะกร้า
  const addToCart = () => {
    if (!selectedProductId) return alert("กรุณาเลือกสินค้า");
    if (amount <= 0) return alert("จำนวนต้องมากกว่า 0");

    const product = products.find((p) => p.documentId === selectedProductId);
    if (!product) return;

    if (amount > product.stock) return alert(`สต็อกไม่พอ! (เหลือ ${product.stock})`);

    // เพิ่มลงตะกร้า (ถ้าซ้ำให้บวกเพิ่ม)
    setCart((prev) => {
        // เช็คว่ามีของนี้ในตะกร้าหรือยัง
        const existing = prev.find(item => item.product.documentId === product.documentId);
        if (existing) {
            // ถ้ามีแล้ว ให้เอาของเดิม + ของใหม่
            return prev.map(item => 
                item.product.documentId === product.documentId 
                ? { ...item, amount: item.amount + amount } 
                : item
            );
        }
        // ถ้ายังไม่มี ให้เพิ่มรายการใหม่
        return [...prev, { product, amount }];
    });

    // รีเซ็ตค่าหลังกดเพิ่ม
    setAmount(1);
    setSelectedProductId("");
  };

  // ฟังก์ชัน: ลบของออกจากตะกร้า
  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // 🚀 ฟังก์ชัน: บันทึกรายการเบิก (Submit)
// ... (...)

  const handleSubmit = async () => {
    if (!userName) return alert("กรุณาระบุชื่อผู้เบิก");
    if (cart.length === 0) return alert("ตะกร้าว่างเปล่า");

    setLoading(true);
    try {
        const itemIds = [];
        
        // วนลูปสินค้าทีละชิ้นในตะกร้า
        for (const item of cart) {
            
            // ---------------------------------------------
            // 📉 Step 1: ตัดสต็อก (Update Product Stock) **เพิ่มใหม่ตรงนี้**
            // ---------------------------------------------
            const newStock = item.product.stock - item.amount;
            
            // ยิงไปบอก Strapi ให้แก้เลข Stock ของสินค้านี้
            await fetch(`http://localhost:1337/api/products/${item.product.documentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: { stock: newStock }
                })
            });

            // ---------------------------------------------
            // 📝 Step 2: สร้างรายการเบิก (Withdrawal Item) เหมือนเดิม
            // ---------------------------------------------
            const res = await fetch("http://localhost:1337/api/withdrawal-items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        amount: item.amount,
                        product: item.product.documentId
                    }
                })
            });
            const json = await res.json();
            if(json.data) itemIds.push(json.data.documentId);
        }

        // ---------------------------------------------
        // 📋 Step 3: สร้างใบเบิก (Withdrawal Order) เหมือนเดิม
        // ---------------------------------------------
        const orderRes = await fetch("http://localhost:1337/api/withdrawal-orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: {
                    user_name: userName,
                    date: new Date().toISOString().split('T')[0],
                    withdrawal_items: itemIds
                }
            })
        });

        if (orderRes.ok) {
            alert("✅ บันทึกและตัดสต็อกเรียบร้อย!");
            setCart([]);
            setUserName("");
            router.refresh(); 
            router.push("/"); // เพิ่มบรรทัดนี้: ทำเสร็จแล้วดีดกลับหน้าแรกเลย จะได้เห็นเลขลดลง
        } else {
            alert("❌ บันทึกไม่ผ่าน");
        }

    } catch (error) {
        console.error(error);
        alert("Error เชื่อมต่อ Server ไม่ได้");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. โซนเลือกสินค้า */}
      <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
        <h3 className="font-bold text-indigo-700 mb-4">🛒 เลือกสินค้าเข้าตะกร้า</h3>
        <div className="flex gap-2 flex-wrap">
            <select 
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="border p-2 rounded flex-1 min-w-[200px]"
            >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                    <option key={p.documentId} value={p.documentId}>
                        {p.name} (คงเหลือ: {p.stock})
                    </option>
                ))}
            </select>

            <input 
                type="number" 
                value={amount}
                min="1"
                onChange={(e) => setAmount(Number(e.target.value))}
                className="border p-2 rounded w-24 text-center"
            />

            <button 
                onClick={addToCart}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
                + หยิบใส่ตะกร้า
            </button>
        </div>
      </div>

      {/* 2. โซนตารางตะกร้าสินค้า */}
      {cart.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-left bg-white">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-3">สินค้า</th>
                        <th className="p-3 w-24 text-center">จำนวน</th>
                        <th className="p-3 w-20">ลบ</th>
                    </tr>
                </thead>
                <tbody>
                    {cart.map((item, index) => (
                        <tr key={index} className="border-t">
                            <td className="p-3">{item.product.name}</td>
                            <td className="p-3 text-center font-bold text-indigo-600">{item.amount}</td>
                            <td className="p-3">
                                <button 
                                    onClick={() => removeFromCart(index)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    ❌
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      )}

      {/* 3. โซนยืนยันการเบิก */}
      <div className="border-t pt-6 mt-6">
        <label className="block mb-2 font-bold text-gray-700">ชื่อผู้เบิกสินค้า:</label>
        <input 
            type="text" 
            placeholder="ระบุชื่อของคุณ..."
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="border p-3 rounded w-full mb-4"
        />

        <button 
            onClick={handleSubmit}
            disabled={loading || cart.length === 0}
            className={`w-full py-3 rounded-lg text-white font-bold text-lg shadow-lg ${
                loading || cart.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
        >
            {loading ? "กำลังบันทึก..." : "✅ ยืนยันการเบิกสินค้า"}
        </button>
      </div>
    </div>
  );
}