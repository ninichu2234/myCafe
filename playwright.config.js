
import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({

  timeout: 90000, 
  
  
  testDir: './tests',
  
  
  fullyParallel: true,
  

  forbidOnly: !!process.env.CI,
  
  
  retries: process.env.CI ? 2 : 0,
   
 // จำนวน Worker ที่รัน Test พร้อมกัน (บน CI รันแค่ 1 เพื่อประหยัดทรัพยากร)
  workers: process.env.CI ? 1 : undefined,
  

  reporter: 'html',
  

  use: { 

    baseURL: 'http://localhost:3000',


    trace: 'on-first-retry',
    
    
    timezoneId: 'Asia/Bangkok', 

    
    viewport: { width: 1280, height: 720 }, 
  },


  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'], 
        
        locale: 'th-TH', 
      },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],


  webServer: {
    
    command: 'npm run dev', 
    
    // URL ที่ Playwright จะตรวจสอบว่า Server พร้อมใช้งานแล้ว
    url: 'http://localhost:3000',
    

    timeout: 60000, // 60 วินาที


    reuseExistingServer: !process.env.CI,
  },
});