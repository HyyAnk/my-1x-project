import fs from 'node:fs';
import path from 'node:path';
import { validateEntities } from './validateKnowledgeEntities.js';
import { syncTaxonomy } from './syncTaxonomy.js';

const ENTITIES_DIR = path.join(process.cwd(), '.quiz-studio', 'knowledge_base', 'entities');
const BACKUP_ROOT = path.join(process.cwd(), '.quiz-studio', 'knowledge_base', 'backups');

// 1. Curated list of entities to remove per domain
const REMOVAL_CANDIDATES = {
  'anime_manga.json': new Set([
    'Guts',
    'Denji',
    'Makima',
    'Power',
    'Aki Hayakawa',
    'Seita Yokokawa',
    'Setsuko Yokokawa',
    'Ken Kaneki',
    'Touka Kirishima',
    'Johan Liebert',
    'Dr. Kenzo Tenma',
    'Shinya Kogami',
    'Shogo Makishima',
    'Akane Tsunemori',
    'Motoko Kusanagi',
    'Batou'
  ]),
  'gaming_esports.json': new Set([
    'Trevor Philips',
    'Michael De Santa',
    'Franklin Clinton',
    'Carl Johnson (CJ)',
    'Tommy Vercetti',
    'Senua',
    'Doom Slayer',
    'Isaac Clarke',
    'V',
    'Johnny Silverhand',
    'Lady Maria of the Astral Clocktower',
    'Isaac'
  ]),
  'modern_cinema_tv.json': new Set([
    'Homelander',
    'Jon Snow',
    'Daenerys Targaryen',
    'Tyrion Lannister',
    'Cersei Lannister',
    'Night King',
    'Arya Stark',
    'Walter White',
    'Jesse Pinkman',
    'Gustavo Fring',
    'Tony Soprano',
    'Thomas Shelby',
    'Arthur Shelby',
    'Dexter Morgan',
    'Kendall Roy',
    'Logan Roy'
  ]),
  'pop_culture_classics.json': new Set([
    'Vito Corleone',
    'Michael Corleone',
    'Norman Bates',
    'Hannibal Lecter'
  ]),
  'daily_objects.json': new Set([
    'Cigarette Lighter',
    'Safety Razor',
    'Cocktail Shaker',
    'Corkscrew'
  ]),
  'careers_occupations.json': new Set([
    'Forensic Pathologist',
    'Sommelier',
    'Brewmaster',
    'War Correspondent'
  ]),
  'human_body.json': new Set([
    'Urethra',
    'Rectum',
    'Duodenum',
    'Cecum',
    'Peritoneum',
    'Pleura',
    'Meninges',
    'Epiglottis',
    'Alveoli',
    'Thymus',
    'Pineal Gland',
    'Pituitary Gland',
    'Parathyroid Glands',
    'Adrenal Glands',
    'Spleen',
    'Gallbladder',
    'Ureters',
    'Semicircular Canals',
    'Olfactory Bulb',
    'Auditory Nerve',
    'Synapses',
    'Hippocampus',
    'Amygdala',
    'Sciatic Nerve',
    'Vagus Nerve',
    'Autonomic Nervous System',
    'Coronary Arteries',
    'Sebaceous Glands',
    'Proprioception'
  ]),
  'places_facilities.json': new Set([
    'Prison',
    'Wastewater Treatment Plant',
    'Civil Defense Bunker',
    'Casino Resort',
    'Nightclub Dance Hall'
  ]),
  'nature_animals.json': new Set([
    'Cat Flea',
    'Blacklegged Deer Tick',
    'Yellow Fever Mosquito',
    'Ringed Caecilian',
    'Olm',
    'Mudpuppy',
    'Hellbender'
  ]),
  'music_instruments_gear.json': new Set([
    '8-Track Tape Cartridge',
    '45 RPM Record Adapter',
    'Wax Cylinder Phonograph',
    'Graphic Audio Equalizer',
    'XLR Audio Cable'
  ]),
  'school_learning.json': new Set([
    'Aneroid Barometer',
    'Spring Dynamometer Scale',
    'Logarithmic Spiral'
  ]),
  'space_earth.json': new Set([
    'Stephenson 2-18',
    'UY Scuti',
    'VY Canis Majoris',
    'Barnard\'s Star',
    'Fomalhaut',
    'Canopus',
    'Spica',
    'Bellatrix',
    'Castor',
    'Pollux',
    'Altair',
    'Deneb',
    'Antares',
    'Aldebaran',
    'Regulus',
    'Vega',
    'Gravitational Singularity',
    'Accretion Disk',
    'Cosmic Microwave Background',
    'Heliopause',
    'Solar Prominence',
    'Coronal Mass Ejection',
    'Blazar',
    'Magnetar',
    'Quasar',
    'Hypernova',
    'Lunar Regolith',
    'Parsec',
    'Brown Dwarf',
    'Cosmic Ray',
    'Transit of Venus',
    'Ceres',
    'Eris',
    'Haumea',
    'Makemake',
    'Asteroid Bennu',
    'Asteroid Ryugu',
    'Asteroid Psyche',
    'Comet NEOWISE',
    'Comet Hale-Bopp'
  ]),
  'vehicles_technology.json': new Set([
    'Ballast Tamper Train',
    'Yard Switching Locomotive',
    'Container Well Car Train',
    'Auto-Rack Train',
    'Track Inspection Train',
    'Electric Multiple Unit',
    'Tilting Train',
    'Rotary Snowplow Train',
    'Heritage Steam Railcar',
    'Rail Tanker Train',
    'CNC Milling Machine',
    'Industrial Laser Cutter',
    'Waterjet Cutter',
    'Stationary Steam Engine',
    'Mechanical Loom',
    'Cotton Gin',
    'Road Grader',
    'Skid-Steer Loader',
    'Asphalt Paver',
    'Deep-Sea Bathyscaphe',
    'Cable-Laying Ship',
    'Heavy Lift Ship',
    'Dredger Ship',
    'Gyrocopter',
    'Tiltrotor Aircraft',
    'Ultralight Aircraft',
    'Crop Duster',
    'Glider Tow Plane',
    'Microjet',
    'Sailplane',
    'Aerial Refueling Tanker',
    'Turbo-Prop Commuter Plane'
  ])
};

