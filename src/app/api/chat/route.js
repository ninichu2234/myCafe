import db from './database.json';

export async function POST(req) {
    try {
        const body = await req.json();
        const { question, cartItems } = body;

        
        const menuContext = JSON.stringify(db.menus || []);
        const optionsContext = JSON.stringify(db.options || {});


        const systemPrompt = `
            You are a helpful AI Barista at a cafe.
            
            [Cafe Data]
            Menu: ${menuContext}
            Options: ${optionsContext}
            User's Cart: ${JSON.stringify(cartItems || [])}
            
            You MUST respond ONLY with a valid JSON object in Thai. Do not include markdown like \`\`\`json.
            Structure:
            {
                "text": "Your conversational reply in Thai",
                "recommendations": [
                    {
                        "menuId": "id",
                        "menuName": "name",
                        "quantity": 1,
                        "suggestedOptions": []
                    }
                ],
                "itemsToAutoAdd": [],
                "itemsToModify": [],
                "itemsToDelete": []
            }
        `;


        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen2.5:1.5b', // หรือ 'qwen2.5' ตามที่คุณติดตั้งไว้
                prompt: `System: ${systemPrompt}\n\nUser: ${question}`,
                stream: false,
                format: 'json' // บังคับให้ตอบเป็น JSON (Ollama รองรับฟีเจอร์นี้)
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama Server Error: ${response.status}`);
        }

        const data = await response.json();
        
        // 4. แปลงคำตอบจาก AI กลับเป็น JSON Object เพื่อส่งให้หน้าเว็บ
        const jsonResponse = JSON.parse(data.response);

        return new Response(JSON.stringify(jsonResponse), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error("Local RAG Backend Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}