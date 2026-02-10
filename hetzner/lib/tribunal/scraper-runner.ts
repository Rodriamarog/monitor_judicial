/**
 * Tribunal Electrónico Scraper Runner
 * Wraps the existing tribunal_electronico code for use in the API
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

puppeteer.use(StealthPlugin());

// Import scraper logic (reusing existing code)
import { Document, scrapeDocumentos } from '../../../tribunal_electronico/src/scraper';

export interface ScraperParams {
  email: string;
  password: string;
  keyFileBase64: string;
  cerFileBase64: string;
}

export interface ScraperResult {
  success: boolean;
  documents: Document[];
  browser?: Browser;
  page?: Page;
  error?: string;
}

// Helper function to add random human-like delays
function randomDelay(min: number = 100, max: number = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Run Tribunal Electrónico scraper
 * Returns list of documents found
 */
export async function runTribunalScraper(
  params: ScraperParams
): Promise<ScraperResult> {
  const { email, password, keyFileBase64, cerFileBase64 } = params;

  let browser: Browser | null = null;
  let keyPath: string | null = null;
  let cerPath: string | null = null;

  try {
    // Create temporary files
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    keyPath = path.join(tempDir, `tribunal_scraper_${timestamp}.key`);
    cerPath = path.join(tempDir, `tribunal_scraper_${timestamp}.cer`);

    // Write base64 files to temp location
    fs.writeFileSync(keyPath, Buffer.from(keyFileBase64, 'base64'));
    fs.writeFileSync(cerPath, Buffer.from(cerFileBase64, 'base64'));

    // Verify files exist
    if (!fs.existsSync(keyPath)) {
      throw new Error('No se pudo crear el archivo .key temporal');
    }
    if (!fs.existsSync(cerPath)) {
      throw new Error('No se pudo crear el archivo .cer temporal');
    }

    // Launch browser
    console.log('[Scraper] Launching browser...');
    browser = await puppeteer.launch({
      headless: true, // Headless mode for production
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Login flow
    console.log('[Scraper] Navigating to login page...');
    const loginUrl = 'https://sjpo.pjbc.gob.mx/TribunalElectronico/login.aspx?ReturnUrl=%2ftribunalelectronico%2fdefault.aspx%3fver%3d1.2.4&ver=1.2.4';
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await randomDelay(1000, 2000);

    // Fill email
    console.log('[Scraper] Entering email...');
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
        await page.click(selector);
        await page.type(selector, email, { delay: 50 });
        emailFilled = true;
        console.log(`[Scraper] Email selector '${selector}' succeeded`);
        break;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown';
        console.warn(`[Scraper] Email selector '${selector}' failed: ${errorMsg}`);
        continue;
      }
    }

    if (!emailFilled) {
      throw new Error('No se pudo encontrar el campo de correo electrónico');
    }

    // Fill password
    console.log('[Scraper] Entering password...');
    const passwordSelector = 'input[type="password"]';
    await page.waitForSelector(passwordSelector, { visible: true });
    await page.type(passwordSelector, password, { delay: 50 });

    // Upload files
    console.log('[Scraper] Uploading certificate files...');
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length >= 2) {
      await fileInputs[0].uploadFile(keyPath);
      await randomDelay(2000, 3000);
      await fileInputs[1].uploadFile(cerPath);
      await randomDelay(1000, 1500);
    } else {
      throw new Error('No se encontraron los campos para subir archivos');
    }

    // Click login button
    console.log('[Scraper] Clicking login button...');
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
      throw new Error('No se pudo encontrar el botón de acceso');
    }

    // Wait for navigation
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      page.waitForSelector('.error, .alert-danger, .mensaje-error', { timeout: 15000 }).catch(() => null)
    ]);

    await randomDelay(2000, 3000);

    // Check for login errors
    const errorMessage = await page.$eval('.error, .alert-danger, .mensaje-error',
      el => el.textContent).catch(() => null);

    if (errorMessage) {
      throw new Error(`Error de autenticación: ${errorMessage}`);
    }

    // Verify login successful
    const currentUrl = page.url();
    if (!currentUrl.includes('default.aspx') && !currentUrl.includes('home') &&
        !currentUrl.includes('dashboard') && !currentUrl.includes('bienvenida')) {
      throw new Error('No se pudo verificar el inicio de sesión');
    }

    console.log('[Scraper] Login successful!');

    // Navigate to Tribunal Electrónico 2.0
    console.log('[Scraper] Looking for Tribunal Electrónico 2.0 button...');
    await randomDelay(500, 800);

    let tribunalButtonClicked = false;
    try {
      await page.waitForSelector('#MainContent_Button2', { visible: true, timeout: 5000 });
      await randomDelay(300, 500);
      await page.click('#MainContent_Button2');
      tribunalButtonClicked = true;
      console.log('[Scraper] Tribunal button found by ID selector');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown';
      console.warn(`[Scraper] Tribunal button ID selector failed: ${errorMsg}, trying fallback...`);
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
        console.log('[Scraper] Tribunal button found by value fallback');
      }
    }

    if (!tribunalButtonClicked) {
      throw new Error('No se pudo encontrar el botón de Tribunal Electrónico 2.0');
    }

    // Wait for navigation to Tribunal 2.0 page
    console.log('[Scraper] Waiting for Tribunal 2.0 page to load...');
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      randomDelay(5000) // Fallback timeout
    ]).catch((error) => {
      const errorMsg = error instanceof Error ? error.message : 'Unknown';
      console.warn(`[Scraper] Navigation timeout (${errorMsg}), continuing anyway...`);
    });

    await randomDelay(1500, 2500); // Extra wait for page to fully render
    console.log('[Scraper] Navigated to Tribunal 2.0 page');

    // Find DOCUMENTOS link
    console.log('[Scraper] Looking for DOCUMENTOS link...');
    await randomDelay(1500, 2000); // Extra delay to prevent timing issues

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

    const documentosLink = links.find(link =>
      (link.href.includes('/Documentos/ObtenerDocumentos') && !link.href.includes('Notificacion')) ||
      (link.text?.toUpperCase() === 'DOCUMENTOS' && !link.href.includes('Notificacion'))
    );

    if (documentosLink) {
      console.log('[Scraper] Navigating to Documentos page...');
      await page.goto(documentosLink.href, { waitUntil: 'networkidle2' });
    } else {
      console.log('[Scraper] Using default Documentos URL...');
      await page.goto('https://tribunalelectronico.pjbc.gob.mx/Documentos/ObtenerDocumentos/', { waitUntil: 'networkidle2' });
    }

    // Wait for documents to load
    await randomDelay(1000, 1500);
    await page.waitForSelector('table, .list-group, [class*="documento"], div.row.p-10', { timeout: 10000 }).catch((error) => {
      const errorMsg = error instanceof Error ? error.message : 'Unknown';
      console.warn(`[Scraper] Document selector timeout (${errorMsg}), continuing anyway...`);
    });
    await randomDelay(500, 1000);

    // Scrape documents
    console.log('[Scraper] Scraping documents...');
    const documents = await scrapeDocumentos(page);

    console.log(`[Scraper] Found ${documents.length} documents`);

    return {
      success: true,
      documents,
      browser,
      page
    };

  } catch (error) {
    // Take screenshot on error
    let screenshotPath: string | null = null;
    if (page) {
      try {
        screenshotPath = `/tmp/scraper-error-${email.replace('@', '-')}-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[Scraper] Screenshot saved: ${screenshotPath}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown';
        console.warn(`[Scraper] Screenshot failed: ${errMsg}`);
      }
    }

    console.error('[Scraper] Fatal Error:', {
      message: error instanceof Error ? error.message : 'Unknown',
      email,
      url: page ? page.url() : 'unknown',
      screenshot: screenshotPath || 'not available',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Close browser on error with logging
    if (browser) {
      await browser.close().catch((err) => {
        const errMsg = err instanceof Error ? err.message : 'Unknown';
        console.warn(`[Scraper] Browser close failed: ${errMsg}`);
      });
    }

    return {
      success: false,
      documents: [],
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  } finally {
    // Cleanup temp files (but keep browser open on success!)
    try {
      if (keyPath && fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
      }
      if (cerPath && fs.existsSync(cerPath)) {
        fs.unlinkSync(cerPath);
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}
