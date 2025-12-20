*** Settings ***
Library           SeleniumLibrary

*** Variables ***
${URL_MENU}       http://localhost:3000/menu-page    # ปรับ URL ให้ตรงกับโปรเจกต์ของคุณ
${BROWSER}        chrome
${TARGET_MENU}    Americano    # ชื่อเมนูที่ต้องการทดสอบค้นหา (ต้องมีอยู่จริงใน DB)
${NOTE_TEXT}      หวานน้อย แยกน้ำแข็ง

*** Test Cases ***
Test Search And Order Flow
    [Documentation]    ทดสอบ Flow: ค้นหาเมนู -> เข้าหน้ารายละเอียด -> ปรับจำนวน/Note -> ใส่ตะกร้า -> เช็คว่าไปหน้า Basket
    Open Browser To Menu Page
    Search For Menu Item    ${TARGET_MENU}
    Select Menu Item        ${TARGET_MENU}
    Verify Detail Page Loaded
    
    # ทดสอบฟีเจอร์ในหน้า Detail
    Adjust Quantity To    3
    Input Special Instruction    ${NOTE_TEXT}
    
    # ทดสอบเลือก Option (ถ้ามี Dropdown) - Optional
    # Try Select First Option If Available
    
    Add To Cart
    Verify Redirect To Basket
    [Teardown]    Close Browser

*** Keywords ***
Open Browser To Menu Page
    Sleep    5s
    Open Browser    ${URL_MENU}    ${BROWSER}
    Maximize Browser Window
    Wait Until Element Is Visible    xpath=//input[@placeholder='Search menu']    timeout=10s

Search For Menu Item
    [Arguments]    ${menu_name}
    Input Text    xpath=//input[@placeholder='Search menu']    ${menu_name}
    # รอสักครู่เพื่อให้ React Filter ทำงาน
    Sleep    5s
    Wait Until Element Is Visible    xpath=//h3[contains(text(), '${menu_name}')]

Select Menu Item
    [Arguments]    ${menu_name}
    Click Element    xpath=//h3[contains(text(), '${menu_name}')]

Verify Detail Page Loaded
    # ตรวจสอบว่า URL เปลี่ยนไปมีคำว่า menuDetail
    Wait Until Location Contains    menuDetail    timeout=10s
    # ตรวจสอบว่ารูปภาพโหลดขึ้นมา (เช็คจาก alt text หรือ container)
    Wait Until Element Is Visible    xpath=//h1[contains(@class, 'text-3xl')]

Adjust Quantity To
    [Arguments]    ${target_qty}
    # กดปุ่ม + ตามจำนวนที่ต้องการ (สมมติว่าเริ่มต้นที่ 1)
    # หมายเหตุ: Logic นี้เขียนแบบง่าย วนลูปกดปุ่ม +
    FOR    ${i}    IN RANGE    1    ${target_qty}
        Click Button    xpath=//button[text()='+']
    END
    # ตรวจสอบว่าตัวเลขเปลี่ยนจริง
    Element Should Contain    xpath=//span[contains(@class, 'text-center')]    ${target_qty}

Input Special Instruction
    [Arguments]    ${text}
    # หา Textarea จาก Placeholder ที่ระบุในโค้ด React
    Input Text    xpath=//textarea[contains(@placeholder, 'เช่น ไม่หวาน')]    ${text}

Try Select First Option If Available
    [Documentation]    พยายามเลือก Option ถ้ามี Dropdown ปรากฏขึ้นมา
    ${dropdown_visible}=    Run Keyword And Return Status    Element Should Be Visible    xpath=//select
    IF    ${dropdown_visible}
        # เลือก index ที่ 2 (มักจะเป็นตัวเลือกแรกที่ไม่ใช่ None/Default)
        Select From List By Index    xpath=(//select)[1]    1
    END

Add To Cart
    # กดปุ่ม Add (หาปุ่มที่มีคำว่า Add)
    Click Button    xpath=//button[contains(text(), 'Add')]

Verify Redirect To Basket
    # ในโค้ด React: router.push('/basket')
    Wait Until Location Contains    basket    timeout=5s
    Log    Successfully redirected to Basket page.