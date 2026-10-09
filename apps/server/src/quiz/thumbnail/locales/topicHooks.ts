import type { SupportedLanguage } from "./types.js";
import { containsAnyKeyword } from "../utils/keywordMatch.js";

const SPACE_HOOKS: Record<SupportedLanguage, string> = {
  en: "SOLAR SYSTEM QUIZ",
  ja: "宇宙クイズ",
  ko: "우주 퀴즈",
  zh: "太阳系问答",
  de: "PLANETEN QUIZ",
  fr: "QUIZ ESPACE",
  nl: "RUIMTE QUIZ",
  no: "ROMMET QUIZ",
  sv: "RYMDEN QUIZ",
  da: "RUMMET QUIZ",
  fi: "AVARUUSVISA",
  es: "QUIZ DEL ESPACIO",
};

const ANIMAL_HOOKS: Record<SupportedLanguage, string> = {
  en: "ANIMAL QUIZ",
  ja: "動物クイズ",
  ko: "동물 퀴즈",
  zh: "动物问答",
  de: "TIER QUIZ",
  fr: "QUIZ ANIMAUX",
  nl: "DIEREN QUIZ",
  no: "DYRE QUIZ",
  sv: "DJUR QUIZ",
  da: "DYRE QUIZ",
  fi: "ELÄINVISA",
  es: "QUIZ DE ANIMALES",
};

const FLAG_HOOKS: Record<SupportedLanguage, string> = {
  en: "WORLD FLAG QUIZ",
  ja: "国旗クイズ",
  ko: "국기 퀴즈",
  zh: "世界国旗问答",
  de: "FLAGGEN QUIZ",
  fr: "QUIZ DRAPEAUX",
  nl: "VLAGGEN QUIZ",
  no: "FLAGG QUIZ",
  sv: "FLAGG QUIZ",
  da: "FLAG QUIZ",
  fi: "LIPPUVISA",
  es: "QUIZ DE BANDERAS",
};

const COOKIE_HOOKS: Record<SupportedLanguage, string> = {
  en: "WORLD COOKIE TOUR!",
  ja: "世界のお菓子クイズ！",
  ko: "세계 쿠키 퀴즈!",
  zh: "世界甜点问答！",
  de: "WELT KEKS QUIZ!",
  fr: "QUIZ GÂTEAUX DU MONDE !",
  nl: "WERELD KOEKJES QUIZ!",
  no: "VERDENS KJEKS QUIZ!",
  sv: "VÄRLDENS KAKOR QUIZ!",
  da: "VERDENS SMÅKAGER QUIZ!",
  fi: "MAAILMAN KEKSIT VISA!",
  es: "¡QUIZ DE GALLETAS DEL MUNDO!",
};

const CAR_HOOKS: Record<SupportedLanguage, string> = {
  en: "SUPERCARS SPEED QUIZ!",
  ja: "スーパーカークイズ！",
  ko: "슈퍼카 스피드 퀴즈!",
  zh: "超级跑车问答！",
  de: "SUPERCARS QUIZ!",
  fr: "QUIZ SUPERCARS !",
  nl: "SUPERCARS QUIZ!",
  no: "SUPERCARS QUIZ!",
  sv: "SUPERCARS QUIZ!",
  da: "SUPERCARS QUIZ!",
  fi: "SUPERAUTOT VISA!",
  es: "¡QUIZ DE SUPERCARS!",
};

const MEDICAL_HOOKS: Record<SupportedLanguage, string> = {
  en: "FIRST AID HEROES!",
  ja: "応急処置クイズ！",
  ko: "응급처치 퀴즈!",
  zh: "急救英雄问答！",
  de: "ERSTE HILFE QUIZ!",
  fr: "QUIZ PREMIERS SECOURS !",
  nl: "EERSTE HULP QUIZ!",
  no: "FØRSTEHJELP QUIZ!",
  sv: "FÖRSTA HJÄLPEN QUIZ!",
  da: "FØRSTEHJÆLP QUIZ!",
  fi: "ENSIAPU VISA!",
  es: "¡QUIZ PRIMEROS AUXILIOS!",
};

