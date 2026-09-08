const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(__dirname, "..", "site");
const outputDir = path.resolve(__dirname, "..", "dist");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.cpSync(sourceDir, outputDir, { recursive: true });

console.log("Đã tạo bản website hoàn chỉnh trong thư mục dist.");
