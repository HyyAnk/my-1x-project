import type { TrademarkIpDef } from "./ruleTypes.js";

export const ANIMATION_STUDIO_RULES: TrademarkIpDef[] = [
  {
    namePattern: /^po \(kung fu panda\)$|^po panda$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Po", "Kung Fu Panda", "DreamWorks", "Dragon Warrior"],
    safeVisualProxy: "An enthusiastic martial-arts giant panda wearing patchwork pants striking a dynamic kung fu stance.",
  },
  {
    namePattern: /^shrek$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Shrek", "DreamWorks"],
    safeVisualProxy: "A stout friendly green ogre wearing a rustic linen tunic and brown vest in a misty secluded swamp.",
  },
  {
    namePattern: /^donkey \(shrek\)$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Donkey", "Shrek", "DreamWorks"],
    safeVisualProxy: "An expressive talking gray miniature donkey trotting cheerfully down a fairytale forest trail.",
  },
  {
    namePattern: /^spongebob squarepants$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["SpongeBob", "SpongeBob SquarePants", "Nickelodeon"],
    safeVisualProxy: "A cheerful yellow sea sponge in crisp collared shirt and brown square trousers undersea.",
  },
  {
    namePattern: /^patrick star$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Patrick Star", "Nickelodeon"],
    safeVisualProxy: "A jovial pink starfish wearing green Hawaiian flower-patterned trunks on the ocean floor.",
  },
  {
    namePattern: /^squidward tentacles$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Squidward", "Squidward Tentacles", "Nickelodeon"],
    safeVisualProxy: "A disgruntled turquoise cartoon octopus holding a clarinet inside an undersea tiki home.",
  },
  {
    namePattern: /^mr\. krabs$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Mr. Krabs", "Nickelodeon", "Krusty Krab"],
    safeVisualProxy: "A burly crimson sailor crab clutching shiny coins inside a nautical underwater eatery.",
  },
  {
    namePattern: /^homer simpson$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Homer Simpson", "The Simpsons", "Fox", "Matt Groening"],
    safeVisualProxy: "A comical cartoon father in white polo shirt and blue jeans holding a frosted pink donut.",
  },
  {
    namePattern: /^bart simpson$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Bart Simpson", "The Simpsons", "Fox"],
    safeVisualProxy: "A mischievous yellow cartoon schoolboy with spiky hair riding a green skateboard in red t-shirt.",
  },
  {
    namePattern: /^scooby[- ]doo$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Scooby-Doo", "Hanna-Barbera", "Warner Bros"],
    safeVisualProxy: "A timid brown Great Dane with black spots wearing a diamond-shaped turquoise dog tag.",
  },
  {
    namePattern: /^shaggy rogers$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Shaggy Rogers", "Shaggy", "Scooby-Doo", "Hanna-Barbera"],
    safeVisualProxy: "A lanky scruffy cartoon detective in loose green v-neck shirt and brown bell-bottom pants.",
  },
  {
    namePattern: /^fred flintstone$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Fred Flintstone", "The Flintstones", "Hanna-Barbera"],
    safeVisualProxy: "A prehistoric cartoon caveman wearing an orange animal pelt tunic with black triangles.",
  },
  {
    namePattern: /^barney rubble$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Barney Rubble", "The Flintstones", "Hanna-Barbera"],
    safeVisualProxy: "A short cheerful prehistoric cartoon caveman wearing a brown ragged tunic.",
  },
  {
    namePattern: /^george jetson$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["George Jetson", "The Jetsons", "Hanna-Barbera"],
    safeVisualProxy: "A retro-futuristic cartoon office worker flying a bubble-canopy aerocar among elevated sky platforms.",
  },
  {
    namePattern: /^yogi bear$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Yogi Bear", "Hanna-Barbera"],
    safeVisualProxy: "A clever brown cartoon bear wearing a green collar, necktie, and porkpie hat swiping a picnic basket.",
  },
];