const SCHOOL_HOOKS: Record<SupportedLanguage, string> = {
  en: "SCHOOL SECRETS QUIZ!",
  ja: "学校のヒミツクイズ！",
  ko: "학교 비밀 퀴즈!",
  zh: "校园秘境问答！",
  de: "SCHUL GEHEIMNISSE QUIZ!",
  fr: "QUIZ SECRETS D'ÉCOLE !",
  nl: "SCHOOL GEHEIMEN QUIZ!",
  no: "SKOLE HEMMELIGHETER QUIZ!",
  sv: "SKOLHEMLIGHETER QUIZ!",
  da: "SKOLEHEMMELIGHEDER QUIZ!",
  fi: "KOULUN SALAISUUDET VISA!",
  es: "¡QUIZ SECRETOS ESCOLARES!",
};

const GAMING_HOOKS: Record<SupportedLanguage, string> = {
  en: "ARCADE GAMING SHOWDOWN!",
  ja: "ゲーム対決クイズ！",
  ko: "게임 배틀 퀴즈!",
  zh: "电竞终极对决！",
  de: "GAMING SHOWDOWN QUIZ!",
  fr: "QUIZ GAMING ULTIME !",
  nl: "GAMING SHOWDOWN QUIZ!",
  no: "GAMING SHOWDOWN QUIZ!",
  sv: "GAMING SHOWDOWN QUIZ!",
  da: "GAMING SHOWDOWN QUIZ!",
  fi: "PELI SHOWDOWN VISA!",
  es: "¡QUIZ GAMING DEFINITIVO!",
};

const SCIENCE_HOOKS: Record<SupportedLanguage, string> = {
  en: "GENIUS SCIENCE LAB!",
  ja: "天才科学クイズ！",
  ko: "천재 과학 퀴즈!",
  zh: "天才科学实验室！",
  de: "GENIE WISSENSCHAFTS QUIZ!",
  fr: "QUIZ SCIENCE GÉNIE !",
  nl: "GENIE WETENSCHAP QUIZ!",
  no: "VITENSKAP GENI QUIZ!",
  sv: "VETENSKAP GENI QUIZ!",
  da: "VIDENSKAB GENI QUIZ!",
  fi: "TIEDE NERO VISA!",
  es: "¡QUIZ CIENCIA GENIAL!",
};

const HISTORY_HOOKS: Record<SupportedLanguage, string> = {
  en: "ANCIENT HISTORY SECRETS!",
  ja: "古代ミステリークイズ！",
  ko: "고대 역사 비밀 퀴즈!",
  zh: "古代历史揭秘！",
  de: "ANTIK GESCHICHTE QUIZ!",
  fr: "QUIZ HISTOIRE ANCIENNE !",
  nl: "GESCHIEDENIS GEHEIMEN QUIZ!",
  no: "HISTORISKE HEMMELIGHETER QUIZ!",
  sv: "HISTORISKA HEMLIGHETER QUIZ!",
  da: "HISTORISKE HEMMELIGHEDER QUIZ!",
  fi: "HISTORIAN SALAISUUDET VISA!",
  es: "¡QUIZ HISTORIA ANTIGUA!",
};

const OCEAN_HOOKS: Record<SupportedLanguage, string> = {
  en: "DEEP OCEAN MYSTERIES!",
  ja: "深海ミステリークイズ！",
  ko: "심해 미스터리 퀴즈!",
  zh: "深海神秘奥秘！",
  de: "TIEFER OZEAN QUIZ!",
  fr: "QUIZ MYSTÈRES DE L'OCÉAN !",
  nl: "DIEPE OCEAAN QUIZ!",
  no: "DYPT HAV QUIZ!",
  sv: "DJUPA HAVET QUIZ!",
  da: "DYBE HAV QUIZ!",
  fi: "SYVÄN MEREN VISA!",
  es: "¡QUIZ MISTERIOS DEL OCÉANO!",
};

