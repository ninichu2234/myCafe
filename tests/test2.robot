*** Settings ***
Library           SeleniumLibrary
Test Setup        Open Browser To Menu Detail Page
Test Teardown     Close Browser
Test Template     Order With Custom Options

*** Variables ***
${URL_DETAIL}     http://localhost:3000/menuDetail/1  
# ⚠️ เปลี่ยน ID เป็นเมนูที่มี Options จริงๆ (เช่น Coffee)
${BROWSER}        chrome


*** Keywords ***
Open Browser To Menu Detail Page
    Open Browser    ${URL_DETAIL}    ${BROWSER}
    Maximize Browser Window
    Wait Until Element Is Visible    xpath=//h1    timeout=10s

Order With Custom Options
    [Arguments]    ${sweetness}    ${extras}    ${syrup}    ${note}
    
    # 1. เลือกความหวาน (ถ้ามีการส่งค่ามา)
    IF    "${sweetness}" != "${EMPTY}"
        Select From List By Label    xpath=//select[contains(@id, 'Sweetness')]    ${sweetness}
    END

    # 2. เลือก Extras (ถ้ามีการส่งค่ามา)
    IF    "${extras}" != "${EMPTY}"
         Select From List By Label    xpath=//select[contains(@id, 'Extras')]    ${extras}
    END

    # 3. เลือก Syrup (ถ้ามีการส่งค่ามา)
    IF    "${syrup}" != "${EMPTY}"
         Select From List By Label    xpath=//select[contains(@id, 'Syrup')]    ${syrup}
    END

    # 4. ใส่ Note
    Input Text    xpath=//textarea    ${note}

    # 5. กด Add
    Click Button    xpath=//button[contains(text(), 'Add')]
    
    # 6. Verify Success (ไปหน้าตะกร้า)
    Wait Until Location Contains    basket