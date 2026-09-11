import fs from 'node:fs';
import path from 'node:path';

const CANONICAL_DOMAIN_META = {
  careers_occupations: {
    title: 'Careers & Occupations',
    description: 'Professions, skilled trades, emergency services, and extreme careers.',
    icon: 'Briefcase',
  },
  countries_nations: {
    title: 'Countries & Nations',
    description: 'World geography, iconic landmarks, flags, and cultural heritage.',
    icon: 'Globe',
  },
  daily_objects: {
    title: 'Daily Objects & Household Essentials',
    description: 'Everyday personal items, home living objects, tools, and kitchenware.',
    icon: 'House',
  },
  food_gastronomy: {
    title: 'Food & Gastronomy',
    description: 'Culinary traditions, global cuisine, pastries, ingredients, and street food.',
    icon: 'Utensils',
  },
  human_body: {
    title: 'Human Body & Biology',
    description: 'Anatomy, biological systems, senses, organs, and physiology.',
    icon: 'Heart',
  },
  music_instruments_gear: {
    title: 'Music Instruments & Audio Gear',
    description: 'Acoustic and electric instruments, studio hardware, sound engineering, and gear.',
    icon: 'Music',
  },
  mythology_creatures: {
    title: 'Mythology & Creatures',
    description: 'Mythological pantheons, legendary beasts, folklore, and epic lore.',
    icon: 'Flame',
  },
  nature_animals: {
    title: 'Nature & Animals',
    description: 'Wildlife, animal superpowers, marine ecosystems, and biodiversity.',
    icon: 'PawPrint',
  },
  places_facilities: {
    title: 'Places & Facilities',
    description: 'Urban infrastructure, historic sites, architectural wonders, and civic spaces.',
    icon: 'Building',
  },
  pop_culture_classics: {
    title: 'Pop Culture & Classics',
    description: 'Cinema legends, animation, gaming icons, classic literature, and art.',
    icon: 'Film',
  },
  school_learning: {
    title: 'School & Learning',
    description: 'Classroom tools, educational science, foundational learning, and academic concepts.',
    icon: 'GraduationCap',
  },
  space_earth: {
    title: 'Space & Earth',
    description: 'Cosmic wonders, astronomy, planetary science, and natural phenomena.',
    icon: 'Compass',
  },
  sports_games: {
    title: 'Sports & Games',
    description: 'Athletic sports, board games, tabletop challenges, and competitive play.',
    icon: 'Trophy',
  },
  vehicles_technology: {
    title: 'Vehicles & Technology',
    description: 'Aviation, automotive, robotics, computing breakthroughs, and transport.',
    icon: 'Cpu',
  },
  global_brands: {
    title: 'Global Brands & Icons',
    description: 'World-famous corporate brands, iconic logos, tech giants, automotive legends, and consumer empires.',
    icon: 'Award',
  },
  anime_manga: {
    title: 'Anime & Manga Universe',
    description: 'Iconic anime series, legendary shonen heroes, psychological thrillers, mecha epics, and Studio Ghibli masterpieces.',
    icon: 'Tv',
  },
  gaming_esports: {
    title: 'Video Games & Esports',
    description: 'Legendary video game franchises, esports titles, gaming icons, sandbox worlds, and RPG lore.',
    icon: 'Gamepad2',
  },
  modern_cinema_tv: {
    title: 'Modern Pop Franchises & Cinema',
    description: 'Iconic movie franchises, superhero universes, sci-fi space sagas, fantasy epics, and binge-worthy TV series.',
    icon: 'Film',
  },
};

function formatTitleFromId(id) {
  return id
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function syncTaxonomy() {
  const entityDir = path.join(process.cwd(), '.quiz-studio', 'knowledge_base', 'entities');
  const taxonomyPath = path.join(process.cwd(), '.quiz-studio', 'question_bank', 'taxonomy.json');

  const files = fs.readdirSync(entityDir).filter((f) => f.endsWith('.json'));
  const domainMap = new Map();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(entityDir, file), 'utf8');
    const entities = JSON.parse(raw);
    if (!Array.isArray(entities)) continue;

    for (const ent of entities) {
      const dId = ent.domain_id;
      if (!domainMap.has(dId)) {
        const meta = CANONICAL_DOMAIN_META[dId] || {
          title: formatTitleFromId(dId),
          description: `Questions and concepts covering ${formatTitleFromId(dId)}.`,
          icon: 'Sparkle',
        };
        domainMap.set(dId, {
          id: dId,
          title: meta.title,
          description: meta.description,
          icon: meta.icon,
          subtopicsMap: new Map(),
        });
      }

      const domain = domainMap.get(dId);
      if (ent.subtopic_id && !domain.subtopicsMap.has(ent.subtopic_id)) {
        domain.subtopicsMap.set(ent.subtopic_id, {
          id: ent.subtopic_id,
          title: formatTitleFromId(ent.subtopic_id),
          description: '',
        });
      }
    }
  }

  const domains = Array.from(domainMap.values()).map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    icon: d.icon,
    subtopics: Array.from(d.subtopicsMap.values()).sort((a, b) => a.id.localeCompare(b.id)),
  })).sort((a, b) => a.id.localeCompare(b.id));

  const taxonomy = {
    schema_version: 2,
    updated_at: new Date().toISOString(),
    domains,
  };

  fs.writeFileSync(taxonomyPath, JSON.stringify(taxonomy, null, 2), 'utf8');
  console.log(`Synced taxonomy: ${domains.length} domains written to ${taxonomyPath}`);
  return taxonomy;
}

if (process.argv[1] && process.argv[1].endsWith('syncTaxonomy.js')) {
  syncTaxonomy();
}