const FOOD_HOOKS: Record<SupportedLanguage, string> = {
  en: "WORLD FOOD SHOWDOWN!",
  ja: "世界のごちそうクイズ！",
  ko: "세계 맛집 배틀 퀴즈!",
  zh: "环球美食巅峰决！",
  de: "WELT ESSEN QUIZ!",
  fr: "QUIZ GASTRONOMIE DU MONDE !",
  nl: "WERELD ETEN QUIZ!",
  no: "VERDENS MAT QUIZ!",
  sv: "VÄRLDENS MAT QUIZ!",
  da: "VERDENS MAD QUIZ!",
  fi: "MAAILMAN RUOKA VISA!",
  es: "¡QUIZ GASTRONOMÍA DEL MUNDO!",
};

const FANTASY_HOOKS: Record<SupportedLanguage, string> = {
  en: "MYTHIC LEGENDS QUIZ!",
  ja: "神話伝説クイズ！",
  ko: "신화 전설 퀴즈!",
  zh: "神话传奇问答！",
  de: "MYTHISCHE LEGENDEN QUIZ!",
  fr: "QUIZ LÉGENDES MYTHIQUES !",
  nl: "MYTHISCHE LEGENDEN QUIZ!",
  no: "MYTISKE LEGENDER QUIZ!",
  sv: "MYTISKA LEGENDER QUIZ!",
  da: "MYTISKE LEGENDER QUIZ!",
  fi: "MYYTTISET LEGENDAT VISA!",
  es: "¡QUIZ LEYENDAS MÍTICAS!",
};

const TECH_HOOKS: Record<SupportedLanguage, string> = {
  en: "FUTURE TECH & AI QUIZ!",
  ja: "未来AIテクノクイズ！",
  ko: "미래 AI 테크 퀴즈!",
  zh: "未来科技AI问答！",
  de: "ZUKUNFTS TECH QUIZ!",
  fr: "QUIZ TECH DU FUTUR !",
  nl: "TOEKOMST TECH QUIZ!",
  no: "FRAMTIDSTECH QUIZ!",
  sv: "FRAMTIDSTEKNIK QUIZ!",
  da: "FREMTIDSTEKNOLOGI QUIZ!",
  fi: "TULEVAISUUDEN TEKNOLOGIA VISA!",
  es: "¡QUIZ TECNOLOGÍA DEL FUTURO!",
};

const MOVIE_HOOKS: Record<SupportedLanguage, string> = {
  en: "BLOCKBUSTER MOVIE QUIZ!",
  ja: "名作映画クイズ！",
  ko: "블록버스터 영화 퀴즈!",
  zh: "热门大片问答！",
  de: "BLOCKBUSTER FILM QUIZ!",
  fr: "QUIZ CINÉMA BLOCKBUSTER !",
  nl: "BLOCKBUSTER FILM QUIZ!",
  no: "BLOCKBUSTER FILM QUIZ!",
  sv: "BLOCKBUSTER FILM QUIZ!",
  da: "BLOCKBUSTER FILM QUIZ!",
  fi: "BLOCKBUSTER ELOKUVA VISA!",
  es: "¡QUIZ CINE BLOCKBUSTER!",
};

const SPORTS_HOOKS: Record<SupportedLanguage, string> = {
  en: "SPORTS LEGENDS QUIZ!",
  ja: "スポーツ伝説クイズ！",
  ko: "스포츠 전설 퀴즈!",
  zh: "体育传奇问答！",
  de: "SPORT LEGENDEN QUIZ!",
  fr: "QUIZ LÉGENDES DU SPORT !",
  nl: "SPORT LEGENDES QUIZ!",
  no: "SPORT LEGENDER QUIZ!",
  sv: "SPORTLEGENDER QUIZ!",
  da: "SPORT LEGENDER QUIZ!",
  fi: "URHEILULEGENDAT VISA!",
  es: "¡QUIZ LEYENDAS DEL DEPORTE!",
};

