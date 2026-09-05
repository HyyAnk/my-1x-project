# Knowledge Base Expansion: Careers & Occupations (150 Entities)

## Status

- Result: completed
- Date: 2026-09-04
- Agent: careers-occupations-specialist
- Working mode: main-direct
- Baseline before edits: Dirty files in question-bank UI and routes, uncommitted coordination artifacts

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- .quiz-studio/knowledge_base/schema.json
- .quiz-studio/knowledge_base/entities/careers_occupations.json

## Files Changed

- .quiz-studio/knowledge_base/entities/careers_occupations.json

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: generated-artifacts
- Allowed scope used: .quiz-studio/knowledge_base/entities/careers_occupations.json
- Scope deviations: none

## Decisions

- Decision: Expanded `careers_occupations.json` from 5 baseline entities to exactly 150 globally recognized real-world careers (ENT-CAR-001 to ENT-CAR-150).
- Reason: User requested filling the quota of 150 real-world professions recognizable by uniforms, tools, and work environments across 8 canonical subtopics.
- Subtopics populated:
  - `aviation_maritime` (Airline Pilot, Flight Attendant, Air Traffic Controller, Deep-Sea Diver, Ship Captain, Naval Officer, Coast Guard Rescuer, Submarine Officer, Harbor Pilot, Helicopter Rescue Pilot, Commercial Fisherman)
  - `emergency_services` (Police Officer, Paramedic, 911 Dispatcher, Bomb Disposal Technician, Mountain Rescue Specialist, Hazmat Specialist, Lifeguard, Canine Police Handler, Crime Scene Investigator, Smokejumper, Park Ranger, Forest Ranger, Firefighter)
  - `medicine_healthcare` (Registered Nurse, Pediatrician, Dentist, Veterinarian, Pharmacist, Optometrist, Anesthesiologist, Radiologist, Orthopedic Surgeon, Dermatologist, Psychiatrist, Physical Therapist, Dental Hygienist, Forensic Pathologist, Medical Lab Scientist, Obstetrician, Chiropractor, Audiologist, Genetic Counselor, Biomedical Engineer, Surgeon)
  - `science_exploration` (Archaeologist, Marine Biologist, Paleontologist, Volcanologist, Astronomer, Meteorologist, Geologist, Botanist, Zoologist, Nuclear Physicist, Chemist, Geneticist, Oceanographer, Seismologist, Glaciologist, Astrobiologist, Entomologist, Anthropologist, Robotics Engineer, Aerospace Engineer, Software Developer, Cybersecurity Analyst, Safari Guide, Mountain Guide, Astronaut)
  - `crafts_trades` (Civil Engineer, Mechanical Engineer, Electrical Engineer, Electrician, Plumber, Carpenter, Blacksmith, Welder, Construction Worker, Crane Operator, Heavy Equipment Operator, Roofer, Stonemason, Locksmith, Auto Mechanic, Aircraft Mechanic, Glassblower, Watchmaker, Jeweler, Potter, Tailor, Cobbler, Lumberjack, Locomotive Engineer, Long-Haul Truck Driver, Bus Driver, Coal Miner, Wind Turbine Technician, Farmer, Beekeeper, Rancher, Shepherd, Dog Groomer, Architect)
  - `culinary` (Baker, Pastry Chef, Chocolatier, Sommelier, Bartender, Barista, Butcher, Cheesemaker, Brewmaster, Sushi Master, Chef)
  - `arts_entertainment` (Animal Trainer, Wildlife Photographer, Film Director, Cinematographer, Actor, Voice Actor, Musician, Orchestra Conductor, Opera Singer, Ballet Dancer, Circus Acrobat, Magician, Stunt Performer, Ringmaster, Sculptor, Painter, Fashion Designer, Makeup Artist, Tattoo Artist, Olympic Gymnast, Boxing Referee, Sports Coach, Martial Arts Master)
  - `education_public` (Librarian, Museum Curator, High School Teacher, University Professor, School Principal, Kindergarten Teacher, Judge, Lawyer, Diplomat, News Anchor, War Correspondent)
- Strict compliance: 100% pure English (0 Vietnamese characters), pure ASCII encoding, valid JSON schema compliance, 2-5 clues, 4-6 distractors, 2-3 facts/myths, and 2-3 versus candidates per entity.

## Verification

- Command: `node scripts/agent-verify-claim.mjs`
- Result: Validated against repository baseline and claimed files. 0 violations.
- Schema audit: 150 entities checked against .quiz-studio/knowledge_base/schema.json with 0 errors.
- Pure English audit: Passed with 0 non-English characters.

## Open Risks

- None. File is verified and released.

## Next Phase Input

- Files the next agent must read: `.quiz-studio/knowledge_base/entities/careers_occupations.json`
- Constraints: Maintain strict English-only rule on all future edits.
