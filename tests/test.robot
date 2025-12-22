*** Settings ***
Library           SeleniumLibrary
Test Setup        Open Browser To Menu Page
Test Teardown     Close Browser

*** Variables ***
${URL_MENU}       http://localhost:3001/menu-page
${BROWSER}        chrome

# --- 📝 รายชื่อเมนู (Basic) ---
${ITEM_COFFEE}       Americano
${ITEM_TEA}          Green Tea
${ITEM_MILK}         Milk
${ITEM_REFRESHER}    Soda
${ITEM_BAKERY}       Croissant
${ITEM_DESSERT}      Cheesecake
${ITEM_OTHER}        Drinking Water

# --- 📝 รายชื่อเมนู (Custom Option Test) ---
${ITEM_LATTE}        Latte
${ITEM_ESPRESSO}     Espresso

*** Test Cases ***

# ====================================================
# PART 1: BASIC NAVIGATION & ADD TO CART (Original)
# ====================================================

# --- หมวด COFFEE ---
TC-01: Verify search in 'Coffee' category
    Search And Verify Item In Category    ${ITEM_COFFEE}    Coffee
TC-02: Verify User click in 'Coffee' category with side menu
    Click Side Menu And Verify Header     Coffee
TC-03: User can click add coffee menu
    Select Item And Add To Cart           ${ITEM_COFFEE}

# --- หมวด TEA ---
TC-04: Verify search in 'Tea' category
    Search And Verify Item In Category    ${ITEM_TEA}    Tea
TC-05: Verify User click in 'Tea' category with side menu
    Click Side Menu And Verify Header     Tea
TC-06: User can click add menu in 'Tea' category
    Select Item And Add To Cart           ${ITEM_TEA}

# --- หมวด MILK ---
TC-07: Verify search in 'Milk' category
    Search And Verify Item In Category    ${ITEM_MILK}    Milk
TC-08: Verify User click in 'Milk' category with side menu
    Click Side Menu And Verify Header     Milk
TC-09: User can click add menu in 'Milk' category
    Select Item And Add To Cart           ${ITEM_MILK}

# --- หมวด DESSERT (เน้นเรื่อง Flow หน้า Basket) ---
TC-19: Verify search in 'Dessert' category
    Search And Verify Item In Category    ${ITEM_DESSERT}    Dessert
TC-20: Verify User click in 'Dessert' category with side menu
    Click Side Menu And Verify Header     Dessert
TC-21: User can click add menu in 'Dessert' and go to Basket
    Select Item And Add To Cart           ${ITEM_DESSERT}

# --- หมวด OTHER (เน้นเรื่อง Flow หน้า Basket) ---
TC-22: Verify search in 'Other' category
    Search And Verify Item In Category    ${ITEM_OTHER}    Other
TC-23: Verify User click in 'Other' category with side menu
    Click Side Menu And Verify Header     Other
TC-24: User can click add menu in 'Other' and go to Basket
    Select Item And Add To Cart           ${ITEM_OTHER}


# ====================================================
# PART 2: ADVANCED CUSTOMIZATION (New Requirements)
# เลือกความหวาน, Extra Shot, Syrup -> เช็คหน้า Basket
# ====================================================

TC-25: Order Americano with 0% Sweetness
    [Documentation]    สั่งกาแฟแบบไม่หวานเลย แล้วเช็คในตะกร้า
    # 1. เข้าหน้า Detail
    Select Item To Detail Page    ${ITEM_COFFEE}
    
    # 2. เลือก Option (สมมติว่าในหน้าเว็บมีปุ่มเขียนว่า '0% Sweetness')
    Select Custom Option          None sweet (0%)
    
    # 3. กด Add
    Click Add To Cart Button
    
    # 4. เช็คในตะกร้า
    Verify Item In Basket With Option    ${ITEM_COFFEE}    None sweet (0%)