const HERO_HOOKS: Record<SupportedLanguage, string> = {
  en: "SUPERHERO SHOWDOWN!",
  ja: "スーパーヒーロー対決！",
  ko: "슈퍼히어로 대결 퀴즈!",
  zh: "超级英雄巅峰战！",
  de: "SUPERHELDEN SHOWDOWN!",
  fr: "QUIZ SUPER-HÉROS !",
  nl: "SUPERHELDEN SHOWDOWN!",
  no: "SUPERHELT SHOWDOWN!",
  sv: "SUPERHJÄLTAR SHOWDOWN!",
  da: "SUPERHELTE SHOWDOWN!",
  fi: "SUPERKANKARIT VISA!",
  es: "¡BATALLA DE SUPERHÉROES!",
};

const NORSE_HOOKS: Record<SupportedLanguage, string> = {
  en: "NORSE LEGENDS QUIZ!",
  ja: "北欧神話クイズ！",
  ko: "북유럽 신화 퀴즈!",
  zh: "北欧神话问答！",
  de: "WIKINGER MYTHEN QUIZ!",
  fr: "QUIZ MYTHOLOGIE NORDIQUE !",
  nl: "NOORSE MYTHEN QUIZ!",
  no: "NORRØN MYTOLOGI QUIZ!",
  sv: "NORDISK MYTOLOGI QUIZ!",
  da: "NORDISK MYTOLOGI QUIZ!",
  fi: "SKANDINAAVINEN MYTOLOGIA VISA!",
  es: "¡QUIZ MITOLOGÍA NÓRDICA!",
};

const GREEK_HOOKS: Record<SupportedLanguage, string> = {
  en: "GREEK GODS QUIZ!",
  ja: "ギリシャ神話クイズ！",
  ko: "그리스 신화 퀴즈!",
  zh: "希腊神话问答！",
  de: "GRIECHISCHE GÖTTER QUIZ!",
  fr: "QUIZ DIEUX GRECS !",
  nl: "GRIEKSE GODEN QUIZ!",
  no: "GRESKE GUDER QUIZ!",
  sv: "GREKISKA GUDAR QUIZ!",
  da: "GRÆSKE GUDER QUIZ!",
  fi: "KREIKAN JUMALAT VISA!",
  es: "¡QUIZ DIOSES GRIEGOS!",
};

