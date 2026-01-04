export default {
  // ตั้งเวลา: รันทุกวัน ตอนตี 3 (0 3 * * *)
  '0 3 * * *': async ({ strapi }) => {
    console.log('⏰ Starting Auto-Delete Clean up...');
    
    // 1. หาวันที่เมื่อ 3 วันที่แล้ว
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    try {
      // 2. ค้นหารายการที่เป็น pending และเก่ากว่า 3 วัน
      const oldRequests = await strapi.db.query('api::withdrawal-request.withdrawal-request').findMany({
        where: {
          request_status: 'pending',
          createdAt: { $lt: threeDaysAgo.toISOString() }, // น้อยกว่า (เก่ากว่า) 3 วันที่แล้ว
        },
      });

      console.log(`🗑️ Found ${oldRequests.length} garbage requests.`);

      // 3. ลบทิ้งให้หมด!
      for (const req of oldRequests) {
        await strapi.documents('api::withdrawal-request.withdrawal-request').delete({
            documentId: req.documentId
        });
      }
      
      console.log('✅ Clean up completed!');
    } catch (err) {
      console.error('❌ Clean up failed:', err);
    }
  },
};