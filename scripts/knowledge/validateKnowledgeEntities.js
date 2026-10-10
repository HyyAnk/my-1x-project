import fs from "node:fs";

const VIETNAMESE_ACCENT_REGEX =
  /[\u00E0\u00E1\u1EA1\u1EA3\u00E3\u00E2\u1EA7\u1EA5\u1EAD\u1EA9\u1EAB\u0103\u1EB1\u1EAF\u1EB7\u1EB3\u1EB5\u00E8\u00E9\u1EB9\u1EBB\u1EBD\u00EA\u1EC1\u1EBF\u1EC7\u1EC3\u1EC5\u00EC\u00ED\u1ECB\u1EC9\u0129\u00F2\u00F3\u1ECD\u1ECF\u00F5\u00F4\u1ED3\u1ED1\u1ED9\u1ED5\u1ED7\u01A1\u1EDD\u1EDB\u1EE3\u1EDF\u1EE1\u00F9\u00FA\u1EE5\u1EE7\u0169\u01B0\u1EEB\u1EE9\u1EF1\u1EED\u1EEF\u1EF3\u00FD\u1EF5\u1EF7\u1EF9\u0111\u00C0\u00C1\u1EA0\u1EA2\u00C3\u00C2\u1EA6\u1EA4\u1EAC\u1EA8\u1EAA\u0102\u1EB0\u1EAE\u1EB6\u1EB2\u1EB4\u00C8\u00C9\u1EB8\u1EBA\u1EBC\u00CA\u1EC0\u1EBE\u1EC6\u1EC2\u1EC4\u00CC\u00CD\u1ECA\u1EC8\u0128\u00D2\u00D3\u1ECC\u1ECE\u00D5\u00D4\u1ED2\u1ED0\u1ED8\u1ED4\u1ED6\u01A0\u1EDC\u1EDA\u1EE2\u1EDE\u1EE0\u00D9\u00DA\u1EE4\u1EE6\u0168\u01AF\u1EEA\u1EE8\u1EF0\u1EEC\u1EEE\u1EF2\u00DD\u1EF4\u1EF6\u1EF8\u0110]/;

export function validateEntities(entities, expectedDomainId) {
  const errors = [];
  if (!Array.isArray(entities)) {
    return ["Expected an array of entities"];
  }

  const seenIds = new Set();
  const validVerdicts = new Set(["fact", "myth", "true", "false"]);

  entities.forEach((ent, index) => {
    const prefix = `[Entity #${index + 1} (${ent?.id || "NO_ID"})]`;
    if (!ent.id || !/^ENT-[A-Z]{3}-[0-9]{3,}$/.test(ent.id)) {
      errors.push(`${prefix} Invalid ID format: "${ent.id}". Must match ^ENT-[A-Z]{3}-[0-9]{3,}$`);
    }
    if (seenIds.has(ent.id)) {
      errors.push(`${prefix} Duplicate ID: "${ent.id}"`);
    }
    seenIds.add(ent.id);

    if (!ent.domain_id || typeof ent.domain_id !== "string") {
      errors.push(`${prefix} Missing or invalid domain_id`);
    } else if (expectedDomainId && ent.domain_id !== expectedDomainId) {
      errors.push(`${prefix} domain_id "${ent.domain_id}" does not match expected "${expectedDomainId}"`);
    }

    if (!ent.subtopic_id || typeof ent.subtopic_id !== "string") {
      errors.push(`${prefix} Missing or invalid subtopic_id`);
    }
    if (!ent.name || typeof ent.name !== "string") {
      errors.push(`${prefix} Missing or invalid name`);
    }
    if (ent.language !== "en") {
      errors.push(`${prefix} Language must be 'en', got: "${ent.language}"`);
    }
    if (!ent.visual_anchor || typeof ent.visual_anchor !== "string" || ent.visual_anchor.trim().length < 15) {
      errors.push(`${prefix} Missing or insufficient visual_anchor (min 15 chars)`);
    }
    if (!Array.isArray(ent.core_traits) || ent.core_traits.length < 2 || ent.core_traits.length > 6) {
      errors.push(`${prefix} core_traits must be an array of 2 to 6 strings`);
    }
    if (!Array.isArray(ent.facts_and_myths) || ent.facts_and_myths.length === 0) {
      errors.push(`${prefix} facts_and_myths must be a non-empty array`);
    } else {
      ent.facts_and_myths.forEach((fm, fIdx) => {
        if (!fm.claim || typeof fm.claim !== "string") {
          errors.push(`${prefix} facts_and_myths[${fIdx}] missing claim`);
        }
        if (!validVerdicts.has(fm.verdict)) {
          errors.push(`${prefix} facts_and_myths[${fIdx}] invalid verdict "${fm.verdict}". Must be fact/myth/true/false`);
        }
        if (!fm.explanation || typeof fm.explanation !== "string") {
          errors.push(`${prefix} facts_and_myths[${fIdx}] missing explanation`);
        }
      });
    }

    // Check strict English/no accented characters
    const jsonStr = JSON.stringify(ent);
    if (VIETNAMESE_ACCENT_REGEX.test(jsonStr)) {
      errors.push(`${prefix} Contains prohibited accented characters. Must be pure ASCII English.`);
    }
  });

  return errors;
}

if (process.argv[1] && process.argv[1].endsWith("validateKnowledgeEntities.js")) {
  const targetPath = process.argv[2];
  if (!targetPath || !fs.existsSync(targetPath)) {
    console.error(`Please provide a valid file path.`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(targetPath, "utf8"));
  const errs = validateEntities(data);
  if (errs.length > 0) {
    console.error(`Validation failed with ${errs.length} errors:\n` + errs.slice(0, 20).join("\n"));
    process.exit(1);
  } else {
    console.log(`Validation PASSED: ${data.length} entities verified successfully.`);
  }
}
