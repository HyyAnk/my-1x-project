import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const suppressionsPath = path.join(root, "eslint-suppressions.json");

if (!fs.existsSync(suppressionsPath)) {
  console.error("❌ Error: eslint-suppressions.json does not exist.");
  process.exit(1);
}

try {
  const content = fs.readFileSync(suppressionsPath, "utf8");
  const data = JSON.parse(content);
  const keys = Object.keys(data);

  if (keys.length > 0) {
    let totalSuppressions = 0;
    for (const file of keys) {
      const fileRules = data[file];
      if (typeof fileRules === "object" && fileRules !== null) {
        for (const rule of Object.keys(fileRules)) {
          totalSuppressions += fileRules[rule]?.count ?? 1;
        }
      } else {
        totalSuppressions += 1;
      }
    }
    console.error(`❌ ESLint Suppressions Ratchet Gate FAILED:`);
    console.error(`   Found ${keys.length} file(s) with ${totalSuppressions} suppression(s) in eslint-suppressions.json.`);
    console.error(`   Technical debt suppressions are strictly prohibited. The file must remain completely empty ({}).`);
    process.exit(1);
  }

  console.log("✅ ESLint Suppressions Ratchet Gate PASSED: eslint-suppressions.json is completely empty (0 suppressions).");
  process.exit(0);
} catch (err) {
  console.error(`❌ Error reading or parsing eslint-suppressions.json: ${err.message}`);
  process.exit(1);
}
