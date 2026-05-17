const { createClient } = require('@supabase/supabase-js'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } } // (บอกว่าไม่ต้องจำ session)
);

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// --- 5. ฟังก์ชันหลัก ---
async function generateEmbeddings() {
    console.log("--- เริ่มกระบวนการสร้าง Embeddings (ในโหมด Admin) ---");
    try {

        console.log("กำลังดึงข้อมูลเมนูจาก Supabase...");
        const { data: menuItems, error } = await supabaseAdmin 
            .from("menuItems")
            .select("menuId, menuName, menuDescription, menuCategory, allergens")
            .is('embedding', null);

        if (error) throw error;
        
        if (menuItems.length === 0) {
            console.log("--- ไม่พบเมนูที่เป็น NULL, ข้อมูล Embedding น่าจะครบแล้ว! ---");
            return; 
        }

        console.log(`พบเมนูที่ต้องทำ Embedding (ที่เป็น NULL) จำนวน ${menuItems.length} รายการ`);

        for (const item of menuItems) {
            const document = `เมนู: ${item.menuName}, 
                            ประเภท: ${item.menuCategory}, 
                            รายละเอียด: ${item.menuDescription || 'ไม่มี'}, 
                            สิ่งที่อาจแพ้: ${item.allergens ? item.allergens.join(', ') : 'ไม่มี'}`;

            console.log(`\nกำลังสร้าง Embedding สำหรับ: "${item.menuName}"...`);

            const result = await embeddingModel.embedContent(document);
            const embedding = result.embedding.values;
            const { error: updateError } = await supabaseAdmin // <-- (แก้ไข!)
                .from("menuItems")
                .update({ embedding: embedding })
                .eq("menuId", item.menuId);

            if (updateError) {
                console.error(`  [X] อัปเดตล้มเหลว (Admin): ${updateError.message}`);
            } else {
                console.log(`  [✓] บันทึก Embedding (Admin) สำหรับ "${item.menuName}" เรียบร้อย!`);
            }
        }
        console.log("\n--- กระบวนการสร้าง Embeddings ทั้งหมดเสร็จสมบูรณ์! ---");
    } catch (err) {
        console.error("\n--- เกิดข้อผิดพลาดร้ายแรง ---");
        console.error(err.message);
    }
}


generateEmbeddings();