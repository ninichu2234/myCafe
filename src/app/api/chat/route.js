import { NextResponse } from 'next/server';

const MODEL_NAME = 'gemini-2.5-pro'; 
const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    const { question, menuContext, optionsContext, chatHistory, cartItems } = await request.json();

    if (!API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in .env.local file");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
    
    const myOwnContent = "Our cafe opens between 8am - 6pm on weekdays, and 10am - 9pm on weekends.";

    let cartContext = "No items in cart.";
    if (cartItems && cartItems.length > 0) {
      cartContext = "Current Cart Items:\n";
      cartItems.forEach(item => {
        cartContext += `- cartItemId: ${item.cartItemId}, Name: ${item.menuName}, Qty: ${item.quantity}\n`;
        if (item.customizations?.selectedOptions?.length > 0) {
          cartContext += `  Options: ${item.customizations.selectedOptions.map(opt => `${opt.groupName}: ${opt.optionName}`).join(', ')}\n`;
        }
      });
    }

    
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
          "itemsToAutoAdd": [
            {
              "menuId": "ID",
              "menuName": "Name",
              "quantity": 1,
              "suggestedOptions": [ { "groupName": "Group", "optionName": "Option" } ]
            }
          ],
          "itemsToModify": [
            {
              "cartItemId": "uuid-of-item-in-cart",
              "newOptions": [ { "groupName": "Group", "optionName": "Option" } ],
              "newQuantity": 1 
            }
          ],
          "itemsToDelete": [
            { "cartItemId": "uuid-of-item-in-cart" }
          ]
        }

        **--- CRITICAL RULES ---**

        1.  **READ ALL CONTEXT:** You must read Chat History, Menu Context, Options Context, and **Cart Context**.
        2.  **QUANTITY IN RECOMMENDATIONS:** If the user specifies a quantity (e.g., "ขอชาไทย 3 แก้ว"), you MUST include the \`quantity\` field in the \`recommendations\` object.
        3.  **MODIFY ITEMS (itemsToModify):** Use this to *change* an item in the cart. Find the correct \`cartItemId\`.
        4.  **DELETE ITEMS (itemsToDelete):** Use this to *remove* an item. Find the correct \`cartItemId\`.
        5.  **ADD ITEMS (itemsToAutoAdd):** Use this *only* for **new** items the user *confirms*. The key MUST be \`suggestedOptions\`.
        6.  **ASK IF AMBIGUOUS:** If the request is unclear, ask for clarification in the \`text\` response.
        7.  **MATCH EXACTLY:** All \`groupName\`, \`optionName\`, \`menuId\` must match the contexts *perfectly*.
        8.  **NO WHITESPACE:** Do NOT add any leading/trailing whitespace or control characters inside string values.
        
        9.  **[NEW] SELF-CORRECTION (Rule 9):**
            * Before you output the final JSON, you **MUST** verify it.
            * If your "text" response *says* you are adding/modifying **3 items** (e.g., "ได้ค่ะ เพิ่ม 3 แก้ว 100%, 50%, 25%"), the \`itemsToAutoAdd\` or \`itemsToModify\` arrays **MUST** contain *exactly* **3 objects**.
            * Do NOT forget items. If the user lists "100%", "50%", and "25%", all three *must* be in the JSON array.
            * **This is a critical failure if you miss one. Double-check your work.**

        **--- Provided Information ---**
        
        **General Info:** ${myOwnContent}
        **Menu Context:** ${menuContext || 'No menu context provided.'}
        **Options Context:** ${optionsContext || 'No customization options available.'}
        **Cart Context:** ${cartContext} 
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
      systemInstruction: {
          parts: [{ text: systemPrompt }]
      },
      generationConfig: {
          responseMimeType: "application/json",
      },
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Gemini API Error (${response.status}): ${response.status}. Body: ${errorBody}`);
      throw new Error(`Gemini API returned status: ${response.status}. Body: ${errorBody}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
      throw new Error("Invalid response structure from Gemini API");
    }
    
    const rawResponseText = data.candidates[0].content.parts[0].text;
    z
    try {
        const cleanedResponseText = rawResponseText
            .replace(/[\x00-\x1F\x7F-\x9F]/g, "") 
            .trim(); 
        
        const jsonResponse = JSON.parse(cleanedResponseText);
        return NextResponse.json(jsonResponse); 

    } catch (e) {
        console.error("Failed to parse CLEANED AI JSON response:", cleanedResponseText);
        console.error("Original (RAW) AI response:", rawResponseText);
        throw new Error("AI did not return valid JSON even after cleaning.");
    }

  } catch (error) {
    console.error("Error in /api/chat:", error.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}