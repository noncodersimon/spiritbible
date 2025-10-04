// Simple copy to make UK_MAP importable from CJS scripts
const fs = require("fs");
const path = require("path");

const src = path.join(process.cwd(), "src", "lib", "ukSpelling.ts");
const outDir = path.join(process.cwd(), "scripts", "dist");
const out = path.join(outDir, "ukMapBundle.js");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// A quick-and-dirty transform: replace "export const UK_MAP" with "exports.UK_MAP ="
const ts = fs.readFileSync(src, "utf8");
const js = ts
  .replace(/export const UK_MAP:/, "const UK_MAP:")
  .replace(/export const UK_MAP =/, "const UK_MAP =")
  + "\nmodule.exports = { UK_MAP };";

fs.writeFileSync(out, js);
console.log("Built scripts/dist/ukMapBundle.js");
