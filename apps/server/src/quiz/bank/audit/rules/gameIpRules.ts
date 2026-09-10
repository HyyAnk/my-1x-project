import type { TrademarkIpDef } from "./ruleTypes.js";

export const GAME_IP_RULES: TrademarkIpDef[] = [
  {
    namePattern: /^pac[- ]?man$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Pac-Man", "Puck Man", "Namco", "Blinky", "Pinky", "Inky", "Clyde", "Power Pellet"],
    safeVisualProxy:
      "A retro yellow circular character chomping glowing dots along neon blue maze pathways surrounded by colorful retro ghost sprites.",
  },
  {
    namePattern: /^super mario$|^mario$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Mario", "Super Mario", "Nintendo", "Luigi", "Bowser", "Princess Peach"],
    safeVisualProxy:
      "A cheerful mustachioed retro platformer plumber in a red work cap and blue overalls leaping over floating brick blocks.",
  },
  {
    namePattern: /^luigi$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Luigi", "Mario", "Nintendo", "Bowser"],
    safeVisualProxy: "A tall green-capped mustachioed videogame brother in denim overalls navigating spooky haunted mansions.",
  },
  {
    namePattern: /^princess peach$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Princess Peach", "Peach", "Mario", "Nintendo", "Toadstool"],
    safeVisualProxy: "A gentle fairytale princess in a flowing pink gown and golden tiara holding a parasol.",
  },
  {
    namePattern: /^bowser$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Bowser", "King Koopa", "Mario", "Nintendo"],
    safeVisualProxy: "A massive fiery spiked dragon-turtle creature roaring inside a lava-filled castle throne room.",
  },
  {
    namePattern: /^sonic the hedgehog$|^sonic$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Sonic", "Sonic the Hedgehog", "Sega", "Tails", "Knuckles", "Dr. Eggman"],
    safeVisualProxy:
      "A hyper-fast cobalt blue woodland hedgehog sprinting at high speed along rolling green loop-the-loop hills collecting gold rings.",
  },
  {
    namePattern: /^pikachu$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Pikachu", "Pokemon", "Pokeball", "Nintendo", "Game Freak"],
    safeVisualProxy:
      "A cheerful electric yellow rodent creature with red cheek pouches and lightning bolt-shaped tail emitting bright sparks.",
  },
  {
    namePattern: /^ash ketchum$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Ash Ketchum", "Pokemon", "Pokeball", "Pikachu", "Nintendo"],
    safeVisualProxy: "An ambitious anime adventure trainer wearing a red and white baseball cap and blue vest with a backpack.",
  },
  {
    namePattern: /^charizard$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Charizard", "Pokemon", "Pokeball", "Nintendo"],
    safeVisualProxy: "A colossal bipedal orange fire-breathing dragon with teal underwings and a fiery flaming tail tip.",
  },
  {
    namePattern: /^donkey kong.*$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Donkey Kong", "DK", "Nintendo", "Mario"],
    safeVisualProxy: "A mighty jungle gorilla wearing a monogrammed red necktie beating his chest on wooden girder platforms.",
  },
  {
    namePattern: /^link$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Link", "Zelda", "The Legend of Zelda", "Nintendo", "Triforce", "Master Sword"],
    safeVisualProxy: "A courageous fantasy elven hero in a green tunic wielding a magical sword and heraldic shield in ancient ruins.",
  },
  {
    namePattern: /^princess zelda$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Princess Zelda", "Zelda", "The Legend of Zelda", "Nintendo", "Triforce", "Hyrule"],
    safeVisualProxy: "An elegant fantasy princess in royal ceremonial robes wielding radiant sacred magic.",
  },
  {
    namePattern: /^lara croft$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Lara Croft", "Tomb Raider", "Eidos", "Square Enix"],
    safeVisualProxy: "An athletic dual-holstered explorer and archaeologist traversing treacherous ancient subterranean temples.",
  },
  {
    namePattern: /^solid snake$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Solid Snake", "Metal Gear", "Konami", "Kojima"],
    safeVisualProxy: "A tactical operative in dark infiltration gear with bandana and radio earpiece crouching behind surveillance walls.",
  },
  {
    namePattern: /^crash bandicoot$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Crash Bandicoot", "Naughty Dog", "Activision"],
    safeVisualProxy: "A wild orange marsupial creature in blue jeans spinning energetically across jungle stepping crates.",
  },
  {
    namePattern: /^mega man$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Mega Man", "Rockman", "Capcom"],
    safeVisualProxy: "A futuristic robotic boy hero clad in blue armor with an arm-mounted energy cannon.",
  },
  {
    namePattern: /^street fighter ii$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Street Fighter", "Capcom", "Ryu", "Ken", "Chun-Li"],
    safeVisualProxy: "A retro 1990s competitive arcade martial arts fighting tournament on glowing CRT screen.",
  },
  {
    namePattern: /^space invaders$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Space Invaders", "Taito"],
    safeVisualProxy: "Classic monochrome pixelated alien space fleet descending toward defensive bunkers in arcade space.",
  },
  {
    namePattern: /^tetris$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Tetris", "Alexey Pajitnov", "Tetromino", "Nintendo"],
    safeVisualProxy: "A falling geometric block puzzle game with colorful tetromino shapes slotting into place on a grid.",
  },
  {
    namePattern: /^frogger$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Frogger", "Konami", "Sega"],
    safeVisualProxy: "A top-down arcade perspective of a small green frog hopping across busy highway lanes and floating river logs.",
  },
  {
    namePattern: /^galaga$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Galaga", "Namco", "Bally Midway"],
    safeVisualProxy:
      "A vertical retro arcade space shooter featuring a lone white starfighter firing upwards at descending alien formations.",
  },
  {
    namePattern: /^duck hunt$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Duck Hunt", "Nintendo", "NES Zapper"],
    safeVisualProxy: "A classic 8-bit meadow scene with mallard ducks taking flight against a blue sky while a retriever dog looks on.",
  },
  {
    namePattern: /^asteroids \(arcade\)$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Asteroids", "Atari"],
    safeVisualProxy:
      "A vector graphics arcade screen showing a triangular spaceship floating in deep space among geometric drifting rocks.",
  },
  {
    namePattern: /^centipede \(arcade\)$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Centipede", "Atari"],
    safeVisualProxy: "A vibrant retro arcade screen featuring a segmented insect winding downwards through a mushroom forest.",
  },
  {
    namePattern: /^dig dug$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Dig Dug", "Namco"],
    safeVisualProxy: "An underground arcade cross-section of a shovel-wielding character tunneling through dirt layers.",
  },
  {
    namePattern: /^out run \(arcade\)$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Out Run", "Sega", "Yu Suzuki"],
    safeVisualProxy:
      "A rear-view arcade driving perspective of an open-top red sports convertible racing down a palm-tree coastal highway.",
  },
  {
    namePattern: /^time crisis$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Time Crisis", "Namco"],
    safeVisualProxy: "A first-person arcade light-gun action rail shooter in an industrial urban setting.",
  },
  {
    namePattern: /^monopoly$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Monopoly", "Hasbro", "Parker Brothers"],
    safeVisualProxy: "A traditional square board game layout featuring colored property streets, dice, and small metal playing tokens.",
  },
  {
    namePattern: /^scrabble$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Scrabble", "Hasbro", "Mattel"],
    safeVisualProxy: "A wooden grid board game with crossword-style letter tiles and numerical scores.",
  },
  {
    namePattern: /^rubik's cube$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Rubik's Cube", "Erno Rubik"],
    safeVisualProxy: "A twistable 3x3x3 puzzle cube with brightly colored square faces in red, blue, green, yellow, orange, and white.",
  },
  {
    namePattern: /^uno \(card game\)$/i,
    category: "GAME_IP",
    forbiddenKeywords: ["Uno", "Mattel"],
    safeVisualProxy: "A colorful shedding card game with numbered cards in red, yellow, green, and blue with special action symbols.",
  },
];
