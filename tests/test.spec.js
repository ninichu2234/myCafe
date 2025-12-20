import { test, expect } from '@playwright/test';

test.describe('End-to-End Purchase Flow (Basket to Payment Success)', () => {

 
  const mockCart = [
    {
      cartItemId: 'item-1',
      menuId: 101,
      menuName: 'Iced Latte',
      menuPrice: 120,
      quantity: 1,
      finalPrice: 120, 
    },
    {
      cartItemId: 'item-2',
      menuId: 202,
      menuName: 'Croissant',
      menuPrice: 85,
      quantity: 2,
      finalPrice: 85,
    }
  ];


  test.beforeEach(async ({ page }) => {
   
    await page.addInitScript((data) => {
      window.localStorage.setItem('myCafeCart', JSON.stringify(data));
    }, mockCart);


    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id-123',
          aud: 'authenticated',
          email: 'test@example.com'
        })
      });
    });

    
    await page.route('**/rest/v1/profiles*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                id: 'test-user-id-123',
                fullName: 'Test User',
                loyaltyPoints: 100 
            })
        });
      } else if (route.request().method() === 'PATCH') {

        await route.fulfill({ status: 200, body: JSON.stringify({}) });
      } else {
        await route.continue();
      }
    });


    await page.route('**/rest/v1/order*', async route => {
        if (route.request().method() === 'POST') {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    orderId: 'ORD-TEST-9999',
                    created_at: new Date().toISOString()
                })
            });
        } else {
            await route.continue();
        }
    });


    await page.route('**/rest/v1/orderDetails*', async route => {
        await route.fulfill({ status: 201, body: JSON.stringify({}) });
    });
  });

  test('Validation Check & Successful Purchase', async ({ page }) => {
    

    await page.goto('/basket');


    await expect(page.getByText('Iced Latte')).toBeVisible();
    await expect(page.getByText('฿310.30')).toBeVisible();


    await page.getByRole('button', { name: 'Continue to Checkout' }).click();
    

    await expect(page).toHaveURL(/\/checkout/);


    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeDisabled();


    const tableInput = page.locator('input[name="tableNumber"]');
    await tableInput.click();
    await tableInput.blur(); 
  
    await tableInput.fill('5');

   
    await expect(submitBtn).toBeEnabled();

    
    await page.getByText('Mobile banking').click();
    await page.getByLabel('QR Code').check(); 

   
    await submitBtn.click();


    await expect(page.getByText('Success!', { exact: false })).toBeVisible({ timeout: 10000 });
    

    await expect(page.getByText('ORD-TEST-9999')).toBeVisible();


    const cartInStorage = await page.evaluate(() => localStorage.getItem('myCafeCart'));
    

    expect(cartInStorage).toBeNull(); 

   
    await page.getByRole('link', { name: 'Back to home' }).click();
    
  });

});