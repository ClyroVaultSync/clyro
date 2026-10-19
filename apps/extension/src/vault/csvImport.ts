import type { VaultItem } from "@clyro/shared-types";
import { extractDomain, siteOf } from "../services/domains";

/**
 * Turns the CSV another password manager exports (Dashlane, Chrome, Bitwarden,
 * LastPass, 1Password, …) into vault items. Everything here is pure: ImportView
 * reads the file and saves the result through the normal SAVE_VAULT_CHANGE path,
 * so the file's plaintext never reaches storage, the network or the console from
 * this module.
 */

/** What an import would add, and what it leaves out. Shown before anything is saved. */
export interface ImportPlan {
  items: VaultItem[];
  /** Rows with no password: secure notes, cards, or logins kept without one. */
  skippedNoPassword: number;
  /** Same site, username and password as an item already in the vault, or as an earlier row. */
  duplicates: number;
  /** Imported, but with no website address, so they won't autofill until one is added. */
  withoutWebsite: number;
  /** 2FA setup keys kept in the item's notes, since Clyro doesn't generate 2FA codes. */
  otpKept: number;
}

/**
 * The header names each field is recognised by, compared after lowercasing and
 * dropping everything but letters and digits ("user_name_2" → "username2").
 * Earlier names win. Every username column is read, so a second login isn't lost.
 */
const COLUMNS = {
  name: ["title", "name"],
  url: ["url", "loginuri", "website", "uri", "hostname"],
  username: ["username", "loginusername", "login", "email", "username2", "username3"],
  password: ["password", "loginpassword", "pwd"],
  notes: ["note", "notes", "extra"],
  otp: ["otp", "otpsecret", "otpauth", "otpurl", "totp", "logintotp"],
};

/** A title like "amazon.in" or "https://github.com/login", usable as the address. */
const DOMAIN_LIKE = /^(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#]\S*)?$/i;

/** What Dashlane writes in its 2FA column for a login without a 2FA key. */
const NO_OTP = "null";

/**
 * Decodes the chosen file. UTF-8 is the norm, and a UTF-16 byte-order mark
 * (Excel's "Unicode text") is honoured. A zip signature means an Excel workbook
 * or a zipped export, neither of which is a CSV.
 */
export function decodeCsvFile(bytes: Uint8Array): { text: string } | { error: string } {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return {
      error:
        "That's a zip or Excel file, not a CSV. If your password manager gave you a .zip, unzip it and choose the .csv inside (Dashlane's is credentials.csv).",
    };
  }
  const encoding =
    bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
  return { text: new TextDecoder(encoding).decode(bytes) };
}

/**
 * Splits CSV text into rows of fields, following RFC 4180: a quoted field may
 * hold the delimiter, line breaks and doubled quotes. The delimiter (comma,
 * semicolon or tab) is whichever appears most in the first line, since Excel
 * saves CSVs with semicolons in some regions. Blank lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const input = text.startsWith("﻿") ? text.slice(1) : text;
  const delimiter = detectDelimiter(input);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const endRow = () => {
    row.push(field);
    if (row.some((cell) => cell !== "")) rows.push(row);
    row = [];
    field = "";
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (input[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      endRow();
    } else {
      field += char;
    }
  }
  endRow();
  return rows;
}

function detectDelimiter(text: string): string {
  const lineEnd = text.search(/[\r\n]/);
  const firstLine = lineEnd === -1 ? text : text.slice(0, lineEnd);
  const count = (delimiter: string) => firstLine.split(delimiter).length - 1;
  return [";", "\t"].reduce((best, candidate) => (count(candidate) > count(best) ? candidate : best), ",");
}

/**
 * Maps an export's rows to new vault items. Never touches the existing items:
 * a row matching one of them (same site, username and password) is counted as
 * a duplicate and left out, and anything else is added alongside.
 */
export function planImport(text: string, existingItems: VaultItem[], now: string): ImportPlan | { error: string } {
  const [header, ...rows] = parseCsv(text);
  if (!header) return { error: "That file is empty." };

  const keys = header.map((cell) => cell.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const columnsFor = (names: string[]) => names.map((name) => keys.indexOf(name)).filter((index) => index !== -1);
  const [nameColumn] = columnsFor(COLUMNS.name);
  const [urlColumn] = columnsFor(COLUMNS.url);
  const [passwordColumn] = columnsFor(COLUMNS.password);
  const [notesColumn] = columnsFor(COLUMNS.notes);
  const [otpColumn] = columnsFor(COLUMNS.otp);
  const usernameColumns = columnsFor(COLUMNS.username);

  if (passwordColumn === undefined || (urlColumn === undefined && nameColumn === undefined)) {
    return {
      error: "This doesn't look like a password export. Clyro needs a password column, plus a website or name column.",
    };
  }

  const seen = new Set(existingItems.map((item) => duplicateKey(item.url, item.username, item.password)));
  const plan: ImportPlan = { items: [], skippedNoPassword: 0, duplicates: 0, withoutWebsite: 0, otpKept: 0 };

  for (const row of rows) {
    const field = (column: number | undefined) => (column === undefined ? "" : (row[column] ?? "").trim());
    // Not trimmed: leading or trailing spaces can be part of a password.
    const password = row[passwordColumn] ?? "";
    if (!password) {
      plan.skippedNoPassword++;
      continue;
    }

    const usernames = [...new Set(usernameColumns.map(field).filter(Boolean))];
    const username = usernames[0] ?? "";
    let name = field(nameColumn);
    let url = field(urlColumn);
    if (!url && DOMAIN_LIKE.test(name)) url = name;
    if (!name) name = (url && extractDomain(url)) || username || "Imported login";

    const key = duplicateKey(url, username, password);
    if (seen.has(key)) {
      plan.duplicates++;
      continue;
    }
    seen.add(key);

    const otp = field(otpColumn);
    const hasOtp = otp !== "" && otp.toLowerCase() !== NO_OTP;
    const notes = [
      field(notesColumn),
      ...usernames.slice(1).map((other) => `Other login: ${other}`),
      ...(hasOtp ? [`2FA setup key: ${otp}`] : []),
    ]
      .filter(Boolean)
      .join("\n");

    if (hasOtp) plan.otpKept++;
    if (!url) plan.withoutWebsite++;
    plan.items.push({
      id: crypto.randomUUID(),
      name,
      url,
      username,
      password,
      notes: notes || undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  return plan;
}

function duplicateKey(url: string, username: string, password: string): string {
  return [siteOf(url), username, password].join("\n");
}