const SPACE_KEYWORDS = [
  "solar system",
  "planet",
  "space",
  "astronomy",
  "mars",
  "jupiter",
  "saturn",
  "galaxy",
  "cosmos",
  "telescope",
  "宇宙",
  "惑星",
  "太空",
  "行星",
  "太阳系",
];
const ANIMAL_KEYWORDS = ["animal", "wildlife", "creature", "safari", "mammal", "zoo", "動物", "动物", "野生动物"];
const FLAG_KEYWORDS = ["flag", "country", "geography", "capital", "nations", "国旗", "国家", "地理"];
const COOKIE_KEYWORDS = [
  "bake",
  "baking",
  "baker",
  "cookie",
  "biscuit",
  "pastry",
  "dessert",
  "cake",
  "culinary",
  "sweets",
  "スイーツ",
  "お菓子",
  "饼干",
  "甜点",
  "蛋糕",
  "烘焙",
];
const CAR_KEYWORDS = ["supercar", "hypercar", "racing", "ferrari", "lamborghini", "motorsport", "超级跑车", "赛车", "汽车"];
const MEDICAL_KEYWORDS = [
  "first aid",
  "clinic",
  "hospital",
  "medical",
  "medicine",
  "doctor",
  "nurse",
  "healthcare",
  "ambulance",
  "anatomy",
  "surgery",
  "救急",
  "医療",
  "病院",
  "医学",
  "응급",
  "의료",
  "병원",
  "医疗",
  "急救",
  "医院",
];
const SCHOOL_KEYWORDS = [
  "school",
  "classroom",
  "student",
  "teacher",
  "campus",
  "homework",
  "exam",
  "academy",
  "学校",
  "教室",
  "学生",
  "先生",
  "학교",
  "교실",
  "학생",
  "선생님",
  "课堂",
  "老师",
];
const GAMING_KEYWORDS = [
  "game",
  "gaming",
  "gamer",
  "arcade",
  "nintendo",
  "playstation",
  "xbox",
  "minecraft",
  "roblox",
  "fortnite",
  "esports",
  "videogame",
  "ゲーム",
  "ゲーマー",
  "ゲーセン",
  "게임",
  "게이머",
  "오락실",
  "游戏",
  "电竞",
  "街机",
];
const SCIENCE_KEYWORDS = [
  "science",
  "physics",
  "chemistry",
  "biology",
  "laboratory",
  "scientist",
  "experiment",
  "atom",
  "dna",
  "molecule",
  "科学",
  "物理",
  "化学",
  "生物",
  "実験",
  "과학",
  "물리",
  "화학",
  "생물",
  "실험",
  "实验",
];
const HISTORY_KEYWORDS = [
  "history",
  "historical",
  "ancient",
  "empire",
  "civilization",
  "egypt",
  "pyramid",
  "roman",
  "medieval",
  "dynasty",
  "pharaoh",
  "歴史",
  "古代",
  "帝国",
  "文明",
  "역사",
  "고대",
  "제국",
  "문명",
  "历史",
];
const OCEAN_KEYWORDS = [
  "ocean",
  "marine",
  "sea",
  "underwater",
  "shark",
  "whale",
  "coral",
  "abyss",
  "deep sea",
  "submarine",
  "海洋",
  "海",
  "深海",
  "サメ",
  "바다",
  "해양",
  "심해",
  "상어",
  "大海",
  "鲨鱼",
];
const FOOD_KEYWORDS = [
  "food",
  "dish",
  "cuisine",
  "cooking",
  "chef",
  "restaurant",
  "pizza",
  "burger",
  "fruit",
  "recipe",
  "snack",
  "gourmet",
  "料理",
  "グルメ",
  "シェフ",
  "食べ物",
  "요리",
  "음식",
  "셰프",
  "맛집",
  "美食",
  "烹饪",
  "大厨",
  "食物",
];
const FANTASY_KEYWORDS = [
  "mythology",
  "greek myth",
  "norse myth",
  "fantasy realm",
  "dragon",
  "wizard",
  "magic spells",
  "gods of olympus",
  "fairy tale",
  "神話",
  "ファンタジー",
  "魔法",
  "ドラゴン",
  "신화",
  "판타지",
  "마법",
  "드래곤",
  "神话",
  "奇幻",
  "神龙",
];
const TECH_KEYWORDS = [
  "future tech",
  "artificial intelligence",
  "cyberpunk",
  "robotics lab",
  "quantum computer",
  "nanotech",
  "coding quiz",
  "programming quiz",
  "software developer",
  "gadgets",
  "技術",
  "人工知能",
  "미래기술",
  "인공지능",
  "科技",
  "人工智能",
];
const MOVIE_KEYWORDS = [
  "blockbuster movie",
  "cinema trivia",
  "hollywood films",
  "oscar winners",
  "academy awards",
  "box office",
  "disney movies",
  "pixar movies",
  "映画クイズ",
  "シネマ",
  "영화 퀴즈",
  "电影问答",
  "好莱坞大片",
];
const SPORTS_KEYWORDS = [
  "sports trivia",
  "premier league",
  "world cup",
  "fifa",
  "nba",
  "olympics",
  "tennis grand slam",
  "athlete legends",
  "スポーツ伝説",
  "サッカー",
  "野球",
  "스포츠 퀴즈",
  "축구",
  "야구",
  "体育问答",
  "足球",
  "篮球",
  "奥运",
];
const HERO_KEYWORDS = [
  "superhero battle",
  "superhero showdown",
  "avengers assemble",
  "justice league",
  "marvel cinematic",
  "dc superheroes",
  "batman and superman",
  "spiderman villains",
  "スーパーヒーロー対決",
  "슈퍼히어로 대결",
  "超级英雄巅峰战",
];