TC-26: Order Latte with Extra Shot and Vanilla Syrup
    [Documentation]    สั่งลาเต้ เพิ่มช็อต และ ไซรัป (หลาย Option)
    # 1. เข้าหน้า Detail
    Select Item To Detail Page    ${ITEM_LATTE}
    
    # 2. เลือกหลาย Option
    Select Custom Option          Extra Shot
    Select Custom Option          Vanilla Syrup
    
    # 3. กด Add
    Click Add To Cart Button
    
    # 4. เช็คในตะกร้า (ต้องเจอทั้งคู่)
    Verify Item In Basket With Option    ${ITEM_LATTE}    Extra Shot
    Verify Item In Basket With Option    ${ITEM_LATTE}    Vanilla Syrup

TC-27: Order Espresso with 50% Sweetness
    [Documentation]    สั่ง Espresso หวานน้อย
    Select Item To Detail Page    ${ITEM_ESPRESSO}
    Select Custom Option          Less Sweet (50%)
    Click Add To Cart Button
    Verify Item In Basket With Option    ${ITEM_ESPRESSO}    Less Sweet (50%)


*** Keywords ***

# ==========================================
# 🛠️ SETUP & UTILS
# ==========================================

Open Browser To Menu Page
    Open Browser    ${URL_MENU}    ${BROWSER}
    Maximize Browser Window
    
    # 1. รอให้โครงสร้างเว็บโหลด (ช่องค้นหา)
    Wait Until Element Is Visible    xpath=//input[@placeholder='Search menu']    timeout=10s
    
    # 2. [จุดสำคัญ] รอให้สินค้าชิ้นแรก (h3 ตัวไหนก็ได้) ปรากฏขึ้นมาก่อน
    # เพื่อยืนยันว่า API ดึงข้อมูลสำเร็จแล้ว ไม่อย่างนั้น Robot จะรีบไปหาของแล้ว Error
    Wait Until Element Is Visible    xpath=//h3    timeout=10s

JS Click Element
    [Arguments]    ${xpath}
    [Documentation]    ท่าไม้ตาย: เลื่อนหา + กดด้วย JavaScript (ทะลุทุกสิ่งกีดขวาง)
    Wait Until Page Contains Element    ${xpath}    timeout=10s
    ${element}=    Get WebElement    ${xpath}
    # เลื่อนมากลางจอ
    Execute Javascript    arguments[0].scrollIntoView({block: "center"});    ARGUMENTS    ${element}
    Sleep    0.5s
    # สั่งกด
    Execute Javascript    arguments[0].click();    ARGUMENTS    ${element}

# ==========================================
# 🔍 SEARCH & CATEGORY
# ==========================================

Search And Verify Item In Category
    [Arguments]    ${item_name}    ${category_id}
    Input Text    xpath=//input[@placeholder='Search menu']    ${item_name}
    Sleep    1s
    Wait Until Element Is Visible    id=${category_id}    timeout=5s
    Element Should Be Visible    xpath=//section[@id='${category_id}']//h3[contains(text(), '${item_name}')]
    Clear Element Text    xpath=//input[@placeholder='Search menu']

Click Side Menu And Verify Header
    [Arguments]    ${category_name}
    ${menu_link}=    Set Variable    xpath=//aside//a[contains(text(), '${category_name}')]
    JS Click Element    ${menu_link}
    Wait Until Element Is Visible    xpath=//h2[contains(text(), '${category_name}')]    timeout=5s

# ==========================================
# 🛒 ADD TO CART (BASIC & ADVANCED)
# ==========================================

Select Item And Add To Cart
    [Arguments]    ${item_name}
    [Documentation]    แบบ Basic: กดเข้า -> กด Add -> จบที่ตะกร้า
    Select Item To Detail Page    ${item_name}
    Click Add To Cart Button

Select Item To Detail Page
    [Arguments]    ${item_name}
    [Documentation]    คลิกที่การ์ดสินค้าเพื่อเข้าหน้า Detail
    # ใช้ ancestor::a เพื่อให้คลิกโดนทั้งการ์ด ไม่ใช่แค่ตัวหนังสือ
    ${card_xpath}=    Set Variable    xpath=//h3[contains(., '${item_name}')]/ancestor::a
    JS Click Element    ${card_xpath}
    # รอจนกว่า URL หรือ Element หน้า Detail จะขึ้น
    Wait Until Location Contains    menuDetail    timeout=5s


