*** Settings ***
Library           SeleniumLibrary
Test Setup        Open Browser To Menu Page
Test Teardown     Close Browser
Resource         ../resources/keywords/keywords.robot
Resource         ../resources/variables/variables.robot

*** Test Cases ***
TC-01: Verify search in 'Coffee' category
    Search And Verify Item In Category    ${ITEM_COFFEE}    Coffee
TC-02: Verify User click in 'Coffee' category with side menu
    Click Side Menu And Verify Header     Coffee
TC-03: User can click add coffee menu
    Select Item And Add To Cart           ${ITEM_COFFEE}
TC-04: Verify search in 'Tea' category
    Search And Verify Item In Category    ${ITEM_TEA}    Tea
TC-05: Verify User click in 'Tea' category with side menu
    Click Side Menu And Verify Header     Tea
TC-06: User can click add menu in 'Tea' category
    Select Item And Add To Cart           ${ITEM_TEA}
TC-07: Verify search in 'Milk' category
    Search And Verify Item In Category    ${ITEM_MILK}    Milk
TC-08: Verify User click in 'Milk' category with side menu
    Click Side Menu And Verify Header     Milk
TC-09: User can click add menu in 'Milk' category
    Select Item And Add To Cart           ${ITEM_MILK}
TC-10: Verify search in 'Dessert' category
    Search And Verify Item In Category    ${ITEM_DESSERT}    Dessert
TC-11: Verify User click in 'Dessert' category with side menu
    Click Side Menu And Verify Header     Dessert
TC-12: User can click add menu in 'Dessert' and go to Basket
    Select Item And Add To Cart           ${ITEM_DESSERT}
TC-13: Verify search in 'Other' category
    Search And Verify Item In Category    ${ITEM_OTHER}    Other
TC-14: Verify User click in 'Other' category with side menu
    Click Side Menu And Verify Header     Other
TC-15: User can click add menu in 'Other' and go to Basket
    Select Item And Add To Cart           ${ITEM_OTHER}
TC-16: Order Americano with 0% Sweetness
    [Documentation]    สั่งกาแฟแบบไม่หวานเลย แล้วเช็คในตะกร้า
    Select Item To Detail Page    ${ITEM_COFFEE}
    Select Custom Option          Unsweetened (0%)
    Click Add To Cart Button
    Verify Item In Basket With Option    ${ITEM_COFFEE}    Unsweetened (0%)

TC-17: Order Latte with Extra Shot and Vanilla Syrup
    [Documentation]   
    Select Item To Detail Page    ${ITEM_LATTE}
    Select Custom Option          Extra Espresso Shot
    Select Custom Option          Vanilla 
    Click Add To Cart Button
    Verify Item In Basket With Option    ${ITEM_LATTE}    Extra Espresso Shot
    Verify Item In Basket With Option    ${ITEM_LATTE}    Vanilla 



