const fs = require("fs");
const path = require("path");

const siteDir = path.resolve(__dirname, "..", "site");
const expectedPages = [
  "index.html",
  "about.html",
  "programs.html",
  "trainers.html",
  "pricing.html",
  "contact.html",
];
const errors = [];

for (const page of expectedPages) {
  const filePath = path.join(siteDir, page);
  if (!fs.existsSync(filePath)) {
    errors.push(`Thiếu trang: ${page}`);
    continue;
  }

  const html = fs.readFileSync(filePath, "utf8");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

  if (duplicateIds.length) {
    errors.push(`${page}: ID bị trùng (${[...new Set(duplicateIds)].join(", ")})`);
  }

  for (const targetPage of expectedPages) {
    if (!html.includes(`href="${targetPage}"`)) {
      errors.push(`${page}: menu thiếu liên kết đến ${targetPage}`);
    }
  }

  const references = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|mailto:|tel:|#|data:)/.test(reference)) continue;
    const cleanReference = reference.split(/[?#]/)[0];
    const resolved = path.resolve(path.dirname(filePath), cleanReference);
    if (!fs.existsSync(resolved)) {
      errors.push(`${page}: không tìm thấy ${reference}`);
    }
  }
}

const cssPath = path.join(siteDir, "assets", "css", "styles.css");
const css = fs.readFileSync(cssPath, "utf8");
for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  const reference = match[1];
  if (/^(?:https?:|data:)/.test(reference)) continue;
  const resolved = path.resolve(path.dirname(cssPath), reference);
  if (!fs.existsSync(resolved)) errors.push(`CSS: không tìm thấy ${reference}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Kiểm tra đạt: đủ 6 trang, menu đầy đủ, không có liên kết hoặc tài nguyên cục bộ bị hỏng.");