Select Custom Option
    [Arguments]    ${partial_text}
    [Documentation]    เลือก Dropdown โดยค้นหาจาก "บางส่วนของข้อความ" (ไม่ต้องเป๊ะก็เลือกได้)
    
    # --- STEP 1: เลื่อนจอลงมาหาปุ่ม Add (เพื่อให้เห็น Dropdown) ---
    ${bottom_btn}=    Set Variable    xpath=//button[contains(., 'Add')]
    Run Keyword And Ignore Error    Scroll Element Into View    ${bottom_btn}
    Sleep    0.5s

    # --- STEP 2: พยายามหา <option> ที่มีข้อความคาบเกี่ยวกับคำที่ส่งมา ---
    # เช่น ส่งมาว่า "0%" จะไปหา option ที่เขียนว่า "No Sweet (0%)" เจอ
    ${option_locator}=    Set Variable    xpath=//option[contains(., '${partial_text}')]
    
    ${found_option}=    Run Keyword And Return Status    Page Should Contain Element    ${option_locator}
    
    IF    ${found_option}
        # ✅ เจอ! ดึงข้อความเต็มๆ ออกมา (เช่น "No Sweet (0%)")
        ${full_text}=    Get Text    ${option_locator}
        Log    Found full option text: ${full_text}
        
        # หาตัวแม่ <select> ของ option นี้
        ${select_locator}=    Set Variable    xpath=//option[contains(., '${partial_text}')]/..
        
        # สั่งเลือกด้วยข้อความเต็ม
        Select From List By Label    ${select_locator}    ${full_text}
        
    ELSE
        # ❌ ไม่เจอ option ใน Select (อาจเป็น Custom Dropdown หรือชื่อผิดไปไกล)
        # ลองใช้วิธีคลิกแบบเดิม (เผื่อฟลุ๊ค)
        Log    Warning: Could not find option containing '${partial_text}' in any <select>. Trying custom click...
        
        # กดเปิดหัวข้อก่อน (เผื่อพับอยู่)
        Run Keyword And Ignore Error    Click Element    xpath=//*[contains(text(), 'Sweetness') or contains(text(), 'Additional')]
        Sleep    0.5s
        
        # ลองกดตัวเลือก
        ${custom_xpath}=    Set Variable    xpath=//*[contains(text(), '${partial_text}')]
        Wait Until Element Is Visible    ${custom_xpath}    timeout=5s
        Click Element    ${custom_xpath}
    END
Click Add To Cart Button
    [Documentation]    กดปุ่ม Add แล้วรอให้เด้งไปหน้า Basket
    ${add_btn}=    Set Variable    xpath=//button[contains(., 'Add')]
    JS Click Element    ${add_btn}
    Wait Until Location Contains    basket    timeout=10s

# ==========================================
# ✅ VERIFICATION (BASKET PAGE)
# ==========================================

Verify Item In Basket With Option
    [Arguments]    ${item_name}    ${expected_option}
    [Documentation]    เช็คชื่อเมนู และเช็คว่ามี Option ตัวเล็กๆ ห้อยท้ายมาด้วยไหม
    
    # Logic ตาม React Code:
    # <div className="flex-1 ...">
    #    <h3>{item.menuName}</h3>
    #    <div className="text-xs ..."> {options.join(', ')} </div>
    # </div>
    
    # 1. หา Container แม่ ของสินค้านั้น (ถอยจาก h3 ขึ้นไป 1 ขั้น)
    ${item_container}=    Set Variable    xpath=//h3[contains(text(), '${item_name}')]/..
    
    # 2. เช็คว่า Option นั้น ปรากฏอยู่ใน Container นี้หรือไม่
    Wait Until Element Is Visible    ${item_container}    timeout=5s
    Element Should Contain    ${item_container}    ${expected_option}
    
    Log    Success: Found '${item_name}' with option '${expected_option}' in basket.