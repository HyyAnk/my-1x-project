import type { YouTubePlaylistDefinition, YouTubePlaylistKey } from "./youtubePlaylist.types.js";

export const YOUTUBE_PLAYLIST_CATALOG: Readonly<Record<YouTubePlaylistKey, YouTubePlaylistDefinition>> = Object.freeze({
  animal_nature_quiz: {
    key: "animal_nature_quiz",
    title: "Animal & Nature Quiz",
    format: "long_form",
    summary: "Animals, pets, dinosaurs, plants and food from nature.",
  },
  science_space_quiz: {
    key: "science_space_quiz",
    title: "Science & Space Quiz",
    format: "long_form",
    summary: "Space, planet Earth, how things work, the human body and school subjects.",
  },
  world_culture_quiz: {
    key: "world_culture_quiz",
    title: "World & Culture Quiz",
    format: "long_form",
    summary: "Countries, flags, festivals, food and famous places.",
  },
  pop_culture_quiz: {
    key: "pop_culture_quiz",
    title: "Pop Culture Quiz",
    format: "long_form",
    summary: "Anime, movies, TV, games, music and mythology.",
  },
  everyday_things_quiz: {
    key: "everyday_things_quiz",
    title: "Everyday Things Quiz",
    format: "long_form",
    summary: "Daily objects, brands, vehicles, jobs, toys and sports.",
  },
  guess_the_picture: {
    key: "guess_the_picture",
    title: "Guess the Picture",
    format: "long_form",
    summary: "Picture-based gameplay: silhouettes, odd-one-out and spot the difference.",
  },
  quick_quiz_shorts: {
    key: "quick_quiz_shorts",
    title: "Quick Quiz Shorts",
    format: "shorts",
    summary: "Every multi-question Quiz Short.",
  },
  true_or_false_shorts: {
    key: "true_or_false_shorts",
    title: "True or False?",
    format: "shorts",
    summary: "Yes / No verdict Shorts: myths, facts and surprising truths.",
  },
  this_vs_that_shorts: {
    key: "this_vs_that_shorts",
    title: "This vs That",
    format: "shorts",
    summary: "Head-to-head versus faceoff Shorts.",
  },
});

/** Fixed mapping from every canonical domain to its long-form topic playlist. */
export const DOMAIN_TOPIC_PLAYLIST: Readonly<Record<string, YouTubePlaylistKey>> = Object.freeze({
  nature_animals: "animal_nature_quiz",
  pets_farm_animals: "animal_nature_quiz",
  dinosaurs_prehistoric: "animal_nature_quiz",
  fruits_vegetables_plants: "animal_nature_quiz",

  space_earth: "science_space_quiz",
  science_how_things_work: "science_space_quiz",
  human_body: "science_space_quiz",
  school_learning: "science_space_quiz",

  countries_nations: "world_culture_quiz",
  festivals_cultures: "world_culture_quiz",
  food_gastronomy: "world_culture_quiz",
  places_facilities: "world_culture_quiz",

  anime_manga: "pop_culture_quiz",
  modern_cinema_tv: "pop_culture_quiz",
  pop_culture_classics: "pop_culture_quiz",
  gaming_esports: "pop_culture_quiz",
  music_instruments_gear: "pop_culture_quiz",
  mythology_creatures: "pop_culture_quiz",

  daily_objects: "everyday_things_quiz",
  global_brands: "everyday_things_quiz",
  vehicles_technology: "everyday_things_quiz",
  careers_occupations: "everyday_things_quiz",
  toys_playground: "everyday_things_quiz",
  sports_games: "everyday_things_quiz",
});

/** Episode gameplay that is picture-driven and also belongs in "Guess the Picture". */
export const PICTURE_GAMEPLAY_ARCHETYPES: ReadonlySet<string> = new Set(["mystery_reveal", "visual_spotting"]);
export const PICTURE_QUIZ_FORMATS: ReadonlySet<string> = new Set(["image_guess", "odd_one_out"]);

/** Shorts gameplay that has its own dedicated Shorts playlist. */
export const SHORTS_ARCHETYPE_PLAYLIST: Readonly<Record<string, YouTubePlaylistKey>> = Object.freeze({
  verdict_yes_no: "true_or_false_shorts",
  versus_faceoff: "this_vs_that_shorts",
});
