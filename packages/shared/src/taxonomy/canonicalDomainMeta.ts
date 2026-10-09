/**
 * Canonical domain metadata (titles, descriptions, icons) for the kids and family studio taxonomy.
 */

export interface CanonicalDomainInfo {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const CANONICAL_DOMAIN_META: Record<string, CanonicalDomainInfo> = {
  anime_manga: {
    id: "anime_manga",
    title: "Anime & Manga Universe",
    description: "Kid-friendly anime heroes, Pokemon, Doraemon, Studio Ghibli classics, and family-favorite manga adventures.",
    icon: "Tv",
  },
  careers_occupations: {
    id: "careers_occupations",
    title: "Careers & Occupations",
    description: "Everyday helpers and dream jobs: rescuers, builders, scientists, artists, and explorers.",
    icon: "Briefcase",
  },
  countries_nations: {
    id: "countries_nations",
    title: "Countries & Nations",
    description: "World geography, flags, iconic landmarks, and cultures from every continent.",
    icon: "Globe",
  },
  daily_objects: {
    id: "daily_objects",
    title: "Daily Objects & Household Essentials",
    description: "Everyday personal items, home living objects, tools, and kitchenware.",
    icon: "House",
  },
  dinosaurs_prehistoric: {
    id: "dinosaurs_prehistoric",
    title: "Dinosaurs & Prehistoric Life",
    description: "Dinosaurs, flying and swimming prehistoric reptiles, Ice Age giants, and fossils.",
    icon: "Bone",
  },
  festivals_cultures: {
    id: "festivals_cultures",
    title: "Festivals & Cultures",
    description: "Celebrations around the world, traditional clothing, festive treats, and cultural symbols.",
    icon: "PartyPopper",
  },
  food_gastronomy: {
    id: "food_gastronomy",
    title: "Food & Gastronomy",
    description: "Dishes from around the world, sweet treats, street snacks, kid-friendly drinks, and ingredients.",
    icon: "Utensils",
  },
  fruits_vegetables_plants: {
    id: "fruits_vegetables_plants",
    title: "Fruits, Vegetables & Plants",
    description: "Colorful fruits, garden vegetables, flowers, trees, and the amazing ways plants grow.",
    icon: "Leaf",
  },
  gaming_esports: {
    id: "gaming_esports",
    title: "Family Video Games",
    description: "Family-friendly video game heroes and worlds: Nintendo legends, platformers, sandbox builders, and party games.",
    icon: "Gamepad2",
  },
  global_brands: {
    id: "global_brands",
    title: "Global Brands & Icons",
    description: "World-famous family brands: toys, technology, cars, snacks, and sportswear logos.",
    icon: "Award",
  },
  human_body: {
    id: "human_body",
    title: "Human Body & Biology",
    description: "How our bodies work: organs, senses, bones, muscles, and everyday body wonders.",
    icon: "Heart",
  },
  modern_cinema_tv: {
    id: "modern_cinema_tv",
    title: "Movies & Animated Films",
    description: "Family movie heroes: animated studio favorites, superhero teams, space sagas, and fantasy adventures.",
    icon: "Film",
  },
  music_instruments_gear: {
    id: "music_instruments_gear",
    title: "Music Instruments & Audio Gear",
    description: "Musical instruments from around the world, how they make sound, and classic audio gear.",
    icon: "Music",
  },
  mythology_creatures: {
    id: "mythology_creatures",
    title: "Mythology & Creatures",
    description: "Legendary creatures, gods, and heroes from world myths and folklore, told as storybook adventures.",
    icon: "Flame",
  },
  nature_animals: {
    id: "nature_animals",
    title: "Nature & Animals",
    description: "Wild animals, ocean life, birds, reptiles, insects, and their amazing superpowers.",
    icon: "PawPrint",
  },
  pets_farm_animals: {
    id: "pets_farm_animals",
    title: "Pets & Farm Animals",
    description: "Dog and cat breeds, small pets, and friendly farm animals and how to care for them.",
    icon: "Dog",
  },
  places_facilities: {
    id: "places_facilities",
    title: "Places & Facilities",
    description: "Places we visit: schools, parks, museums, stations, shops, and community buildings.",
    icon: "Building",
  },
  pop_culture_classics: {
    id: "pop_culture_classics",
    title: "Pop Culture & Classics",
    description: "Classic cartoons, kids' animation, fairy tales, storybook heroes, and famous artworks.",
    icon: "Film",
  },
  school_learning: {
    id: "school_learning",
    title: "School & Learning",
    description: "Classroom tools, school science, shapes, and first-aid basics.",
    icon: "GraduationCap",
  },
  science_how_things_work: {
    id: "science_how_things_work",
    title: "Science & How Things Work",
    description: "Everyday science, simple machines, colors and matter, and famous inventors and scientists.",
    icon: "FlaskConical",
  },
  space_earth: {
    id: "space_earth",
    title: "Space & Earth",
    description: "Planets, stars, galaxies, Earth's natural wonders, and weather phenomena.",
    icon: "Compass",
  },
  sports_games: {
    id: "sports_games",
    title: "Sports & Games",
    description: "Sports, board games, puzzles, and classic arcade fun.",
    icon: "Trophy",
  },
  toys_playground: {
    id: "toys_playground",
    title: "Toys & Playground",
    description: "Classic toys, outdoor games, and playground favorites.",
    icon: "Puzzle",
  },
  vehicles_technology: {
    id: "vehicles_technology",
    title: "Vehicles & Technology",
    description: "Cars, trains, planes, ships, rockets, machines, and everyday gadgets.",
    icon: "Cpu",
  },
};
