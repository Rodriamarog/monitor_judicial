import axios from 'axios';
import https from 'https';

async function main() {
  const agent = new https.Agent({ rejectUnauthorized: false });
  const url = 'https://www.pjbc.gob.mx/boletinj/2026/my_html/ti260611.htm';
  const r = await axios.get(url, { httpsAgent: agent, responseType: 'arraybuffer', validateStatus: (s: number) => s < 500 });
  console.log('Status:', r.status);
  console.log('Content-Type:', r.headers['content-type']);
  const first512latin = Buffer.from(r.data).slice(0, 512).toString('latin1');
  console.log('\nFirst 512 bytes (latin1):\n', first512latin);
  const hasUtf8Meta = first512latin.toLowerCase().includes('charset=utf-8');
  const hasWin1252Meta = first512latin.toLowerCase().includes('charset=windows-1252') || first512latin.toLowerCase().includes('charset=iso-8859');
  console.log('\nHas UTF-8 meta:', hasUtf8Meta);
  console.log('Has Windows-1252/ISO-8859 meta:', hasWin1252Meta);
}

main();

async function compareDecodings() {
  const { BULLETIN_SOURCES, scrapeBulletin } = await import('../lib/scraper');
  const source = BULLETIN_SOURCES[0]; // Tijuana

  // Current behavior (windows-1252 per meta)
  const result = await scrapeBulletin('2026-06-11', source);
  const corrupted = result.entries.filter(e => /Ã/.test(e.raw_text)).length;
  const accented = result.entries.filter(e => /[ÁÉÍÓÚÜÑáéíóúüñ]/.test(e.raw_text)).length;
  console.log(`\nWindows-1252 decode: ${accented} correct accents, ${corrupted} corrupted`);
  console.log('Sample corrupted:', result.entries.find(e => /Ã/.test(e.raw_text))?.raw_text);
}

compareDecodings();
