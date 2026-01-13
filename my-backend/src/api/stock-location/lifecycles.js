module.exports = {
  async afterCreate(event) {
    console.log("🚀 Lifecycle: afterCreate Triggered");
    await updateProductStock(event);
  },

  async afterUpdate(event) {
    console.log("🚀 Lifecycle: afterUpdate Triggered");
    await updateProductStock(event);
  },

  async afterDelete(event) {
    console.log("🚀 Lifecycle: afterDelete Triggered");
    await updateProductStock(event);
  },
};

// ฟังก์ชันสำหรับคำนวณและอัปเดต Product
async function updateProductStock(event) {
  const { result, params } = event;

  try {
    // 1. หา ID ของ Stock Location ที่เพิ่งถูกกระทำ
    // กรณี Update/Create จะอยู่ใน result.id
    // กรณี Delete ข้อมูลอาจจะอยู่ใน params
    const stockLocationId = result ? result.id : params?.where?.id;

    if (!stockLocationId) {
      console.log("❌ Error: ไม่พบ Stock Location ID");
      return;
    }

    console.log(`🔎 Start Sync for StockLocation ID: ${stockLocationId}`);

    // 2. 🔥 ไม้ตาย: ดึงข้อมูล Stock Location นี้ พร้อม relation product จาก Database โดยตรง
    // (วิธีนี้ชัวร์ที่สุด ไม่ต้องสนว่า frontend ส่งอะไรมา)
    const stockLocEntity = await strapi.entityService.findOne(
      "api::stock-location.stock-location",
      stockLocationId,
      { populate: ["product"] } // ✅ สั่งให้ดึง Product มาด้วยเสมอ
    );

    // ดึง Product จากข้อมูลที่เราเพิ่ง Query มา
    const targetProduct = stockLocEntity?.product;

    if (!targetProduct) {
      console.log(
        "⚠️ Warning: Stock Location นี้ไม่ได้ผูกกับ Product ใดๆ (อาจจะเป็นข้อมูลกำพร้า)"
      );
      return;
    }

    const targetProductId = targetProduct.id;
    console.log(
      `🎯 Found Parent Product ID: ${targetProductId} (${targetProduct.name})`
    );

    // 3. ดึง Stock Location ทั้งหมดของ Product นี้มาบวกรวมกันใหม่
    const allLocations = await strapi.entityService.findMany(
      "api::stock-location.stock-location",
      {
        filters: {
          product: targetProductId,
        },
      }
    );

    // 4. คำนวณผลรวม
    const totalStock = allLocations.reduce((sum, loc) => {
      return sum + (parseInt(loc.on_hand_stock) || 0);
    }, 0);

    console.log(`✅ Calculated New Total: ${totalStock}`);

    // 5. อัปเดตกลับไปที่ Product
    await strapi.entityService.update("api::product.product", targetProductId, {
      data: {
        stock: totalStock,
      },
    });

    console.log(`💾 Product Updated Successfully to ${totalStock}!`);
  } catch (err) {
    console.error("❌ Lifecycle Error:", err);
  }
}
