"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

import { supabase } from '../lib/supabaseClient'; 
import Image from 'next/image';


import RecommendedMenuCard from '../../component/RecommendedMenuCard'; 
import { v4 as uuidv4 } from 'uuid'; 

export default function ChatPage() {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('สวัสดีค่ะ ให้ AI Barista แนะนำเมนูอะไรดีคะ?');
    const [isLoading, setIsLoading] = useState(false);
    const [recommendedMenus, setRecommendedMenus] = useState([]);
    const [allMenuItems, setAllMenuItems] = useState([]);
    const [allOptions, setAllOptions] = useState({});
    
   
    const [cartItems, setCartItems] = useState(() => {
        if (typeof window === 'undefined') {
            return []; 
        }
        try {
            const savedCart = JSON.parse(localStorage.getItem('myCafeCart') || '[]');
            return savedCart;
        } catch (error) {
            console.error("ChatPage: Could not load cart in useState", error);
            return [];
        }
    });

    const [totalPrice, setTotalPrice] = useState(0);
    const [isListening, setIsListening] = useState(false); 
    
  
    const isInitialMount = useRef(true); 

    const [isContinuousListening, setIsContinuousListening] = useState(false);
    const recognitionRef = useRef(null);
    const [chatHistory, setChatHistory] = useState([]);

    const [isReady, setIsReady] = useState(false);
    const loadStatusRef = useRef({ menus: false, options: false });

    
    useEffect(() => {
        const checkReadyState = () => {
            if (loadStatusRef.current.menus && loadStatusRef.current.options) {
                setIsReady(true);
            }
        };

        const fetchAllMenus = async () => { 
            try {
                const { data: menuItems, error } = await supabase.from('menuItems').select('*');
                if (error) throw error; if (!menuItems) throw new Error("No data");
                const getFolderName = (cat) => { /* Function to get folder name */ 
                    switch(cat){ case 'Coffee': case 'Tea': case 'Milk': case 'Refreshers': return 'Drink'; case 'Bakery': case 'Cake': case 'Dessert': return 'Bakery'; case 'Other': return 'orther'; default: return cat;} };
                const itemsWithImages = menuItems.map(item => {
                    if (item.menuImage && item.menuCategory) {
                        const folderName = getFolderName(item.menuCategory);
                        const imagePath = `${folderName}/${item.menuImage}`;
                        const { data: imageData } = supabase.storage.from('menu-images').getPublicUrl(imagePath);
                        return { ...item, publicImageUrl: imageData?.publicUrl };
                    } return item; });
                setAllMenuItems(itemsWithImages);
                loadStatusRef.current.menus = true;
                checkReadyState();
            } catch (error) { console.error("ChatPage: Error fetching menus:", error.message); setAllMenuItems([]); }
        };

        const fetchAllOptions = async () => {
            try {
                const { data: optionsData, error } = await supabase.from('option').select(`optionName, priceAdjustment, optionGroups ( nameGroup ) `); 
                if (error) throw error;
                if (!optionsData) throw new Error("No options data returned");
                const grouped = optionsData.reduce((acc, opt) => {
                    if (!opt.optionGroups || !opt.optionGroups.nameGroup) { return acc; }
                    const group = opt.optionGroups.nameGroup; 
                    if (!acc[group]) acc[group] = [];
                    acc[group].push({ optionName: opt.optionName, priceAdjustment: opt.priceAdjustment ?? 0 });
                    return acc;
                }, {}); 
                setAllOptions(grouped);
                loadStatusRef.current.options = true;
                checkReadyState();
            } catch (error) {
                console.error("ChatPage: Error fetching options:", error.message);
                setAllOptions({});
            }
        };
        
        fetchAllMenus();
        fetchAllOptions(); 
        
        isInitialMount.current = false;
    }, []); 

   
    useEffect(() => {
        const currentCart = Array.isArray(cartItems) ? cartItems : [];
        const newTotal = currentCart.reduce((sum, item) => {
            const priceToUse = item.finalPrice ?? item.menuPrice ?? 0; 
            const quantity = item.quantity ?? 0;
            return sum + (priceToUse * quantity);
        }, 0);
        setTotalPrice(newTotal); 

        if (!isInitialMount.current) {
            try {
                if (currentCart.length > 0) { 
                    localStorage.setItem('myCafeCart', JSON.stringify(currentCart)); 
                } else { 
                    localStorage.removeItem('myCafeCart'); 
                }
                window.dispatchEvent(new Event('local-storage')); 
            } catch (error) { console.error("ChatPage: Failed to save cart", error); }
        }
    }, [cartItems]); 


    const speak = (text, onEndCallback = null) => {
        if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
            if (onEndCallback) onEndCallback();
            return;
        }
        window.speechSynthesis.cancel(); 
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'th-TH';
        utt.rate = 1.0;
        utt.onend = () => {
            if (onEndCallback) onEndCallback();
        };
        utt.onerror = (e) => {
            console.error("Speech synthesis error:", e);
            if (onEndCallback) onEndCallback();
        };
        let voices = window.speechSynthesis.getVoices();
        const setVoice = () => {
            voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.lang === 'th-TH' && v.name.includes('Kanya'));
            if (voice) utt.voice = voice;
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.speak(utt);
            } else if (onEndCallback) {
                onEndCallback(); 
            }
        };
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = setVoice;
        } else {
            setVoice(); 
        }
    };

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.onvoiceschanged = null;
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        };
    }, []); 

    const startListening = () => {
        console.log("STT: startListening() called...");

        if (typeof window === 'undefined') {
            stopContinuousListening(); return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            alert("Browser not supported");
            stopContinuousListening(); return;
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        const rec = new SR();
        recognitionRef.current = rec;
        rec.lang = 'th-TH';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false; 
        rec.onstart = () => {
            setIsListening(true); 
            setQuestion("กำลังฟัง...");
        };
        rec.onresult = (e) => {
            const text = e.results[0][0].transcript;
            console.log("STT: Heard:", text);
            setQuestion(text);
            setIsListening(false);
            if (recognitionRef.current) {
                recognitionRef.current.stop(); 
                recognitionRef.current = null;
            }
            handleSubmit(text, startListening);
        };
        rec.onend = () => {
            console.log("STT: Listener ended.");
            setIsListening(false);
            recognitionRef.current = null;
            if (isContinuousListening && !isLoading) { 
                 console.log("STT: Timeout or no speech, listening again.");
                 startListening();
            }
        };
        rec.onerror = (e) => {
            console.error("Speech error", e.error);
            setIsListening(false);
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            if (e.error === 'not-allowed') {
                alert("คุณต้องอนุญาตให้ใช้ไมโครโฟนก่อนค่ะ");
                stopContinuousListening(); 
            } else if (e.error === 'service-not-allowed') {
                 alert("Speech Recognition ใช้งานไม่ได้ อาจจะต้องรันบน HTTPS หรือ localhost เท่านั้นค่ะ");
                 stopContinuousListening(); 
            } else if (e.error !== 'aborted' && isContinuousListening) {
                console.log("STT: Error, listening again.");
                startListening();
            }
        };
        rec.start();
    };

    const stopContinuousListening = () => {
        console.log("Stopping continuous conversation.");
        setIsContinuousListening(false);
        setIsListening(false);
        setIsLoading(false); 
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel(); 
        }
        setQuestion('');
        setAnswer('สวัสดีค่ะ ให้ AI Barista แนะนำเมนูอะไรดีคะ?'); 
        setChatHistory([]);
    };

    const toggleContinuousListen = () => {
        if (isContinuousListening) {
            stopContinuousListening();
        } else {
            if (isLoading) return; 
            setIsContinuousListening(true);
            setAnswer("สวัสดีค่ะ พูดคุยได้เลย...");
            setChatHistory([]);
            startListening();
        }
    };
    



    const _updateCart = (itemToAddFromCard) => {

        setCartItems(prevItems => {
            const currentCart = Array.isArray(prevItems) ? prevItems : [];
            if (!itemToAddFromCard?.menuId) { 
                console.error("ChatPage: Invalid item data received from card:", itemToAddFromCard); 
                return currentCart; 
            }
            const itemOptionsList = itemToAddFromCard.customizations?.selectedOptions || itemToAddFromCard.suggestedOptions || [];
            
            const newItemFingerprint = JSON.stringify(itemOptionsList.map(opt => ({
                groupName: opt.groupName,
                optionName: opt.optionName
            })).sort((a, b) => a.groupName.localeCompare(b.groupName))); 
            
            const newItemSpecialInstructions = itemToAddFromCard.specialInstructions || "";

            const existingItemIndex = currentCart.findIndex(item => {
                const existingItemOptions = item.customizations?.selectedOptions || [];
                const existingItemFingerprint = JSON.stringify(existingItemOptions.map(opt => ({
                    groupName: opt.groupName,
                    optionName: opt.optionName
                })).sort((a, b) => a.groupName.localeCompare(b.groupName)));
                const existingItemSpecialInstructions = item.specialInstructions || "";

                return item.menuId === itemToAddFromCard.menuId && 
                       existingItemFingerprint === newItemFingerprint &&
                       existingItemSpecialInstructions === newItemSpecialInstructions;
            });

            if (existingItemIndex > -1) {
                const updatedItems = [...currentCart];
                const existingItem = updatedItems[existingItemIndex];
                updatedItems[existingItemIndex] = {
                    ...existingItem,
                    quantity: (existingItem.quantity || 1) + (itemToAddFromCard.quantity || 1),
                };
                return updatedItems;
            } else {
                const fullMenuItem = allMenuItems.find(m => String(m.menuId) === String(itemToAddFromCard.menuId));
                const basePrice = fullMenuItem?.menuPrice || 0;
                
                const optionsPrice = itemOptionsList.reduce((sum, opt) => {
                    const group = allOptions[opt.groupName] || [];
                    const optionData = group.find(o => o.optionName === opt.optionName);
                    return sum + (optionData?.priceAdjustment || 0);
                }, 0);

                const finalPrice = basePrice + optionsPrice;

                const newItem = { 
                    cartItemId: uuidv4(),
                    menuId: itemToAddFromCard.menuId,
                    menuName: itemToAddFromCard.menuName || fullMenuItem?.menuName,
                    menuPrice: basePrice,
                    finalPrice: finalPrice, 
                    quantity: itemToAddFromCard.quantity || 1,
                    specialInstructions: newItemSpecialInstructions,
                    customizations: {
                        selectedOptions: itemOptionsList.map(opt => {
                            const group = allOptions[opt.groupName] || [];
                            const optionData = group.find(o => o.optionName === opt.optionName);
                            return {
                                groupName: opt.groupName,
                                optionName: opt.optionName,
                                priceAdjustment: optionData?.priceAdjustment || 0
                            };
                        })
                    },
                    publicImageUrl: fullMenuItem?.publicImageUrl || null
                };
                
                const updatedItems = [...currentCart, newItem];
                return updatedItems; 
            }
        });
    };
    
    
    const _handleModifyItems = (itemsToModify) => { 
        if (!itemsToModify || itemsToModify.length === 0) return;
        console.log("AI requested to MODIFY items (not implemented):", itemsToModify);
    };
    const _handleDeleteItems = (itemsToDelete) => {
        if (!itemsToDelete || itemsToDelete.length === 0) return;
        console.log("AI requested to DELETE items:", itemsToDelete);
        
        setCartItems(prevItems => {
            let items = [...prevItems];
            itemsToDelete.forEach(itemInfo => {
                if (itemInfo.cartItemId) {
                    items = items.filter(i => i.cartItemId !== itemInfo.cartItemId);
                } else if (itemInfo.menuName) {
                 
                    const indexToRemove = items.findIndex(i => i.menuName === itemInfo.menuName);
                    if (indexToRemove > -1) {
                        items.splice(indexToRemove, 1);
                    }
                }
            });
            return items;
        });
    };
   
    const _handleRemoveItemFromCart = (cartItemIdToRemove, itemName, quantity) => {
        if (!cartItemIdToRemove) return;
        
        setCartItems(prevItems => {
            return prevItems.filter(item => item.cartItemId !== cartItemIdToRemove);
        });
    };

    
   
    const handleSubmit = async (textFromSpeech = null, onEndCallback = null) => { 
        
        const currentQuestion = textFromSpeech || question; 
        if (!currentQuestion.trim() || currentQuestion === "กำลังฟัง...") {
            if (onEndCallback) onEndCallback();
            return;
        }
        if (!isReady) {
            setAnswer("ขอโทษค่ะ Barista กำลังเตรียมเมนูสักครู่... (รอโหลดเมนู)");
            return;
        }
        setIsLoading(true); 
        setAnswer("กำลังคิด..."); 
        setRecommendedMenus([]);
        const updatedHistory = [ ...chatHistory, { role: "user", parts: [{ text: currentQuestion }] } ];
        let menuContext = "Menu:\n"; 
        allMenuItems.forEach(item => { menuContext += `- ID: ${item.menuId}, Name: ${item.menuName}, Price: ${item.menuPrice}\n`; }); 
        let optionsContext = "Available Customizations:\n";
        for (const groupName in allOptions) {
            optionsContext += `* ${groupName}:\n`;
            allOptions[groupName].forEach(opt => {
                const priceInfo = (opt.priceAdjustment ?? 0) > 0 ? `+${opt.priceAdjustment}B` : 'default';
                optionsContext += `  - ${opt.optionName} (${priceInfo})\n`;
            });
        }
        
      
        const cartContext = JSON.stringify(cartItems);

        let finalAnswerText = ''; 
        let aiResponseData = null;
        try {
            const res = await fetch('/api/chat', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    question: currentQuestion,
                    menuContext, 
                    optionsContext,
                    chatHistory: chatHistory,
                    cartContext: cartContext 
                }) 
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `API Error (${res.status})`); 
            aiResponseData = data; 
            if (!aiResponseData.text) { throw new Error("AI response missing 'text' field"); }
            finalAnswerText = aiResponseData.text; 
            setAnswer(finalAnswerText); 
            let recs = []; 
            if (Array.isArray(aiResponseData.recommendations)) { 
                recs = aiResponseData.recommendations.map(m => { 
                    const id = m?.menuId ?? m?.item_id; 
                    if (id == null) return null; 
                    const fullMenuItem = allMenuItems.find(i => String(i.menuId) === String(id)); 
                    if (!fullMenuItem) {
                        console.warn("AI recommended an unknown menuId:", id);
                        return null; 
                    }
                    const suggestedOptions = m.suggestedOptions || [];
                    const quantity = m.quantity || 1; 
                    return { ...fullMenuItem, suggestedOptions: suggestedOptions, quantity: quantity };
                }).filter(Boolean); 
            } 
            setRecommendedMenus(recs); 
            if (Array.isArray(aiResponseData.itemsToAutoAdd) && aiResponseData.itemsToAutoAdd.length > 0) {
                aiResponseData.itemsToAutoAdd.forEach(item => {
                    const fullMenuItem = allMenuItems.find(m => String(m.menuId) === String(item.menuId));
                    if (fullMenuItem) {
                         _updateCart({ ...fullMenuItem, ...item });
                    } else {
                        console.warn("AI tried to auto-add unknown menuId:", item.menuId);
                    }
                });
            }
            _handleModifyItems(aiResponseData.itemsToModify);
            _handleDeleteItems(aiResponseData.itemsToDelete);
        } catch (error) { 
            console.error("ChatPage Submit Error:", error); 
            finalAnswerText = `เกิดข้อผิดพลาด: ${error.message}`; 
            setAnswer(finalAnswerText); 
            setRecommendedMenus([]);
        } finally { 
            setIsLoading(false); 
            setChatHistory([ ...updatedHistory, { role: "model", parts: [{ text: finalAnswerText }] } ]);
            if (onEndCallback) { speak(finalAnswerText, onEndCallback); } 
            else if (textFromSpeech) { setQuestion(''); speak(finalAnswerText); }
            if (!textFromSpeech && !onSpeakEndCallback) { setQuestion(''); }
        }
    };

    
    return (
        <div className="bg-white min-h-screen"> 
            
          
            
            <div className="container mx-auto p-4 sm:p-8 max-w-5xl">
                
               
                 <div className="text-center mb-8">
                     <h1 className="text-[#4A3728] font-bold text-3xl tracking-tight">Barista</h1>
                     <p className="text-[#4A3728] font-bold">Ready to recommend for you</p>
                 </div>
                 <div className="bg-[#4A3728] p-6 rounded-xl mb-8 border-l-4 border-green-700">
                     <h2 className="text-2xl font-bold text-white mb-2">Today&apos;s Special</h2>
                     <p className="text-white mb-4">&quot;Iced Oat Milk Hazelnut Latte&quot; ความหอมหวานลงตัว</p>
                     <button onClick={() => setQuestion("ขอลอง Iced Oat Milk Hazelnut Latte")} disabled={!isReady} className="bg-[#2c8160] hover:bg-green-900 text-white font-bold py-2 px-5 rounded-full text-sm disabled:bg-gray-400 disabled:cursor-not-allowed">
                        Ask about this menu
                    </button>
                 </div>
                 <div className="bg-[#4A3728] p-6 rounded-xl shadow-lg mb-8"> 
                     <label htmlFor="question" className="block text-white font-bold mb-6">What can I get for you?</label>
                     <textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} className="w-full px-4 py-3 bg-white/10 text-white border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition placeholder-gray-400 disabled:cursor-not-allowed disabled:bg-white/5" rows="3" placeholder={!isReady ? "กำลังโหลดเมนู... กรุณารอสักครู่" : "เช่น กาแฟไม่เปรี้ยว, ชาผลไม้, หรือ 'ลบเค้กออก'..."} disabled={isLoading || isListening || isContinuousListening || !isReady} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isListening && !isContinuousListening && isReady) { e.preventDefault(); handleSubmit(null, null); } }} />
                     <div className="mt-3 flex flex-wrap gap-2"> 
                         <button onClick={() => setQuestion("New Menu?")} disabled={!isReady} className="text-xs bg-white/20 hover:bg-white/30 text-white py-1 px-3 rounded-full transition disabled:bg-gray-400 disabled:cursor-not-allowed">New Menu?</button>
                         <button onClick={() => setQuestion("Something sweet")} disabled={!isReady} className="text-xs bg-white/20 hover:bg-white/30 text-white py-1 px-3 rounded-full transition disabled:bg-gray-400 disabled:cursor-not-allowed">Something sweet</button>
                     </div>
                     <div className="mt-4 flex items-center gap-3">
                         <button onClick={() => handleSubmit(null, null)} disabled={isLoading || !question.trim() || isListening || isContinuousListening || question === "กำลังฟัง..." || !isReady} className="w-full bg-[#2c8160] hover:bg-green-900 text-white font-bold py-3 px-8 rounded-full transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"> 
                            {!isReady ? 'Loading Menu...' : isLoading ? 'Thinking...' : ' Ask Barista'} 
                        </button>
                         <button onClick={toggleContinuousListen} disabled={(isLoading && !isContinuousListening) || !isReady} className={`p-3 rounded-full transition-colors ${ isContinuousListening ? 'bg-red-600 animate-pulse' : 'bg-white/20 hover:bg-white/30' } disabled:bg-gray-400 disabled:cursor-not-allowed`} title={isContinuousListening ? "หยุดคุย" : "เริ่มคุยด้วยเสียง"}> 
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 11-14 0m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> 
                        </button>
                     </div>
                 </div>


                {/* Recommendation Section */}
                <div className="bg-[#4A3728] p-6 rounded-xl shadow-lg min-h-[100px] mb-8">
                    
                     <div className="flex items-start space-x-4"> 
                         <div className="bg-[#2c8160] rounded-full p-2 flex-shrink-0"> <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2V7a2 2 0 012-2h2.5a1 1 0 01.7.3l2.4 2.4a1 1 0 01.3.7V8z" /></svg> </div>
                         <div className="w-full"> 
                            <h2 className="text-xl font-bold text-white mb-2">Suggestion:</h2> 
                            {answer && <div className="text-white whitespace-pre-wrap prose prose-invert max-w-none">{answer}</div>}
                        </div>
                     </div>
                    
                    {Array.isArray(recommendedMenus) && recommendedMenus.length > 0 && (
                        <div className="mt-6 border-t border-white/20 pt-6">
                            <div className="space-y-4">
                                {recommendedMenus.map((menu) => (
                                    <RecommendedMenuCard 
                                        key={`${menu.menuId}-${JSON.stringify(menu.suggestedOptions)}`}
                                        menu={menu}
                                        initialOptions={menu.suggestedOptions || []} 
                                        initialQuantity={menu.quantity || 1} 
                                        onAddToCart={_updateCart} 
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart Summary Section */}
                <div className="bg-[#F0EBE3] p-6 rounded-xl shadow-lg sticky top-4 z-10">
                    
                    
                    <h2 className="text-2xl font-bold text-[#4A3728] mb-4">Your Order</h2>
                    <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
                        {Array.isArray(cartItems) && cartItems.length > 0 ? (
                            cartItems.map((item) => {
                                const priceToDisplay = item.finalPrice ?? item.menuPrice ?? 0;
                                const itemTotal = priceToDisplay * (item.quantity ?? 0);
                                return (
                                    <div key={item.cartItemId} className="flex justify-between items-center text-[#4A3728] py-1"> 
                                        <div className="font-medium text-sm flex-grow mr-2"> 
                                            {item.menuName} x {item.quantity}
                                            {item.customizations?.selectedOptions?.map(opt => (
                                                <p key={opt.optionId || opt.optionName} className="text-xs text-gray-600 ml-2">
                                                    - {opt.groupName}: {opt.optionName} {opt.priceAdjustment > 0 ? `(+${opt.priceAdjustment.toFixed(2)}฿)` : ''}
                                                </p>
                                            ))}
                                             {item.specialInstructions && (
                                                 <p className="text-xs text-blue-600 ml-2 mt-1"> 
                                                     Note: <span className="italic">{item.specialInstructions}</span>
                                                 </p>
                                             )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <p className="font-bold whitespace-nowrap w-[70px] text-right"> {itemTotal.toFixed(2)} ฿</p>
                                            
                                           
                                            <button
                                                onClick={() => _handleRemoveItemFromCart(item.cartItemId, item.menuName, item.quantity)}
                                                className="text-red-500 hover:text-red-700 font-bold text-xs w-5 h-5 rounded-full bg-red-100 flex items-center justify-center transition-colors"
                                                title="Remove item"
                                                aria-label={`Remove ${item.menuName} from cart`}
                                            >
                                                &times; 
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-center">Your cart is empty</p>
                        )}
                    </div>
                    {/* Total and Checkout */}
                    <div className="border-t-2 border-[#4A3728] pt-4 flex justify-between items-center">
                        <span className="text-xl font-bold text-[#4A3728]">Total:</span>
                        <span className="text-2xl font-extrabold text-[#4A3728]">{totalPrice.toFixed(2)} ฿</span> 
                    </div>
                    <Link href="/basket">
                        <button disabled={!cartItems || cartItems.length === 0} className="mt-5 w-full bg-[#2c8160] hover:bg-opacity-90 text-white font-bold py-3 px-8 rounded-full transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                            View Cart ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
                        </button>
                    </Link>
                </div>
            </div>

        </div>
    );
}