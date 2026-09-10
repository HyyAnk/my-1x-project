import type { TrademarkIpDef } from "./ruleTypes.js";

export const CINEMA_IP_RULES: TrademarkIpDef[] = [
  {
    namePattern: /^the terminator \(t-800\)$|^the terminator$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Terminator", "T-800", "Arnold Schwarzenegger"],
    safeVisualProxy: "A gleaming metallic chrome cybernetic endoskeleton with glowing red ocular sensors.",
  },
  {
    namePattern: /^sarah connor$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Sarah Connor", "Terminator", "Linda Hamilton"],
    safeVisualProxy: "A hardened combat-ready survivalist woman in tactical tank top and aviator sunglasses.",
  },
  {
    namePattern: /^ellen ripley$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Ellen Ripley", "Ripley", "Alien", "Sigourney Weaver"],
    safeVisualProxy: "A resilient sci-fi astronaut and space officer in flight jumpsuit navigating steam-filled ship corridors.",
  },
  {
    namePattern: /^neo \(the matrix\)$|^neo$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Neo", "The Matrix", "Keanu Reeves"],
    safeVisualProxy: "A calm martial arts master in flowing black duster coat and dark sunglasses against falling green digital glyphs.",
  },
  {
    namePattern: /^morpheus \(the matrix\)$|^morpheus$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Morpheus", "The Matrix", "Laurence Fishburne"],
    safeVisualProxy: "A wise mentor in mirrored rimless sunglasses and leather overcoat offering two colored pills.",
  },
  {
    namePattern: /^marty mcfly$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Marty McFly", "Back to the Future", "Michael J. Fox"],
    safeVisualProxy: "A 1980s teenager in orange puffer vest and denim jacket riding a skateboard beside a stainless-steel car.",
  },
  {
    namePattern: /^doc brown$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Doc Brown", "Back to the Future", "Christopher Lloyd"],
    safeVisualProxy: "An eccentric wild-haired inventor in white lab coat adjusting futuristic glowing gauge dials.",
  },
  {
    namePattern: /^rocky balboa$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Rocky Balboa", "Sylvester Stallone"],
    safeVisualProxy: "A determined boxer in red-and-white striped trunks raising leather boxing gloves in a smoky boxing ring.",
  },
  {
    namePattern: /^john rambo$|^rambo$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["John Rambo", "Rambo", "Sylvester Stallone"],
    safeVisualProxy: "A battle-hardened survival commando with red headband trekking through a dense monsoon jungle.",
  },
  {
    namePattern: /^james bond$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["James Bond", "007", "MI6"],
    safeVisualProxy: "A sharp secret agent in a tailored black tuxedo and bow tie standing in a glamorous casino lounge.",
  },
  {
    namePattern: /^indiana jones$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Indiana Jones", "Harrison Ford"],
    safeVisualProxy: "A daring archaeologist in brown fedora and leather jacket holding a coiled bullwhip inside an ancient cavern.",
  },
  {
    namePattern: /^captain jack sparrow$/i,
    category: "CINEMA_IP",
    forbiddenKeywords: ["Jack Sparrow", "Pirates of the Caribbean", "Disney", "Johnny Depp"],
    safeVisualProxy: "An eccentric dreadlocked swashbuckling pirate captain in tricorn hat holding a brass compass on a wooden ship deck.",
  },
];
