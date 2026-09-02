/**
 * Converts a glob pattern to a RegExp.
 * Handles **, *, ?, and character escaping.
 *
 * @param {string} glob
 * @returns {{ regex: RegExp, isNegative: boolean }}
 */
export function globToRegExp(glob) {
  let pattern = glob.replace(/\\/g, "/").trim();
  const isNegative = pattern.startsWith("!");
  if (isNegative) {
    pattern = pattern.slice(1).trim();
  }

  let regexStr = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "*" && pattern[i + 1] === "*") {
      // "**/" matches zero or more directories
      if (pattern[i + 2] === "/") {
        regexStr += "(?:.*/)?";
        i += 3;
      } else {
        regexStr += ".*";
        i += 2;
      }
    } else if (c === "*") {
      // Single * matches characters within a single path segment
      regexStr += "[^/]*";
      i += 1;
    } else if (c === "?") {
      regexStr += "[^/]";
      i += 1;
    } else if (".+^$()|{}[]".includes(c)) {
      regexStr += "\\" + c;
      i += 1;
    } else {
      regexStr += c;
      i += 1;
    }
  }
  regexStr += "$";
  return { regex: new RegExp(regexStr, process.platform === "win32" ? "i" : ""), isNegative };
}

/**
 * Normalizes a file path to use forward slashes and removes leading './'.
 * @param {string} filePath
 * @returns {string}
 */
export function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

/**
 * Checks whether a normalized file path matches a zone definition.
 * A file matches a zone if it matches at least one positive glob AND does NOT match any negative glob.
 *
 * @param {string} filePath
 * @param {{ globs: string[] }} zone
 * @returns {boolean}
 */
export function fileMatchesZone(filePath, zone) {
  const normPath = normalizePath(filePath);
  const positiveGlobs = [];
  const negativeGlobs = [];

  for (const g of zone.globs || []) {
    const parsed = globToRegExp(g);
    if (parsed.isNegative) {
      negativeGlobs.push(parsed.regex);
    } else {
      positiveGlobs.push(parsed.regex);
    }
  }

  // If matches any negative glob, it is excluded from this zone
  for (const neg of negativeGlobs) {
    if (neg.test(normPath)) {
      return false;
    }
  }

  // Must match at least one positive glob
  for (const pos of positiveGlobs) {
    if (pos.test(normPath)) {
      return true;
    }
  }

  return false;
}

/**
 * Finds all zones that match a file path.
 *
 * @param {string} filePath
 * @param {Array<object>} zoneList
 * @returns {Array<object>}
 */
export function findZonesForFile(filePath, zoneList) {
  const matching = [];
  for (const zone of zoneList) {
    if (fileMatchesZone(filePath, zone)) {
      matching.push(zone);
    }
  }
  return matching;
}
