import { getConfig } from './config';
import { loginToTribunal } from './login';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('='.repeat(60));
  console.log('Tribunal Electrónico PJBC - Automated Login');
  console.log('='.repeat(60));
  console.log();

  try {
    // Create screenshots directory if it doesn't exist
    const screenshotsDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      console.log('Created screenshots directory');
    }

    // Load configuration
    console.log('Loading configuration from .env file...');
    const config = getConfig();
    console.log(`Email: ${config.email}`);
    console.log(`Certificate: ${config.cerPath}`);
    console.log(`Private Key: ${config.keyPath}`);
    console.log(`Login URL: ${config.loginUrl}`);
    console.log();

    // Attempt login
    await loginToTribunal(config);

    console.log();
    console.log('='.repeat(60));
    console.log('Process completed successfully!');
    console.log('Check the screenshots folder for visual confirmation.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('='.repeat(60));
    console.error('FATAL ERROR:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('='.repeat(60));
    process.exit(1);
  }
}

main();
