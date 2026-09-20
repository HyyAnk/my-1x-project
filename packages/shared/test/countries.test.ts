import assert from "node:assert/strict";
import test from "node:test";
import {
  TARGET_COUNTRY_LANGUAGES,
  TARGET_COUNTRY_OPTIONS,
  getCountryDefaultLanguage,
  getCountryName,
  getCountryOption,
  getLanguageOption,
  matchChannelLanguage,
  normalizeLanguageCode,
} from "../src/index.js";

test("the target locale catalog replaces UAE-English with China-Chinese", () => {
  const china = getCountryOption("CN");

  assert.equal(TARGET_COUNTRY_OPTIONS.length, 20);
  assert.equal(getCountryOption("AE"), undefined);
  assert.deepEqual(china, {
    rank: 20,
    code: "CN",
    name: "China",
    nameVi: "China",
    nameEn: "China",
    flag: "🇨🇳",
    defaultLanguage: "Chinese",
    languageNameVi: "Chinese",
  });
  assert.equal(getCountryName("CN"), "China");
  assert.equal(getCountryDefaultLanguage("CN"), "Chinese");
  assert.equal(getLanguageOption("Chinese")?.code, "zh");
});

test("Chinese locale IDs normalize and match China channels consistently", () => {
  assert.equal(normalizeLanguageCode("Chinese"), "zh");
  assert.equal(normalizeLanguageCode("Mandarin"), "zh");
  assert.equal(normalizeLanguageCode("zh-CN"), "zh");
  assert.equal(normalizeLanguageCode("\u4e2d\u6587"), "zh");
  assert.equal(TARGET_COUNTRY_LANGUAGES.at(-1)?.key, "Chinese");
  assert.equal(TARGET_COUNTRY_LANGUAGES.at(-1)?.primaryCountryCode, "CN");
  assert.equal(matchChannelLanguage({ country: "CN" }, "Chinese"), true);
  assert.equal(matchChannelLanguage({ language: "zh", country: "CN" }, "Chinese"), true);
});
