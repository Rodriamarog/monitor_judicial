/**
 * Tribunal Electrónico Connection Tester
 * Tests credentials with Puppeteer and provides feedback
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

puppeteer.use(StealthPlugin());

export interface TestConnectionParams {
  email: string;
  password: string;
  keyFileBase64: string;
  cerFileBase64: string;
  onProgress?: (message: string) => void;
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
}

/**
 * Test connection with Tribunal Electrónico
 */
export async function testTribunalConnection(
  params: TestConnectionParams
): Promise<TestConnectionResult> {
  const { email, password, keyFileBase64, cerFileBase64 } = params;

  let browser: Browser | null = null;
  let keyPath: string | null = null;
  let cerPath: string | null = null;

  try {
    // Create temporary files
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    keyPath = path.join(tempDir, `tribunal_test_${timestamp}.key`);
    cerPath = path.join(tempDir, `tribunal_test_${timestamp}.cer`);

    // Write base64 files to temp location
    fs.writeFileSync(keyPath, Buffer.from(keyFileBase64, 'base64'));
    fs.writeFileSync(cerPath, Buffer.from(cerFileBase64, 'base64'));

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: {
        width: 1920,
        height: 1080
      },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Navigate to login page
    const loginUrl = 'https://sjpo.pjbc.gob.mx/TribunalElectronico/login.aspx?ReturnUrl=%2ftribunalelectronico%2fdefault.aspx%3fver%3d1.2.4&ver=1.2.4';
    await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Fill in email
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
        await page.type(selector, email, { delay: 50 });
        emailFilled = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!emailFilled) {
      throw new Error('No se pudo encontrar el campo de correo electrónico');
    }

    // Fill in password
    const passwordSelector = 'input[type="password"]';
    await page.waitForSelector(passwordSelector, { visible: true, timeout: 5000 });
    await page.type(passwordSelector, password, { delay: 50 });

    // Upload files
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length < 2) {
      throw new Error('No se encontraron los campos para subir archivos .key y .cer');
    }

    await fileInputs[0].uploadFile(keyPath);
    await page.waitForTimeout(1000);
    await fileInputs[1].uploadFile(cerPath);
    await page.waitForTimeout(1000);

    // Click login button
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

    // Wait for navigation or error
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
      page.waitForSelector('.error, .alert-danger, .mensaje-error', { timeout: 15000 }).catch(() => null)
    ]);

    await page.waitForTimeout(2000);

    // Check for error messages
    const errorMessage = await page.$eval('.error, .alert-danger, .mensaje-error',
      el => el.textContent).catch(() => null);

    if (errorMessage) {
      throw new Error(`Error de autenticación: ${errorMessage}`);
    }

    // Check if we're logged in
    const currentUrl = page.url();
    if (currentUrl.includes('default.aspx') || currentUrl.includes('home') ||
        currentUrl.includes('dashboard') || currentUrl.includes('bienvenida')) {
      return { success: true };
    } else {
      throw new Error('No se pudo verificar el inicio de sesión. Revisa tus credenciales.');
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  } finally {
    // Cleanup
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (keyPath && fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
    }
    if (cerPath && fs.existsSync(cerPath)) {
      fs.unlinkSync(cerPath);
    }
  }
}

/**
 * Test connection with streaming progress updates
 */
export async function testTribunalConnectionStream(
  params: TestConnectionParams
): Promise<TestConnectionResult> {
  const { onProgress } = params;

  onProgress?.('Iniciando navegador...');

  // We'll enhance this by adding progress callbacks throughout
  const enhancedParams = {
    ...params,
    onProgress: (msg: string) => {
      console.log(`[Test] ${msg}`);
      onProgress?.(msg);
    }
  };

  onProgress?.('Validando credenciales...');

  try {
    const result = await testTribunalConnection(enhancedParams);

    if (result.success) {
      onProgress?.('✓ Conexión exitosa');
    } else {
      onProgress?.(`✗ Error: ${result.error}`);
    }

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
    onProgress?.(`✗ Error: ${errorMsg}`);
    return {
      success: false,
      error: errorMsg
    };
  }
}
