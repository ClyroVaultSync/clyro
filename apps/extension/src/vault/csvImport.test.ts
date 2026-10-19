import { describe, it, expect } from "vitest";
import type { VaultItem } from "@clyro/shared-types";
import { decodeCsvFile, parseCsv, planImport, type ImportPlan } from "./csvImport";

// Every fixture below is fake data in the shape each password manager exports.

const NOW = "2026-10-19T12:00:00.000Z";

function plan(csv: string, existing: VaultItem[] = []): ImportPlan {
  const result = planImport(csv, existing, NOW);
  if ("error" in result) throw new Error(`unexpected error: ${result.error}`);
  return result;
}

function item(fields: Partial<VaultItem>): VaultItem {
  return { id: "existing", name: "", url: "", username: "", password: "", createdAt: NOW, updatedAt: NOW, ...fields };
}

describe("parseCsv", () => {
  it("splits rows and fields, keeping empty fields", () => {
    expect(parseCsv("a,b,c\n1,,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "", "3"],
    ]);
  });

  it("handles quoted delimiters, line breaks and doubled quotes", () => {
    expect(parseCsv('name,note\n"Acme, Inc.","line one\nline ""two"""')).toEqual([
      ["name", "note"],
      ["Acme, Inc.", 'line one\nline "two"'],
    ]);
  });

  it("accepts CRLF and a byte-order mark, and drops blank lines", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n\r\n3,4\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("detects semicolon and tab delimiters from the header line", () => {
    expect(parseCsv("a;b\n1,5;2")).toEqual([
      ["a", "b"],
      ["1,5", "2"],
    ]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("decodeCsvFile", () => {
  it("decodes UTF-8 and drops its byte-order mark", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("a,b")]);
    expect(decodeCsvFile(bytes)).toEqual({ text: "a,b" });
  });

  it("decodes UTF-16 with a byte-order mark", () => {
    const bytes = new Uint8Array([0xff, 0xfe, 0x61, 0x00, 0x2c, 0x00, 0x62, 0x00]);
    expect(decodeCsvFile(bytes)).toEqual({ text: "a,b" });
  });

  it("explains that a zip or Excel workbook isn't a CSV", () => {
    const result = decodeCsvFile(new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
    expect("error" in result && result.error).toMatch(/zip or Excel/);
  });
});

describe("planImport", () => {
  it.each([
    [
      "Chrome, Edge and Brave",
      "name,url,username,password,note\nExample,https://www.example.com/login,frank,pw1,",
      { name: "Example", url: "https://www.example.com/login", username: "frank", password: "pw1" },
    ],
    [
      "Firefox, which has no name column",
      '"url","username","password","httpRealm","formActionOrigin","guid","timeCreated","timeLastUsed","timePasswordChanged"\n' +
        '"https://accounts.example.org","gina","pw2",,"https://accounts.example.org","{a1}","1","2","3"',
      { name: "accounts.example.org", url: "https://accounts.example.org", username: "gina", password: "pw2" },
    ],
    [
      "Bitwarden",
      "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n" +
        ",,login,Forum,,,0,https://forum.example.net,hank,pw3,",
      { name: "Forum", url: "https://forum.example.net", username: "hank", password: "pw3" },
    ],
    [
      "LastPass",
      "url,username,password,totp,extra,name,grouping,fav\nhttps://shop.example.com,ivy,pw4,,remember the PIN,Shop,Shopping,0",
      { name: "Shop", url: "https://shop.example.com", username: "ivy", password: "pw4", notes: "remember the PIN" },
    ],
    [
      "Safari",
      "Title,URL,Username,Password,Notes,OTPAuth\nMail,https://mail.example.com,jo,pw5,,",
      { name: "Mail", url: "https://mail.example.com", username: "jo", password: "pw5" },
    ],
    [
      "KeePassXC",
      '"Group","Title","Username","Password","URL","Notes","TOTP","Icon","Last Modified","Created"\n' +
        '"Root","Router","admin","pw6","http://192.168.1.1","","","0","",""',
      { name: "Router", url: "http://192.168.1.1", username: "admin", password: "pw6" },
    ],
    [
      "RoboForm",
      "Name,Url,MatchUrl,Login,Pwd,Note,Folder,RfFieldsV2\nBank,https://bank.example.com,https://bank.example.com,lee,pw7,,/Finance,",
      { name: "Bank", url: "https://bank.example.com", username: "lee", password: "pw7" },
    ],
  ])("reads %s exports", (_manager, csv, expected) => {
    const result = plan(csv);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject(expected);
  });

  it("reads Dashlane's current layout, filling gaps from the other columns", () => {
    const result = plan(
      [
        "user_name,user_name_2,user_name_3,title,password,note,url,category,otp",
        "alice@example.com,,,GitHub,pw-gh,,https://github.com,,null",
        ",bob,,amazon.in,pw-amz,,,,null",
        "carol,carol@example.com,,Bank,pw-bank,,,,null",
        "dave,,,Old note,,,,,null",
        "alice@example.com,,,GitHub,pw-gh,,https://github.com,,null",
      ].join("\n"),
    );

    expect(result.items.map(({ name, url, username, notes }) => ({ name, url, username, notes }))).toEqual([
      { name: "GitHub", url: "https://github.com", username: "alice@example.com", notes: undefined },
      { name: "amazon.in", url: "amazon.in", username: "bob", notes: undefined },
      { name: "Bank", url: "", username: "carol", notes: "Other login: carol@example.com" },
    ]);
    expect(result).toMatchObject({ skippedNoPassword: 1, duplicates: 1, withoutWebsite: 1, otpKept: 0 });
  });

  it("reads Dashlane's older layout and keeps a real 2FA key in the notes", () => {
    const result = plan(
      "username,username2,username3,title,password,note,url,category,otpSecret\n" +
        "erin,,,Mail,pw-mail,keep this,https://mail.example.com,Email,JBSWY3DPEHPK3PXP",
    );
    expect(result.items[0].notes).toBe("keep this\n2FA setup key: JBSWY3DPEHPK3PXP");
    expect(result.otpKept).toBe(1);
  });

  it("prefers the username column over email in Proton Pass exports, keeping the email", () => {
    const result = plan(
      "name,url,email,username,password,note,totp,createTime,modifyTime,vault\n" +
        "Portal,https://portal.example.com,kim@example.com,kim,pw8,,,1,2,Personal",
    );
    expect(result.items[0]).toMatchObject({ username: "kim", notes: "Other login: kim@example.com" });
  });

  it("keeps a 1Password otpauth link in the notes", () => {
    const result = plan(
      '"Title","Url","Username","Password","OTPAuth","Favorite","Archived","Tags","Notes"\n' +
        '"Cloud","https://cloud.example.com","jack","pw9","otpauth://totp/Cloud:jack?secret=ABC","false","false","",""',
    );
    expect(result.items[0].notes).toBe("2FA setup key: otpauth://totp/Cloud:jack?secret=ABC");
    expect(result.otpKept).toBe(1);
  });

  it("skips rows without a password, such as secure notes and cards", () => {
    const result = plan(
      "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n" +
        ",,note,Recipe,secret recipe,,0,,,,\n" +
        ",,card,Visa,,,0,,,,",
    );
    expect(result).toMatchObject({ items: [], skippedNoPassword: 2 });
  });

  it("skips logins already in the vault, whatever form their address takes", () => {
    const existing = [item({ url: "https://www.github.com", username: "alice", password: "pw1" })];
    const result = plan(
      "name,url,username,password\n" +
        "GitHub,github.com/login,alice,pw1\n" +
        "GitHub sign-in,https://accounts.github.com,alice,pw1\n" +
        "GitHub,https://github.com,alice,newer-pw",
      existing,
    );
    expect(result.duplicates).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].password).toBe("newer-pw");
  });

  it("never trims passwords", () => {
    expect(plan("name,url,username,password\nA,https://a.example.com,u, pad ").items[0].password).toBe(" pad ");
  });

  it("names a login from its address, then its username, when the export has no name", () => {
    const result = plan('"url","username","password"\n"https://www.example.com/x","u1","p1"\n"","u2","p2"\n"","","p3"');
    expect(result.items.map((imported) => imported.name)).toEqual(["example.com", "u2", "Imported login"]);
  });

  it("gives every item a fresh id and the import time", () => {
    const result = plan("name,url,username,password\nA,https://a.example.com,u,p1\nB,https://b.example.com,u,p2");
    expect(new Set(result.items.map((imported) => imported.id)).size).toBe(2);
    expect(result.items.every((imported) => imported.createdAt === NOW && imported.updatedAt === NOW)).toBe(true);
  });

  it("rejects files that aren't password exports", () => {
    expect(planImport("", [], NOW)).toEqual({ error: "That file is empty." });
    expect(planImport("first,last\nAda,Lovelace", [], NOW)).toMatchObject({ error: expect.stringMatching(/password column/) });
  });
});
