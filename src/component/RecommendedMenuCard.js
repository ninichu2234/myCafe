"use client";
import React, { useState, useEffect, useCallback } from 'react';
// [FIX PATH] แก้ไข Path ไปยัง supabaseClient ให้ถูกต้อง
import { supabase } from '../app/lib/supabaseClient'; 
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid'; 

export default function RecommendedMenuCard({ 
    menu, 
    initialOptions = [], 
    initialQuantity = 1, // รับ prop และกำหนดค่าเริ่มต้น
    onAddToCart 
}) {
    const [optionGroups, setOptionGroups] = useState([]);
    const [selections, setSelections] = useState({}); 
    const [isLoading, setIsLoading] = useState(true);
    const [currentPrice, setCurrentPrice] = useState(menu.menuPrice || 0);
    const [specialInstructions, setSpecialInstructions] = useState('');
    
    // ใช้ initialQuantity ในการตั้งค่า state เริ่มต้น
    const [quantity, setQuantity] = useState(initialQuantity);

    const addLog = useCallback((message, data = '') => {
        console.log(`[${menu.menuName}] ${message}`, data);
    }, [menu.menuName]);

    // --- (fetchOptions) ---
    const fetchOptions = useCallback(async (menuId) => {
        setIsLoading(true);
        setOptionGroups([]);
        setSelections({});
        setCurrentPrice(menu.menuPrice || 0); 
        
        addLog(`(1) Fetching options...`);
        try {
            const { data, error } = await supabase.from('menuItemOptionGroups').select(`groupId, optionGroups (groupId, nameGroup, selectionType, option ( optionId, optionName, priceAdjustment ))`).eq('menuId', menuId);
            if (error) throw error;
            const groups = data.map(item => item.optionGroups).filter(Boolean); 
            setOptionGroups(groups);
            addLog(`(2) Fetched ${groups.length} groups.`);

            const newSelections = {};
            addLog(`(3) Applying initial selections from AI:`, initialOptions);
            
            groups.forEach(group => {
                const groupName = group.nameGroup;
                const groupId = group.groupId;

                const aiSuggestion = initialOptions.find(opt => opt.groupName === groupName);
                let appliedAiSuggestion = false;

                if (aiSuggestion && aiSuggestion.optionName) {
                    const matchingOption = group.option.find(opt => opt.optionName === aiSuggestion.optionName);
                    if (matchingOption) {
                        newSelections[groupId] = String(matchingOption.optionId);
                        addLog(` -> Applied AI suggestion for '${groupName}': ${matchingOption.optionName}`);
                        appliedAiSuggestion = true;
                    } else {
                        addLog(` -> WARNING: AI suggested '${aiSuggestion.optionName}' for '${groupName}', but no matching optionId was found.`);
                    }
                }

                if (!appliedAiSuggestion) {
                    if (group.selectionType === 'single_required') { 
                        const defaultOption = group.option.find(opt => opt.optionName?.includes('100%')) || group.option.find(opt => opt.optionName?.includes('50%')) || group.option[0];
                        if (defaultOption) { newSelections[groupId] = String(defaultOption.optionId); }
                    } else if (group.selectionType === 'single_optional') { 
                         newSelections[groupId] = ''; // 'None'
                    } else if (group.selectionType === 'multiple_optional') {
                         newSelections[groupId] = []; 
                    }
                }
            });

            const aiNotes = initialOptions.find(opt => opt.groupName === 'Notes');
            if (aiNotes && aiNotes.optionName) {
                setSpecialInstructions(aiNotes.optionName);
            } else {
                setSpecialInstructions('');
            }

            setSelections(newSelections); 

        } catch (err) { addLog(`(!) ERROR fetching options: ${err.message}`);
        } finally { setIsLoading(false); addLog(`(4) Finished fetching.`); }
    }, [menu.menuId, menu.menuPrice, initialOptions, addLog]); 

    // อัปเดต useEffect ให้รีเซ็ต quantity เมื่อ prop เปลี่ยน
    useEffect(() => {
        if (menu.menuId) { 
            fetchOptions(menu.menuId); 
        }
        setCurrentPrice(menu.menuPrice || 0); 
        
        // รีเซ็ต quantity เสมอเมื่อ prop (initialQuantity) เปลี่ยน
        setQuantity(initialQuantity); 

    }, [menu.menuId, menu.menuPrice, fetchOptions, initialQuantity]); 

    // (useEffect คำนวณราคา - ไม่เปลี่ยนแปลง)
    useEffect(() => {
        if (!isLoading && optionGroups && optionGroups.length >= 0) { 
            let priceAdjustmentTotal = 0;
            const basePrice = menu.menuPrice || 0;
            Object.entries(selections).forEach(([groupId, selectedOptionId]) => {
                 const currentSelectedOptionId = String(selectedOptionId); 
                 const group = optionGroups.find(g => String(g.groupId) === String(groupId)); 
                 if (group && currentSelectedOptionId && currentSelectedOptionId !== '') { 
                    const option = group.option.find(o => String(o.optionId) === currentSelectedOptionId); 
                    if (option) {
                        const adjustment = typeof option.priceAdjustment === 'number' ? option.priceAdjustment : 0;
                        priceAdjustmentTotal += adjustment;
                    } 
                } 
            });
            const newPrice = basePrice + priceAdjustmentTotal;
            if (newPrice !== currentPrice) { setCurrentPrice(newPrice); }
        } 
    }, [selections, optionGroups, menu.menuPrice, isLoading, currentPrice]); 

    // --- (Handlers) ---
    const handleSelectionChange = (groupId, optionId) => {
        addLog(`(!) Selection changed: Group ${groupId} -> Option ${optionId}`);
        setSelections(prev => ({ ...prev, [groupId]: optionId }));
    };

    const handleDecrease = () => {
        setQuantity(prev => Math.max(1, prev - 1)); // ไม่ให้น้อยกว่า 1
    };
    const handleIncrease = () => {
        setQuantity(prev => prev + 1);
    };

    const handleAddClick = () => {
        addLog(`(+) Add clicked. Qty: ${quantity}. Price: ${currentPrice}.`);
        const allSelectedOptions = [];
        let priceAdjustmentTotal = 0; 

        Object.entries(selections).forEach(([groupId, selectedOptionId]) => {
            if (selectedOptionId && selectedOptionId !== '') { 
                const group = optionGroups.find(g => String(g.groupId) === String(groupId));
                if (group) {
                    const option = group.option.find(o => String(o.optionId) === String(selectedOptionId));
                    if (option) {
                        allSelectedOptions.push({
                            optionId: option.optionId, optionName: option.optionName,
                            groupName: group.nameGroup, priceAdjustment: option.priceAdjustment || 0
                        });
                        priceAdjustmentTotal += (option.priceAdjustment || 0);
                    }
                }
            }
        });
        const customizations = { selectedOptions: allSelectedOptions, priceAdjustment: priceAdjustmentTotal };
        
        const itemToCart = { 
            ...menu, 
            cartItemId: uuidv4(), 
            quantity: quantity, // ใช้ state quantity
            finalPrice: currentPrice, 
            customizations: customizations,
            specialInstructions: specialInstructions.trim() || null,
            initialOptions: undefined 
        };
        delete itemToCart.suggestedOptions; 
        
        onAddToCart(itemToCart); 
    };

    // --- (UI) ---
    return (
        <div className="bg-white/10 p-4 rounded-lg border border-white/20 flex flex-col transition hover:shadow-md hover:border-green-500">
            
            {/* (แถวบน: ข้อมูลเมนู) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-4">
                 <div className="flex items-center mb-3 sm:mb-0">
                    <div className="w-20 h-20 rounded-lg overflow-hidden mr-4 flex-shrink-0 bg-gray-700">
                        <Image src={menu.publicImageUrl || 'https://placehold.co/100x100/FFF/333?text=No+Image'} alt={menu.menuName || 'Menu Image'} width={80} height={80} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-white text-lg">{menu.menuName || 'Unknown Menu'}</p>
                        <p className="text-sm text-gray-300">Base: {typeof menu.menuPrice === 'number' ? `${menu.menuPrice.toFixed(2)} บาท` : 'N/A'}</p>
                    </div>
                </div>
            </div>
            
            {/* (ส่วน Dropdowns) */}
            {!isLoading && optionGroups.length > 0 && (
                <div className="mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                        {optionGroups.map(group => (
                            <div key={group.groupId} className="flex flex-col space-y-1">
                                <label 
                                    htmlFor={`select-${menu.menuId}-${group.groupId}`} 
                                    className="text-xs text-gray-300 flex-shrink-0"
                                >
                                    {group.nameGroup}:
                                </label>
                                <select
                                    id={`select-${menu.menuId}-${group.groupId}`}
                                    value={selections[group.groupId] || ''} 
                                    onChange={(e) => handleSelectionChange(group.groupId, e.target.value)}
                                    className="bg-white/20 text-white text-xs rounded p-2 border border-white/30 focus:outline-none focus:ring-1 focus:ring-green-500 w-full"
                                >
                                    {group.selectionType === 'single_optional' && (<option value="" className="text-black">None</option>)}
                                    {group.option.map(opt => (<option key={opt.optionId} value={String(opt.optionId)} className="text-black">{opt.optionName} {opt.priceAdjustment > 0 ? `(+${opt.priceAdjustment.toFixed(2)}฿)` : ''}</option>))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isLoading && (<div className="mb-4"><p className="text-xs text-gray-400">Loading options...</p></div>)}

            {/* (Textarea - Notes) */}
            <div className="mb-4">
                <label htmlFor={`instructions-${menu.menuId}`} className="block text-xs text-gray-300 mb-1">Notes:</label>
                <textarea
                    id={`instructions-${menu.menuId}`}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows="2"
                    placeholder="e.g., less ice, separate syrup..."
                    className="w-full bg-white/10 text-white text-xs rounded p-2 border border-white/30 focus:outline-none focus:ring-1 focus:ring-green-500 placeholder-gray-400"
                />
            </div>

            {/* (แถวล่าง: ราคา & ปุ่ม Add) */}
            <div className="border-t border-white/10 mt-auto pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                
                <p className="text-lg font-bold text-white text-left sm:text-left mb-2 sm:mb-0">
                    Total: {currentPrice.toFixed(2)} บาท
                </p>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2">
                        <button 
                            type="button" 
                            onClick={handleDecrease} 
                            className="bg-white/20 text-white font-bold rounded-full w-7 h-7 flex items-center justify-center transition hover:bg-white/30"
                            aria-label="Decrease quantity"
                        >
                            -
                        </button>
                        <span className="text-white font-bold w-5 text-center" aria-live="polite">
                            {quantity}
                        </span>
                        <button 
                            type="button" 
                            onClick={handleIncrease} 
                            className="bg-white/20 text-white font-bold rounded-full w-7 h-7 flex items-center justify-center transition hover:bg-white/30"
                            aria-label="Increase quantity"
                        >
                            +
                        </button>
                    </div>
                    
                    {/* Add Button */}
                    <div className="flex-shrink-0 flex-grow sm:flex-grow-0">
                        <button 
                            onClick={handleAddClick} 
                            disabled={!menu.menuId || isLoading} 
                            className="w-full bg-[#2c8160] hover:bg-green-900 text-white font-bold py-2 px-5 rounded-full transition-colors duration-300 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Add 
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}