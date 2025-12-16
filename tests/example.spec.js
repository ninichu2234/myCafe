const { test, expect } = require('@playwright/test');

test.describe('ChatPage AI Barista Flow', () => {


  test.beforeEach(async ({ page }) => {
    
    
    await page.route('**/rest/v1/menuItems*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { 
            menuId: 101, 
            menuName: 'Iced Latte', 
            menuPrice: 120, 
            menuCategory: 'Coffee', 
            menuImage: 'latte.jpg' 
          }
        ])
      });
    });

    await page.route('**/rest/v1/option*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { 
            optionName: 'Oat Milk', 
            priceAdjustment: 20, 
            optionGroups: { nameGroup: 'Milk' } 
          }
        ])
      });
    });

   
    await page.addInitScript(() => {
      window.speechSynthesis = {
        speak: () => {},
        cancel: () => {},
        getVoices: () => [{ name: 'Kanya', lang: 'th-TH' }],
        onvoiceschanged: null,
      };
      window.SpeechSynthesisUtterance = class {};

      window.webkitSpeechRecognition = class {
        constructor() {
            this.onstart = null;
            this.onresult = null;
            this.onend = null;
            this.onerror = null;
        }
        start() {
          if (this.onstart) this.onstart();
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [[{ transcript: "ขอกาแฟลาเต้แก้วนึงครับ" }]] 
              });
            }
            if (this.onend) this.onend();
          }, 500);
        }
        stop() { if (this.onend) this.onend(); }
      };
      window.SpeechRecognition = window.webkitSpeechRecognition;
    });


    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: "รับ Iced Latte เพิ่มนมโอ๊ตไหมคะ?",
          recommendations: [
            { 
              menuId: 101,
              quantity: 1,
              suggestedOptions: [{ groupName: 'Milk', optionName: 'Oat Milk' }] 
            }
          ],
          itemsToAutoAdd: [],
          itemsToModify: [],
          itemsToDelete: []
        })
      });
    });
  });

  
  test('Flow: พูดสั่งกาแฟ -> AI แนะนำ -> กดเพิ่มลงตะกร้า', async ({ page }) => {
    
    
    await page.goto('http://localhost:3000/chat'); 


    const askBtn = page.getByRole('button', { name: 'Ask Barista' });
    await expect(askBtn).toBeVisible({ timeout: 15000 });

    const micBtn = page.locator('button[title="เริ่มคุยด้วยเสียง"]');
    await expect(micBtn).toBeEnabled({ timeout: 15000 });


    await micBtn.click();

  
    const textarea = page.locator('#question');
    await expect(textarea).toHaveValue('ขอกาแฟลาเต้แก้วนึงครับ', { timeout: 10000 });


    await expect(page.getByText('รับ Iced Latte เพิ่มนมโอ๊ตไหมคะ?')).toBeVisible();

    const recCard = page.locator('.bg-white').filter({ hasText: 'Iced Latte' }).first();
    await expect(recCard).toBeVisible();

    
    const addToCartBtn = recCard.locator('button').filter({ hasText: /Add|฿/ }).first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    
    const cartSection = page.locator('.bg-\\[\\#F0EBE3\\]'); 
    

    await expect(cartSection).toContainText('Iced Latte');
    
    
    await expect(cartSection).toContainText('120.00 ฿');
    
    
  });

});