// 2. Name Simplification Dictionary
const NAME_SIMPLIFICATIONS = {
  // School & Learning
  'Compound Optical Microscope': 'Microscope',
  'Borosilicate Chemistry Beaker': 'Beaker',
  'Mercury Clinical Thermometer': 'Thermometer',
  'Acoustic Stethoscope': 'Stethoscope',
  'Manual Pencil Sharpener': 'Pencil Sharpener',
  'Solid Glue Stick': 'Glue Stick',
  'Fluorescent Highlighter': 'Highlighter',
  'Steel Paperclip': 'Paperclip',
  'Zippered Pencil Case': 'Pencil Case',
  'Correction Tape Dispenser': 'Correction Tape',
  'Plastic Protractor': 'Protractor',
  'Glass Test Tube': 'Test Tube',
  'Desktop Stapler': 'Stapler',
  'Glass Petri Dish': 'Petri Dish',
  'Laboratory Bunsen Burner': 'Bunsen Burner',
  'Mechanical Balance Scale': 'Balance Scale',
  'Self-Adhesive Sticky Notes': 'Sticky Notes',
  'Paper Index Cards': 'Index Cards',
  'Classroom Desk Globe': 'Globe',
  'Lined Notebook': 'Notebook',
  'School Safety Scissors': 'Safety Scissors',
  'Three-Ring Binder': 'Binder',
  'Iron Filings Kit': 'Iron Filings',
  'Geometric Torus': 'Donut Shape',
  'Geometric Cube': 'Cube',
  'Solid Sphere': 'Sphere',
  'Circular Cylinder': 'Cylinder',
  'Square Pyramid': 'Pyramid',
  'Regular Hexagon': 'Hexagon',
  'Regular Octagon': 'Octagon',
  'Equilateral Triangle': 'Triangle',
  'Five-Pointed Star': 'Star',
  'Diamond Shape': 'Diamond',
  'Heart Shape': 'Heart',
  'Crescent Moon Shape': 'Crescent',
  'Instant Chemical Cold Pack': 'Cold Pack',
  'Sterile Cotton Swab': 'Cotton Swab',
  'Wooden Underarm Crutches': 'Crutches',
  'Elastic Compression Bandage': 'Elastic Bandage',
  'Antiseptic Wound Wipes': 'Antiseptic Wipes',
  'Sterile Saline Eye Drops': 'Eye Drops',
  'Surgical Face Mask': 'Face Mask',
  'School First Aid Kit Box': 'First Aid Kit',
  'Adhesive Bandage': 'Bandage',

  // Daily Objects
  'Door Key': 'Key',
  'Leather Wallet': 'Wallet',
  'Leather Belt': 'Belt',
  'Finger Ring': 'Ring',
  'Metal Coin': 'Coin',
  'Bed Pillow': 'Pillow',
  'Wool Blanket': 'Blanket',
  'Bed Mattress': 'Mattress',
  'Flower Vase': 'Vase',
  'Window Curtain': 'Curtain',
  'Bath Towel': 'Towel',
  'Wastepaper Basket': 'Wastebasket',
  'Claw Hammer': 'Hammer',
  'Common Nail': 'Nail',
  'Wood Screw': 'Screw',
  'Braided Rope': 'Rope',
  'Ceramic Mug': 'Mug',
  'Dinner Plate': 'Plate',
  'Cereal Bowl': 'Bowl',
  'Table Fork': 'Fork',
  'Soup Spoon': 'Spoon',
  'Ceramic Teapot': 'Teapot',
  'Wooden Rolling Pin': 'Rolling Pin',
  'Kitchen Chef Knife': 'Kitchen Knife',
  'Glass Mason Jar': 'Glass Jar',
  'Silicone Oven Mitt': 'Oven Mitt',
  'Digital Kitchen Scale': 'Kitchen Scale',

  // Vehicles & Tech
  'Commercial Airplane': 'Airplane',
  'Gasoline Sedan': 'Sedan',
  'Yellow School Bus': 'School Bus',
  'City Transit Bus': 'City Bus',
  'Tour Coach Bus': 'Tour Bus',
  'Ladder Fire Truck': 'Fire Truck',
  'Emergency Ambulance': 'Ambulance',
  'Police Cruiser': 'Police Car',
  'Semi-Trailer Truck': 'Semi Truck',
  'Construction Crane': 'Crane',
  'Warehouse Forklift': 'Forklift',
  'Cement Mixer Truck': 'Cement Mixer',
  'Heavy Dump Truck': 'Dump Truck',
  'Traditional Windmill': 'Windmill',
  'Modern Wind Turbine': 'Wind Turbine',
  'Electronic Calculator': 'Calculator',
  'Mechanical Typewriter': 'Typewriter',
  'Mechanical Clock': 'Clock',
  'Optical Telescope': 'Telescope',
  'Kitchen Blender': 'Blender',
  'Electric Toaster': 'Toaster',
  'Electric Fan': 'Fan',

  // Music & Audio
  'Dynamic Stage Microphone': 'Microphone',
  'Studio Condenser Microphone': 'Condenser Microphone',
  'Studio Monitor Headphones': 'Studio Headphones',
  'Boom Microphone Stand': 'Microphone Stand',
  'Retro Transistor Radio': 'Transistor Radio',
  'Compact Cassette Tape': 'Cassette Tape',
  'Personal Cassette Player': 'Cassette Player',
  'Portable CD Player': 'CD Player',
  'Steel Tuning Fork': 'Tuning Fork'
};

