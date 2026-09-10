import type { TrademarkIpDef } from "./ruleTypes.js";

export const DISNEY_CORE_RULES: TrademarkIpDef[] = [
  {
    namePattern: /^mickey mouse$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Mickey Mouse", "Disney", "Steamboat Willie"],
    safeVisualProxy: "A cheerful retro cartoon mouse with large round ears wearing bright red button shorts and white gloves.",
  },
  {
    namePattern: /^minnie mouse$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Minnie Mouse", "Disney"],
    safeVisualProxy: "A cheerful vintage cartoon mouse with round ears wearing a polka-dot dress and matching bow.",
  },
  {
    namePattern: /^donald duck$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Donald Duck", "Disney"],
    safeVisualProxy: "A feisty classic cartoon white duck wearing a blue sailor suit with red bow tie and sailor cap.",
  },
  {
    namePattern: /^daisy duck$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Daisy Duck", "Disney"],
    safeVisualProxy: "An expressive stylish white cartoon duck with large purple hair bow and fashionable lavender blouse.",
  },
  {
    namePattern: /^goofy$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Goofy", "Disney"],
    safeVisualProxy: "A tall friendly cartoon hound dog wearing a rumpled green fedora, orange turtleneck, and blue trousers.",
  },
  {
    namePattern: /^pluto \(disney\)$|^pluto dog$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Pluto", "Disney"],
    safeVisualProxy: "A loyal golden-orange cartoon bloodhound with long black floppy ears and green collar.",
  },
  {
    namePattern: /^scrooge mcduck$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Scrooge McDuck", "Disney", "Uncle Scrooge"],
    safeVisualProxy: "An elderly wealthy cartoon duck in red spats, top hat, and spectacles examining gold coins.",
  },
  {
    namePattern: /^simba$/i,
    category: "LION_CUB",
    forbiddenKeywords: ["Simba", "The Lion King", "Disney", "lion cub"],
    safeVisualProxy: "A spirited young golden savannah lion resting beneath sweeping acacia trees on the African plains.",
  },
  {
    namePattern: /^mufasa$/i,
    category: "LION_CUB",
    forbiddenKeywords: ["Mufasa", "The Lion King", "Disney"],
    safeVisualProxy: "A noble adult male lion with a grand dark golden mane surveying sunrise over the savannah.",
  },
  {
    namePattern: /^scar \(the lion king\)$|^scar$/i,
    category: "LION_CUB",
    forbiddenKeywords: ["Scar", "The Lion King", "Disney"],
    safeVisualProxy: "A sly dark-maned savannah lion with a distinct facial scar lurking among shadowed rocks.",
  },
  {
    namePattern: /^woody \(toy story\)$|^woody$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Woody", "Toy Story", "Pixar", "Disney"],
    safeVisualProxy: "A traditional vintage pull-string cowboy doll with a leather vest, star badge, and wide-brimmed stetson hat.",
  },
  {
    namePattern: /^buzz lightyear$/i,
    category: "DISNEY_CORE",
    forbiddenKeywords: ["Buzz Lightyear", "Toy Story", "Pixar", "Disney", "Star Command"],
    safeVisualProxy: "A heroic sci-fi space ranger action figure in a white and green armored spacesuit with clear helmet dome.",
  },
];