const NORSE_KEYWORDS = [
  "norse",
  "viking",
  "valhalla",
  "thor",
  "odin",
  "loki",
  "ragnarok",
  "asgard",
  "runes",
  "nordic",
  "midgard",
  "jotunheim",
  "valkyrie",
  "北欧",
  "ヴァイキング",
  "바이킹",
  "维京",
];

const GREEK_KEYWORDS = [
  "greek myth",
  "greek god",
  "olympus",
  "zeus",
  "poseidon",
  "hades",
  "athena",
  "hercules",
  "spartan",
  "olympian",
  "ギリシャ神話",
  "그리스 신화",
  "希腊神话",
];

function matchesAny(text: string, keywords: readonly string[]): boolean {
  return containsAnyKeyword(text, keywords);
}

/**
 * Resolves topic-specific high-CTR hook headline across 17+ domain taxonomies with multilingual support.
 */
export function resolveTopicSpecificHook(topicText: string, language: SupportedLanguage): string | null {
  const lower = topicText.toLowerCase();

  if (matchesAny(lower, NORSE_KEYWORDS)) {
    return NORSE_HOOKS[language] || NORSE_HOOKS.en;
  }
  if (matchesAny(lower, GREEK_KEYWORDS)) {
    return GREEK_HOOKS[language] || GREEK_HOOKS.en;
  }
  if (matchesAny(lower, MEDICAL_KEYWORDS)) {
    return MEDICAL_HOOKS[language] || MEDICAL_HOOKS.en;
  }
  if (matchesAny(lower, SCHOOL_KEYWORDS)) {
    return SCHOOL_HOOKS[language] || SCHOOL_HOOKS.en;
  }
  if (matchesAny(lower, GAMING_KEYWORDS)) {
    return GAMING_HOOKS[language] || GAMING_HOOKS.en;
  }
  if (matchesAny(lower, SCIENCE_KEYWORDS)) {
    return SCIENCE_HOOKS[language] || SCIENCE_HOOKS.en;
  }
  if (matchesAny(lower, HISTORY_KEYWORDS)) {
    return HISTORY_HOOKS[language] || HISTORY_HOOKS.en;
  }
  if (matchesAny(lower, OCEAN_KEYWORDS)) {
    return OCEAN_HOOKS[language] || OCEAN_HOOKS.en;
  }
  if (matchesAny(lower, FOOD_KEYWORDS)) {
    return FOOD_HOOKS[language] || FOOD_HOOKS.en;
  }
  if (matchesAny(lower, FANTASY_KEYWORDS)) {
    return FANTASY_HOOKS[language] || FANTASY_HOOKS.en;
  }
  if (matchesAny(lower, TECH_KEYWORDS)) {
    return TECH_HOOKS[language] || TECH_HOOKS.en;
  }
  if (matchesAny(lower, MOVIE_KEYWORDS)) {
    return MOVIE_HOOKS[language] || MOVIE_HOOKS.en;
  }
  if (matchesAny(lower, SPORTS_KEYWORDS)) {
    return SPORTS_HOOKS[language] || SPORTS_HOOKS.en;
  }
  if (matchesAny(lower, HERO_KEYWORDS)) {
    return HERO_HOOKS[language] || HERO_HOOKS.en;
  }
  if (matchesAny(lower, SPACE_KEYWORDS)) {
    return SPACE_HOOKS[language] || SPACE_HOOKS.en;
  }
  if (matchesAny(lower, ANIMAL_KEYWORDS)) {
    return ANIMAL_HOOKS[language] || ANIMAL_HOOKS.en;
  }
  if (matchesAny(lower, FLAG_KEYWORDS)) {
    return FLAG_HOOKS[language] || FLAG_HOOKS.en;
  }
  if (matchesAny(lower, COOKIE_KEYWORDS)) {
    return COOKIE_HOOKS[language] || COOKIE_HOOKS.en;
  }
  if (matchesAny(lower, CAR_KEYWORDS)) {
    return CAR_HOOKS[language] || CAR_HOOKS.en;
  }

  return null;
}
