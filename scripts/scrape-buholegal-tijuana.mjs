import * as cheerio from "cheerio";
import { writeFile } from "node:fs/promises";

const BASE_URL = "https://buholegal.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36";
const OUTPUT = "buholegal_tijuana_abogados.csv";
const DELAY_MS = 250;
const PROFILE_CONCURRENCY = 3;

let cookie = "";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeCookies(headers) {
  const setCookie =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie")
        ? [headers.get("set-cookie")]
        : [];

  if (!setCookie.length) {
    return;
  }

  const existing = new Map(
    cookie
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...value] = part.split("=");
        return [name, value.join("=")];
      }),
  );

  for (const raw of setCookie) {
    const pair = raw.split(";")[0];
    const [name, ...value] = pair.split("=");
    if (name && value.length) {
      existing.set(name, value.join("="));
    }
  }

  cookie = [...existing].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    ...options,
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
  });
  mergeCookies(response.headers);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function absoluteUrl(path) {
  return new URL(path, BASE_URL).toString();
}

function extractCsrf(html) {
  const $ = cheerio.load(html);
  const token = $('input[name="csrfmiddlewaretoken"]').first().attr("value");
  if (!token) {
    throw new Error("Could not find CSRF token on directory form.");
  }
  return token;
}

function parseDirectoryProfiles(html) {
  const $ = cheerio.load(html);
  const profiles = new Map();

  $('a[href^="/abogado/"]').each((_, link) => {
    const href = $(link).attr("href");
    const name = cleanText($(link).find("h3").text());
    const id = href?.match(/\/abogado\/([^/]+)\//)?.[1] || "";

    if (href && name) {
      profiles.set(href, {
        id,
        name,
        profileUrl: absoluteUrl(href),
      });
    }
  });

  return [...profiles.values()];
}

function parseMaxPage(html) {
  const pages = [...html.matchAll(/[?&]page=(\d+)/g)].map((match) => Number(match[1]));
  return pages.length ? Math.max(...pages) : 1;
}

async function fetchDirectoryPage(page, csrfToken) {
  const body = new URLSearchParams({
    csrfmiddlewaretoken: csrfToken,
    estado: "Baja California",
    ciudad: "Tijuana",
    especialidad: "Cualquier",
  });

  return request(`${BASE_URL}/buscar_directorio_estado?page=${page}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: BASE_URL,
      Referer: `${BASE_URL}/buscar_directorio_estado?page=${page}`,
    },
    body,
  });
}

function fieldValue($, selector) {
  return cleanText($(selector).first().attr("value"));
}

function parseProfile(html, directoryRecord) {
  const $ = cheerio.load(html);
  const pageTitleName = cleanText($("h1").first().text()) || directoryRecord.name;

  const visibleText = cleanText($("body").text());
  const visiblePhone = visibleText.match(/Tel[ée]fono:\s*([^W]+?)(?:WhatsApp:|C\.P\.|$)/i)?.[1];
  const visibleWhatsapp = visibleText.match(/WhatsApp:\s*([^C]+?)(?:C\.P\.|Contactar|$)/i)?.[1];

  const addressParts = [
    fieldValue($, "#direccion_contacto"),
    fieldValue($, "#cp_contacto"),
    fieldValue($, "#ciudad_contacto"),
    $('select[name="estado"] option')
      .first()
      .text()
      .trim(),
  ].filter(Boolean);

  const whatsappHref = $('a[href*="api.whatsapp.com/send"]').first().attr("href") || "";
  const whatsappDigits = new URL(whatsappHref || "https://example.com").searchParams.get("phone") || "";

  return {
    cedula: directoryRecord.id,
    name: pageTitleName,
    phone: fieldValue($, "#telefono_contacto") || cleanText(visiblePhone),
    whatsapp: fieldValue($, "#whatsapp") || cleanText(visibleWhatsapp),
    whatsapp_digits: whatsappDigits,
    email: fieldValue($, "#correo_contacto"),
    address: addressParts.join(", "),
    street: fieldValue($, "#direccion_contacto"),
    postal_code: fieldValue($, "#cp_contacto"),
    city: fieldValue($, "#ciudad_contacto"),
    state: $('select[name="estado"] option').first().text().trim(),
    profile_url: directoryRecord.profileUrl,
  };
}

async function mapConcurrent(items, limit, mapper) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function main() {
  const startHtml = await request(`${BASE_URL}/buscar_directorio_estado?page=1`);
  const csrfToken = extractCsrf(startHtml);

  const firstResultsHtml = await fetchDirectoryPage(1, csrfToken);
  let maxPage = parseMaxPage(firstResultsHtml);
  const profileMap = new Map();

  for (let page = 1; page <= maxPage; page += 1) {
    const html = page === 1 ? firstResultsHtml : await fetchDirectoryPage(page, csrfToken);
    maxPage = Math.max(maxPage, parseMaxPage(html));

    const profiles = parseDirectoryProfiles(html);
    for (const profile of profiles) {
      profileMap.set(profile.profileUrl, profile);
    }

    console.log(`Directory page ${page}/${maxPage}: ${profiles.length} profiles`);

    if (profiles.length === 0) {
      break;
    }

    await sleep(DELAY_MS);
  }

  const profiles = [...profileMap.values()];
  console.log(`Found ${profiles.length} unique Tijuana profile links.`);

  const records = await mapConcurrent(profiles, PROFILE_CONCURRENCY, async (profile, index) => {
    await sleep(DELAY_MS);
    const html = await request(profile.profileUrl, {
      headers: {
        Referer: `${BASE_URL}/buscar_directorio_estado?page=1`,
      },
    });
    const record = parseProfile(html, profile);
    console.log(`Profile ${index + 1}/${profiles.length}: ${record.name}`);
    return record;
  });

  const columns = [
    "cedula",
    "name",
    "phone",
    "whatsapp",
    "whatsapp_digits",
    "email",
    "address",
    "street",
    "postal_code",
    "city",
    "state",
    "profile_url",
  ];
  const csv = [
    columns.join(","),
    ...records.map((record) => columns.map((column) => csvEscape(record[column])).join(",")),
  ].join("\n");

  await writeFile(OUTPUT, `\uFEFF${csv}`, "utf8");
  console.log(`Wrote ${records.length} rows to ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
