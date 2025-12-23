*** Settings ***
Library           SeleniumLibrary
Resource          ../../resources/variables/variables.robot

*** Keywords ***

Open Browser To Menu Page
    Open Browser    ${URL_MENU}    chrome
    Maximize Browser Window
    Maximize Browser Window
    Wait Until Element Is Visible    xpath=//input[@placeholder='Search menu']    timeout=10s
    Wait Until Element Is Visible    xpath=//h3    timeout=10s

JS Click Element
    [Arguments]    ${xpath}
    [Documentation]   
    Wait Until Page Contains Element    ${xpath}    timeout=10s
    ${element}=    Get WebElement    ${xpath}
    Execute Javascript    arguments[0].scrollIntoView({block: "center"});    ARGUMENTS    ${element}
    Sleep    0.5s
    Execute Javascript    arguments[0].click();    ARGUMENTS    ${element}

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


Select Item And Add To Cart
    [Arguments]    ${item_name}
    [Documentation]   
    Select Item To Detail Page    ${item_name}
    Click Add To Cart Button

Select Item To Detail Page
    [Arguments]    ${item_name}
    [Documentation]   
    ${card_xpath}=    Set Variable    xpath=//h3[contains(., '${item_name}')]/ancestor::a
    JS Click Element    ${card_xpath}
    Wait Until Location Contains    menuDetail    timeout=5s


Select Custom Option
    [Arguments]    ${partial_text}
    [Documentation]  
    ${bottom_btn}=    Set Variable    xpath=//button[contains(., 'Add')]
    Run Keyword And Ignore Error    Scroll Element Into View    ${bottom_btn}
    Sleep    0.5s
    ${option_locator}=    Set Variable    xpath=//option[contains(., '${partial_text}')]
    ${found_option}=    Run Keyword And Return Status    Page Should Contain Element    ${option_locator}
    
    IF    ${found_option}
        ${full_text}=    Get Text    ${option_locator}
        Log    Found full option text: ${full_text}
        
       
        ${select_locator}=    Set Variable    xpath=//option[contains(., '${partial_text}')]/..
        
       
        Select From List By Label    ${select_locator}    ${full_text}
        
    ELSE
    
        Log    Warning: Could not find option containing '${partial_text}' in any <select>. Trying custom click...
        
      
        Run Keyword And Ignore Error    Click Element    xpath=//*[contains(text(), 'Sweetness') or contains(text(), 'Additional')]
        Sleep    0.5s
        
       
        ${custom_xpath}=    Set Variable    xpath=//*[contains(text(), '${partial_text}')]
        Wait Until Element Is Visible    ${custom_xpath}    timeout=5s
        Click Element    ${custom_xpath}
    END
Click Add To Cart Button
    [Documentation]    
    ${add_btn}=    Set Variable    xpath=//button[contains(., 'Add')]
    JS Click Element    ${add_btn}
    Wait Until Location Contains    basket    timeout=10s

Verify Item In Basket With Option
    [Arguments]    ${item_name}    ${expected_option}
    [Documentation]   
    
   
    ${item_container}=    Set Variable    xpath=//h3[contains(text(), '${item_name}')]/..
    
    
    Wait Until Element Is Visible    ${item_container}    timeout=5s
    Element Should Contain    ${item_container}    ${expected_option}
    
    Log    Success: Found '${item_name}' with option '${expected_option}' in basket.