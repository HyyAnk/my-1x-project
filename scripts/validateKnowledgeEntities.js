import fs from 'node:fs';
import path from 'node:path';

const VIETNAMESE_ACCENT_REGEX = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;

export function validateEntities(entities, expectedDomainId) {
  const errors = [];
  if (!Array.isArray(entities)) {
    return ['Expected an array of entities'];
  }

  const seenIds = new Set();
  const validVerdicts = new Set(['fact', 'myth', 'true', 'false']);

  entities.forEach((ent, index) => {
    const prefix = `[Entity #${index + 1} (${ent?.id || 'NO_ID'})]`;
    if (!ent.id || !/^ENT-[A-Z]{3}-[0-9]{3,}$/.test(ent.id)) {
      errors.push(`${prefix} Invalid ID format: "${ent.id}". Must match ^ENT-[A-Z]{3}-[0-9]{3,}$`);
    }
    if (seenIds.has(ent.id)) {
      errors.push(`${prefix} Duplicate ID: "${ent.id}"`);
    }
    seenIds.add(ent.id);

    if (!ent.domain_id || typeof ent.domain_id !== 'string') {
      errors.push(`${prefix} Missing or invalid domain_id`);
    } else if (expectedDomainId && ent.domain_id !== expectedDomainId) {
      errors.push(`${prefix} domain_id "${ent.domain_id}" does not match expected "${expectedDomainId}"`);
    }

    if (!ent.subtopic_id || typeof ent.subtopic_id !== 'string') {
      errors.push(`${prefix} Missing or invalid subtopic_id`);
    }
    if (!ent.name || typeof ent.name !== 'string') {
      errors.push(`${prefix} Missing or invalid name`);
    }
    if (ent.language !== 'en') {
      errors.push(`${prefix} Language must be 'en', got: "${ent.language}"`);
    }
    if (!ent.visual_anchor || typeof ent.visual_anchor !== 'string' || ent.visual_anchor.trim().length < 15) {
      errors.push(`${prefix} Missing or insufficient visual_anchor (min 15 chars)`);
    }
    if (!Array.isArray(ent.core_traits) || ent.core_traits.length < 2 || ent.core_traits.length > 6) {
      errors.push(`${prefix} core_traits must be an array of 2 to 6 strings`);
    }
    if (!Array.isArray(ent.facts_and_myths) || ent.facts_and_myths.length === 0) {
      errors.push(`${prefix} facts_and_myths must be a non-empty array`);
    } else {
      ent.facts_and_myths.forEach((fm, fIdx) => {
        if (!fm.claim || typeof fm.claim !== 'string') {
          errors.push(`${prefix} facts_and_myths[${fIdx}] missing claim`);
        }
        if (!validVerdicts.has(fm.verdict)) {
          errors.push(`${prefix} facts_and_myths[${fIdx}] invalid verdict "${fm.verdict}". Must be fact/myth/true/false`);
        }
        if (!fm.explanation || typeof fm.explanation !== 'string') {
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

if (process.argv[1] && process.argv[1].endsWith('validateKnowledgeEntities.js')) {
  const targetPath = process.argv[2];
  if (!targetPath || !fs.existsSync(targetPath)) {
    console.error(`Please provide a valid file path.`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const errs = validateEntities(data);
  if (errs.length > 0) {
    console.error(`Validation failed with ${errs.length} errors:\n` + errs.slice(0, 20).join('\n'));
    process.exit(1);
  } else {
    console.log(`Validation PASSED: ${data.length} entities verified successfully.`);
  }
}