export function executeSanitization() {
  console.log('=== KNOWLEDGE BASE SANITIZATION & SIMPLIFICATION ===');
  
  // Step 1: Create Backup
  const timestamp = Date.now();
  const backupDir = path.join(BACKUP_ROOT, `pre_family_sanitization_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  
  const files = fs.readdirSync(ENTITIES_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    fs.copyFileSync(path.join(ENTITIES_DIR, f), path.join(backupDir, f));
  }
  console.log(`[Backup] Successfully saved ${files.length} entity files to: ${backupDir}`);

  let totalOriginal = 0;
  let totalDeduplicated = 0;
  let totalDeleted = 0;
  let totalSimplified = 0;
  let totalRemaining = 0;

  for (const file of files) {
    const filePath = path.join(ENTITIES_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const entities = JSON.parse(raw);
    totalOriginal += entities.length;

    // Detect 3-letter prefix from first entity
    const match = entities[0]?.id?.match(/^ENT-([A-Z]+)-/);
    const domainPrefix = match ? match[1] : 'ENT';

    const removalSet = REMOVAL_CANDIDATES[file] || new Set();
    const seenNames = new Set();
    const cleanedEntities = [];

    for (const ent of entities) {
      // Step A: Deduplication (keep first, skip consecutive/duplicate names)
      if (seenNames.has(ent.name)) {
        totalDeduplicated++;
        continue;
      }

      // Step B: Removal of inappropriate / overly difficult entities
      if (removalSet.has(ent.name)) {
        totalDeleted++;
        continue;
      }

      seenNames.add(ent.name);

      // Step C: Name Simplification
      if (NAME_SIMPLIFICATIONS[ent.name]) {
        const originalName = ent.name;
        const simplifiedName = NAME_SIMPLIFICATIONS[ent.name];
        
        // Ensure aliases array exists and preserve original technical name
        if (!Array.isArray(ent.aliases)) {
          ent.aliases = [];
        }
        if (!ent.aliases.includes(originalName)) {
          ent.aliases.unshift(originalName);
        }

        ent.name = simplifiedName;
        totalSimplified++;
      }

      cleanedEntities.push(ent);
    }

    // Step D: Re-sequence IDs sequentially
    cleanedEntities.forEach((ent, idx) => {
      const numStr = String(idx + 1).padStart(3, '0');
      ent.id = `ENT-${domainPrefix}-${numStr}`;
    });

    // Step E: Validate cleaned entities
    const errors = validateEntities(cleanedEntities, cleanedEntities[0]?.domain_id);
    if (errors.length > 0) {
      console.error(`[Validation Failed] ${file} had ${errors.length} errors:`);
      console.error(errors.slice(0, 10).join('\n'));
      throw new Error(`Sanitization aborted due to validation failure on ${file}`);
    }

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(cleanedEntities, null, 2) + '\n', 'utf8');
    totalRemaining += cleanedEntities.length;
    console.log(`[${file}] Cleaned: ${entities.length} -> ${cleanedEntities.length} entities (Prefix: ENT-${domainPrefix}-)`);
  }

  console.log('\n=== SANITIZATION SUMMARY ===');
  console.log(`Original Entities:      ${totalOriginal}`);
  console.log(`Duplicates Removed:     ${totalDeduplicated}`);
  console.log(`Inappropriate Deleted:  ${totalDeleted}`);
  console.log(`Names Simplified:       ${totalSimplified}`);
  console.log(`Final Active Entities:  ${totalRemaining}`);

  // Step F: Synchronize Taxonomy
  console.log('\n[Taxonomy] Synchronizing question bank taxonomy...');
  syncTaxonomy();
  console.log('[Taxonomy] Synchronization complete.');
}

if (process.argv[1] && process.argv[1].endsWith('sanitizeKnowledgeEntities.js')) {
  executeSanitization();
}
