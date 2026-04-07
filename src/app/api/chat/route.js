import { NextResponse } from 'next/server';
// 1. นำเข้าไฟล์ database.json ที่เราเพิ่งสร้าง
import db from './database.json'; 

const MODEL_NAME = 'gemini-2.5-pro'; 
const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    // 2. รับมาแค่คำถาม, ประวัติแชท และข้อมูลในตะกร้า (ไม่ต้องรับ Menu/Options จากหน้าเว็บแล้ว)
    const { question, chatHistory, cartItems, cartContext: rawCartContext } = await request.json();

    if (!API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env.local file");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    // 3. แปลงข้อมูลจาก db (database.json) ให้กลายเป็นข้อความ (Context) เพื่อส่งให้ AI อ่าน
    let menuContext = "Menu List:\n";
    db.menus.forEach(menu => {
      menuContext += `- ID: ${menu.menuId} | Name: ${menu.menuName} | Price: ${menu.menuPrice} ฿ | Description: ${menu.description}\n`;
    });

    let optionsContext = "Available Customizations:\n";
    for (const [groupName, options] of Object.entries(db.options)) {
      optionsContext += `* ${groupName}:\n`;
      options.forEach(opt => {
        optionsContext += `  - ${opt.optionName} (+${opt.priceAdjustment} ฿)\n`;
      });
    }

    // จัดการตะกร้าสินค้า (อิงโค้ดเดิมของคุณ)
    let finalCartContext = "No items in cart.";
    if (cartItems && cartItems.length > 0) {
      finalCartContext = "Current Cart Items:\n";
      cartItems.forEach(item => {
        finalCartContext += `- cartItemId: ${item.cartItemId}, Name: ${item.menuName}, Qty: ${item.quantity}\n`;
        if (item.customizations?.selectedOptions?.length > 0) {
          finalCartContext += `  Options: ${item.customizations.selectedOptions.map(opt => `${opt.groupName}: ${opt.optionName}`).join(', ')}\n`;
        }
      });
    } else if (rawCartContext && rawCartContext !== "[]") {
      finalCartContext = `Current Cart Items: ${rawCartContext}`;
    }

    // System Prompt หลัก (รวมข้อมูลจาก Database แล้ว)
    const systemPrompt = `
        You are a helpful Thai cafe barista.
        You MUST respond with **only** a single, valid JSON object.
        Your "text" field MUST be in Thai.

        **JSON Format Required:**
        {
          "text": "Your conversational answer in Thai.",
          "recommendations": [
            { 
              "menuId": "ID", 
              "menuName": "Name",
              "quantity": 3, 
              "suggestedOptions": [ { "groupName": "Group", "optionName": "Option" } ] 
            }
          ],
          "itemsToAutoAdd": [],
          "itemsToModify": [],
          "itemsToDelete": []
        }

        **--- CRITICAL RULES ---**
        1.  **READ ALL CONTEXT:** You must read Chat History, Menu Context, Options Context, and Cart Context.
        2.  **QUANTITY IN RECOMMENDATIONS:** If the user specifies a quantity (e.g., "ขอชาไทย 3 แก้ว"), you MUST include the \`quantity\` field in the \`recommendations\` object.
        3.  **MATCH EXACTLY:** All \`groupName\`, \`optionName\`, \`menuId\` must match the contexts *perfectly*.
        
        **--- Provided Information (from Database) ---**
        **Menu Context:** ${menuContext}
        
        **Options Context:** ${optionsContext}
        
        **Cart Context:** ${finalCartContext} 
    `;

    const contents = [
        ...(chatHistory || []), 
        {
            role: "user",
            parts: [{ text: question }]
        }
    ];
    
    const requestBody = { 
      contents: contents, 
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { responseMimeType: "application/json" },
    };

    // ส่งคำขอไปที่ Gemini API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status: ${response.status}`);
    }

    const data = await response.json();
    const rawResponseText = data.candidates[0].content.parts[0].text;
    let cleanedResponseText = ""; 

    try {
        console.log("\n=== สิ่งที่ AI ตอบกลับมาดิบๆ ===");
        console.log(rawResponseText);

        cleanedResponseText = rawResponseText
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "") 
            .trim(); 
        
        const jsonResponse = JSON.parse(cleanedResponseText);
        return NextResponse.json(jsonResponse); 

    } catch (e) {
        console.error("Parse Error JSON:", cleanedResponseText);
        throw new Error("AI did not return valid JSON.");
    }

  } catch (error) {
    console.error("Error in /api/chat:", error.message);
    return NextResponse.json({ error: "ระบบขัดข้อง AI Barista ขออภัยด้วยค่ะ" }, { status: 500 });
  }
}