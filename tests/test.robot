*** Settings ***
Library           SeleniumLibrary
Test Setup        Open Browser To Menu Page
Test Teardown     Close Browser

*** Variables ***
${URL_MENU}       http://localhost:3000/menu-page
${BROWSER}        chrome

# --- 📝 แก้ไขชื่อเมนูตัวแทนของแต่ละหมวดตรงนี้ให้ตรงกับ DB จริง ---
${ITEM_COFFEE}       Americano
${ITEM_TEA}          Matcha Green Tea
${ITEM_MILK}         Fresh Milk
${ITEM_REFRESHER}    Yuzu Soda
${ITEM_BAKERY}       Croissant
${ITEM_DESSERT}      Ice Cream
${ITEM_OTHER}        Drinking Water

*** Test Cases ***

# --- COFFEE Category ---
TC-01: Verify search in 'Coffee' category
    Search And Verify Item In Category    ${ITEM_COFFEE}    Coffee

TC-02: Verify User click in 'Coffee' category with side menu
    Click Side Menu And Verify Header     Coffee

TC-03: User can click add coffee menu in menu page
    Select Item And Add To Cart           ${ITEM_COFFEE}

# --- TEA Category ---
TC-04: Verify search in 'Tea' category
    Search And Verify Item In Category    ${ITEM_TEA}    Tea

TC-05: Verify User click in 'Tea' category with side menu
    Click Side Menu And Verify Header     Tea

TC-06: User can click add menu in 'Tea' category
    Select Item And Add To Cart           ${ITEM_TEA}

# --- MILK Category ---
TC-07: Verify search in 'Milk' category
    Search And Verify Item In Category    ${ITEM_MILK}    Milk

TC-08: Verify User click in 'Milk' category with side menu
    Click Side Menu And Verify Header     Milk

TC-09: User can click add menu in 'Milk' category
    Select Item And Add To Cart           ${ITEM_MILK}

# --- REFRESHER Category ---
TC-10: Verify search in 'Refresher' category
    Search And Verify Item In Category    ${ITEM_REFRESHER}    Refreshers

TC-11: Verify User click in 'Refresher' category with side menu
    Click Side Menu And Verify Header     Refreshers

TC-12: User can click add menu in 'Refresher' category
    Select Item And Add To Cart           ${ITEM_REFRESHER}

# --- BAKERY Category ---
TC-13: Verify search in 'Bakery' category
    Search And Verify Item In Category    ${ITEM_BAKERY}    Bakery

TC-14: Verify User click in 'Bakery' category with side menu
    Click Side Menu And Verify Header     Bakery

TC-15: User can click add menu in 'Bakery' category
    Select Item And Add To Cart           ${ITEM_BAKERY}

# --- DESSERT Category ---
TC-16: Verify search in 'Dessert' category
    Search And Verify Item In Category    ${ITEM_DESSERT}    Dessert

TC-17: Verify User click in 'Dessert' category with side menu
    Click Side Menu And Verify Header     Dessert

TC-18: User can click add menu in 'Dessert' category
    Select Item And Add To Cart           ${ITEM_DESSERT}

# --- OTHER Category ---
TC-19: Verify search in 'Other' category
    Search And Verify Item In Category    ${ITEM_OTHER}    Other

TC-20: Verify User click in 'Other' category with side menu
    Click Side Menu And Verify Header     Other

TC-21: User can click add menu in 'Other' category
    Select Item And Add To Cart           ${ITEM_OTHER}


*** Keywords ***
Open Browser To Menu Page
    Open Browser    ${URL_MENU}    ${BROWSER}
    Maximize Browser Window
    Wait Until Element Is Visible    xpath=//input[@placeholder='Search menu']    timeout=10s

Search And Verify Item In Category
    [Arguments]    ${item_name}    ${category_id}
    Input Text    xpath=//input[@placeholder='Search menu']    ${item_name}
    Sleep    1s
    Wait Until Element Is Visible    id=${category_id}
    Element Should Be Visible    xpath=//section[@id='${category_id}']//h3[contains(text(), '${item_name}')]

Click Side Menu And Verify Header
    [Arguments]    ${category_name}
    # คลิก Link ที่ Sidebar (สมมติ href=#CategoryName)
    Click Link    xpath=//aside//a[contains(@href, '#${category_name}')]
    # ตรวจสอบว่า Header ของหมวดนั้นแสดงอยู่
    Wait Until Element Is Visible    xpath=//h2[contains(text(), '${category_name}')]

Select Item And Add To Cart
    [Arguments]    ${item_name}
    # 1. คลิกที่สินค้า
    Click Element    xpath=//h3[contains(text(), '${item_name}')]
    # 2. รอหน้า Detail โหลด
    Wait Until Location Contains    menuDetail    timeout=5s
    # 3. กด Add (ถ้ามี Option บังคับ อาจต้องเพิ่ม logic เลือก Option ตรงนี้)
    Click Button    xpath=//button[contains(text(), 'Add')]
    # 4. เช็คว่าไปหน้าตะกร้า
    Wait Until Location Contains    basket    timeout=5s