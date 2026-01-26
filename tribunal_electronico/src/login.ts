import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { TribunalConfig } from './config';
import { scrapeDocumentos, saveDocumentsToJSON } from './scraper';
import { downloadDocuments, saveDownloadReport } from './downloader';
import * as fs from 'fs';

puppeteer.use(StealthPlugin());

// Helper function to add random human-like delays
function randomDelay(min: number = 100, max: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper function to simulate human typing
async function humanType(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
  await randomDelay(100, 300);

  for (const char of text) {
    await page.type(selector, char, { delay: Math.random() * 100 + 50 });
  }

  await randomDelay(200, 400);
}

export async function loginToTribunal(config: TribunalConfig): Promise<void> {
  console.log('Starting Tribunal Electrónico login automation...');

  let browser: Browser | null = null;

  try {
    // Verify certificate files exist
    if (!fs.existsSync(config.cerPath)) {
      throw new Error(`Certificate file not found: ${config.cerPath}`);
    }
    if (!fs.existsSync(config.keyPath)) {
      throw new Error(`Key file not found: ${config.keyPath}`);
    }

    console.log('Launching browser with stealth mode...');
    browser = await puppeteer.launch({
      headless: false, // Set to true for production
      defaultViewport: {
        width: 1920 + Math.floor(Math.random() * 100),
        height: 1080 + Math.floor(Math.random() * 100)
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--start-maximized'
      ]
    });

    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Add some randomness to appear more human
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    console.log(`Navigating to: ${config.loginUrl}`);
    await page.goto(config.loginUrl, { waitUntil: 'networkidle2' });
    await randomDelay(1000, 2000);

    // Take screenshot for debugging
    await page.screenshot({ path: 'screenshots/01-initial-page.png', fullPage: true });
    console.log('Screenshot saved: 01-initial-page.png');

    // The "Correo Electrónico" radio button is selected by default, so we can skip it
    console.log('Email authentication method is already selected by default...');
    await randomDelay(500, 1000);

    await page.screenshot({ path: 'screenshots/02-ready-to-fill.png', fullPage: true });
    console.log('Screenshot saved: 02-ready-to-fill.png');

    // Fill in email - try multiple selectors
    console.log('Entering email address...');
    const emailInputSelectors = [
      'input[placeholder="Correo Electrónico"]',
      'input[type="text"]',
      '#txtCorreo',
      '[name*="correo"]'
    ];

    let emailFilled = false;
    for (const selector of emailInputSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 2000 });
        await humanType(page, selector, config.email);
        emailFilled = true;
        console.log(`Email entered using selector: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!emailFilled) {
      throw new Error('Could not find email input field');
    }

    await page.screenshot({ path: 'screenshots/03-email-entered.png', fullPage: true });
    console.log('Screenshot saved: 03-email-entered.png');

    // Fill in password
    console.log('Entering password...');
    await randomDelay(500, 1000);
    const passwordSelector = 'input[type="password"]';
    await humanType(page, passwordSelector, config.password);

    await page.screenshot({ path: 'screenshots/04-password-entered.png', fullPage: true });
    console.log('Screenshot saved: 04-password-entered.png');

    // Upload private key (.key file)
    console.log('Uploading private key file...');
    await randomDelay(1000, 1500);

    // Find all file inputs and identify which is for .key
    const fileInputs = await page.$$('input[type="file"]');
    console.log(`Found ${fileInputs.length} file input(s)`);

    if (fileInputs.length >= 2) {
      // First file input should be for .key, second for .cer
      await fileInputs[0].uploadFile(config.keyPath);
      console.log('Private key uploaded to first file input');
      await randomDelay(2000, 3000);  // Wait longer after key upload

      await page.screenshot({ path: 'screenshots/05-key-uploaded.png', fullPage: true });
      console.log('Screenshot saved: 05-key-uploaded.png');

      // Upload certificate (.cer file)
      console.log('Uploading certificate file...');
      await randomDelay(1000, 1500);  // Wait before certificate upload
      await fileInputs[1].uploadFile(config.cerPath);
      console.log('Certificate uploaded to second file input');
      await randomDelay(1000, 1500);  // Reduced delay

      await page.screenshot({ path: 'screenshots/06-certificate-uploaded.png', fullPage: true });
      console.log('Screenshot saved: 06-certificate-uploaded.png');
    } else {
      console.warn('Expected 2 file inputs, found different number');
    }

    // Click the login button
    console.log('Clicking login button...');
    await randomDelay(500, 1000);

    // Find and click button with text "Acceder"
    const loginButtonFound = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
      const accederButton = buttons.find((btn: any) => btn.textContent?.includes('Acceder'));
      if (accederButton) {
        (accederButton as HTMLElement).click();
        return true;
      }
      return false;
    });

    if (!loginButtonFound) {
      throw new Error('Could not find login button');
    }

    console.log('Login button clicked!');

    // Wait for navigation or error message
    console.log('Waiting for login response...');
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.waitForSelector('.error, .alert-danger, .mensaje-error', { timeout: 10000 }).catch(() => null)
    ]);

    await randomDelay(2000, 3000);
    await page.screenshot({ path: 'screenshots/07-after-login.png', fullPage: true });
    console.log('Screenshot saved: 07-after-login.png');

    // Check for errors
    const errorMessage = await page.$eval('.error, .alert-danger, .mensaje-error',
      el => el.textContent).catch(() => null);

    if (errorMessage) {
      console.error(`Login failed with error: ${errorMessage}`);
      throw new Error(`Login failed: ${errorMessage}`);
    }

    // Check if we're logged in by looking for common post-login elements
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('default.aspx') || currentUrl.includes('home') || currentUrl.includes('dashboard') || currentUrl.includes('bienvenida')) {
      console.log('Login successful! Redirected to main page.');
    } else {
      console.log('Login may have succeeded, but verification needed. Check screenshots.');
    }

    // Wait for the page to fully load
    console.log('Waiting for page to load completely...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await randomDelay(500, 800); // Reduced to 0.5-0.8s

    // Click on "Tribunal Electrónico 2.0" button
    console.log('Looking for Tribunal Electrónico 2.0 button...');

    let tribunalButtonClicked = false;
    try {
      // Try by ID first
      await page.waitForSelector('#MainContent_Button2', { visible: true, timeout: 5000 });
      await randomDelay(300, 500); // Reduced to 0.3-0.5s
      await page.click('#MainContent_Button2');
      tribunalButtonClicked = true;
      console.log('Clicked on Tribunal Electrónico 2.0 button by ID!');
    } catch (e) {
      console.log('Button not found by ID, trying by value...');
      // Fallback to finding by value
      tribunalButtonClicked = await page.evaluate(() => {
        const button = document.querySelector('input[type="submit"][value="Tribunal Electrónico 2.0"]');
        if (button) {
          (button as HTMLElement).click();
          return true;
        }
        return false;
      });
      if (tribunalButtonClicked) {
        console.log('Clicked on Tribunal Electrónico 2.0 button by value!');
      }
    }

    if (tribunalButtonClicked) {
      await randomDelay(800, 1200); // Reduced to 0.8-1.2s (total ~1.6-2.5s)
      await page.screenshot({ path: 'screenshots/08-tribunal-2.0-page.png', fullPage: true });
      console.log('Screenshot saved: 08-tribunal-2.0-page.png');

      // Find the correct DOCUMENTOS link (not NOTIFICACIONES)
      console.log('Looking for DOCUMENTOS link...');
      await randomDelay(500, 1000);

      // List all links to find the right one
      const links = await page.evaluate(() => {
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        return allLinks
          .filter((a: any) => {
            const text = a.textContent?.trim() || '';
            const href = a.href || '';
            return text.toLowerCase().includes('documento') || href.toLowerCase().includes('documento');
          })
          .map((a: any) => ({
            text: a.textContent?.trim(),
            href: a.href
          }));
      });

      console.log(`Found ${links.length} document-related links:`);
      links.forEach(link => {
        console.log(`  - "${link.text}" -> ${link.href}`);
      });

      // Find the DOCUMENTOS link (not notificaciones)
      const documentosLink = links.find(link =>
        (link.href.includes('/Documentos/ObtenerDocumentos') && !link.href.includes('Notificacion')) ||
        (link.text?.toUpperCase() === 'DOCUMENTOS' && !link.href.includes('Notificacion'))
      );

      if (documentosLink) {
        console.log(`Navigating to: ${documentosLink.href}`);
        await page.goto(documentosLink.href, { waitUntil: 'networkidle2' });
        console.log('Navigated to Documentos page!');
      } else {
        console.log('Could not find Documentos link, trying default URL...');
        await page.goto('https://sjpo.pjbc.gob.mx/Documentos/ObtenerDocumentos/', { waitUntil: 'networkidle2' });
      }

      // Wait for documents to load
      await randomDelay(1000, 1500);
      console.log('Waiting for documents to load...');
      await page.waitForSelector('table, .list-group, [class*="documento"], div.row.p-10', { timeout: 10000 }).catch(() => {
        console.log('Could not find document container, continuing anyway...');
      });
      await randomDelay(500, 1000);

        await page.screenshot({ path: 'screenshots/09-documentos-page.png', fullPage: true });
        console.log('Screenshot saved: 09-documentos-page.png');

        // Save HTML content of the page for analysis
        console.log('Saving HTML content of Documentos page...');
        const htmlContent = await page.content();
        const htmlDir = 'data/html';
        if (!fs.existsSync(htmlDir)) {
          fs.mkdirSync(htmlDir, { recursive: true });
        }
        fs.writeFileSync('data/html/documentos-page.html', htmlContent, 'utf-8');
        console.log('HTML saved to: data/html/documentos-page.html');

        // Scrape documents from the page
        console.log('');
        console.log('='.repeat(60));
        const documents = await scrapeDocumentos(page);

        if (documents.length > 0) {
          // Save to JSON file
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const filename = `data/documentos-${timestamp}.json`;
          saveDocumentsToJSON(documents, filename);

          // Also save to a "latest" file for easy access
          saveDocumentsToJSON(documents, 'data/documentos-latest.json');

          console.log(`Successfully scraped ${documents.length} documents!`);
          console.log('='.repeat(60));

          // Download PDFs
          console.log('\n' + '='.repeat(60));
          console.log('STARTING PDF DOWNLOADS');
          console.log('='.repeat(60));

          const downloadResults = await downloadDocuments(page, browser, documents);

          // Save download report
          saveDownloadReport(downloadResults, `data/download-report-${timestamp}.json`);
          saveDownloadReport(downloadResults, 'data/download-report-latest.json');

        } else {
          console.log('No documents found on the page.');
        }
    } else {
      console.log('Could not find Tribunal Electrónico 2.0 button, might need to adjust selector.');
    }

    // Keep browser open for a moment to verify
    console.log('\nWaiting 5 seconds before closing browser...');
    await randomDelay(5000, 5000);

  } catch (error) {
    console.error('Error during login process:', error);
    if (browser) {
      const pages = await browser.pages();
      if (pages.length > 0) {
        await pages[0].screenshot({ path: 'screenshots/error.png', fullPage: true });
        console.log('Error screenshot saved: error.png');
      }
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}
