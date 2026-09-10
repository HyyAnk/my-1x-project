import type { TrademarkIpDef } from "./ruleTypes.js";

export const CLASSIC_CARTOON_RULES: TrademarkIpDef[] = [
  {
    namePattern: /^bugs bunny$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Bugs Bunny", "Looney Tunes", "Warner Bros"],
    safeVisualProxy: "A witty gray and white trickster rabbit nonchalantly munching a crisp orange carrot.",
  },
  {
    namePattern: /^daffy duck$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Daffy Duck", "Looney Tunes", "Warner Bros"],
    safeVisualProxy: "A dramatic black cartoon duck with orange beak and white neck ring striking an animated pose.",
  },
  {
    namePattern: /^porky pig$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Porky Pig", "Looney Tunes", "Warner Bros"],
    safeVisualProxy: "A timid plump cartoon pig wearing a blue jacket and red bow tie.",
  },
  {
    namePattern: /^elmer fudd$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Elmer Fudd", "Looney Tunes", "Warner Bros"],
    safeVisualProxy: "A bumbling cartoon hunter in brown hunting cap carrying a double-barrel shotgun through the woods.",
  },
  {
    namePattern: /^tweety bird$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Tweety", "Tweety Bird", "Looney Tunes", "Warner Bros"],
    safeVisualProxy: "A small cheerful canary bird with large blue eyes perched inside a brass birdcage.",
  },
  {
    namePattern: /^sylvester the cat$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Sylvester", "Sylvester the Cat", "Looney Tunes", "Warner Bros"],
    safeVisualProxy: "A scruffy tuxedo cat with a large red nose tip-toeing in pursuit of a canary.",
  },
  {
    namePattern: /^wile e\. coyote$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Wile E. Coyote", "Looney Tunes", "Warner Bros", "ACME"],
    safeVisualProxy: "A persistent cartoon coyote setting complex mechanical blueprint traps in a desert canyon.",
  },
  {
    namePattern: /^road runner$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Road Runner", "Looney Tunes", "Warner Bros"],
    safeVisualProxy: "A swift blue desert ground cuckoo speeding down an open highway leaving a dust plume.",
  },
  {
    namePattern: /^tasmanian devil$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Tasmanian Devil", "Taz", "Looney Tunes", "Warner Bros"],
    safeVisualProxy: "A spinning whirlwind cartoon carnivore with sharp teeth ripping across the landscape.",
  },
  {
    namePattern: /^tom cat$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Tom Cat", "Tom and Jerry", "MGM", "Warner Bros"],
    safeVisualProxy: "A determined domestic grey-and-white feline tip-toeing across a suburban living room floor.",
  },
  {
    namePattern: /^jerry mouse$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Jerry Mouse", "Tom and Jerry", "MGM", "Warner Bros"],
    safeVisualProxy: "A clever quick-witted brown mouse peeking cheerfully out from an arched baseboard mouse hole.",
  },
  {
    namePattern: /^popeye the sailor$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Popeye", "Popeye the Sailor", "King Features"],
    safeVisualProxy: "A rugged squinting sailor with anchor tattoos on his forearms popping open a can of spinach.",
  },
  {
    namePattern: /^olive oyl$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Olive Oyl", "King Features"],
    safeVisualProxy: "A slender cartoon woman with high hair bun wearing a red long-sleeve blouse and black skirt.",
  },
  {
    namePattern: /^bluto$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Bluto", "Brutus", "Popeye"],
    safeVisualProxy: "A hulking broad-shouldered bearded cartoon sailor with a menacing sneer.",
  },
  {
    namePattern: /^betty boop$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Betty Boop", "Fleischer Studios"],
    safeVisualProxy: "A vintage 1930s animated flapper girl with round baby-doll face and short curled black hair.",
  },
  {
    namePattern: /^woody woodpecker$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Woody Woodpecker", "Walter Lantz"],
    safeVisualProxy: "An energetic cartoon woodpecker with bright red top crest and blue feathers.",
  },
  {
    namePattern: /^casper the friendly ghost$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Casper", "Casper the Friendly Ghost", "Harvey Comics"],
    safeVisualProxy: "A gentle translucent white cartoon ghost with large friendly eyes floating pleasantly.",
  },
  {
    namePattern: /^felix the cat$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["Felix the Cat", "Otto Messmer"],
    safeVisualProxy: "A vintage black-and-white cartoon cat with wide grin carrying a magic trick satchel.",
  },
  {
    namePattern: /^the pink panther$/i,
    category: "STUDIO_IP",
    forbiddenKeywords: ["The Pink Panther", "MGM"],
    safeVisualProxy: "A suave stylized pink panther feline walking with elongated stealthy steps.",
  },
];
