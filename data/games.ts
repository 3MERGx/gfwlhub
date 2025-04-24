export type ActivationType = "Legacy (5x5)" | "Legacy (Per-Title)" | "SSA";
export type SupportStatus = "supported" | "testing" | "unsupported";

export interface Game {
  title: string;
  slug: string;
  activationType: ActivationType;
  status: SupportStatus;
  description?: string;
  discordLink?: string;
  redditLink?: string;
  featureEnabled?: boolean;
  downloadLink?: string;
  knownIssues?: string[];
  communityTips?: string[];
}

export const games: Game[] = [
  {
    title: "Shadowrun",
    slug: "shadowrun",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "A team-based, round-based multiplayer shooter that blends modern weaponry and ancient magic within a Shadowrun setting",
    discordLink: "https://discord.gg/ShadowrunFPS",
    redditLink: "https://reddit.com/r/ShadowrunFPS",
    featureEnabled: true,
    downloadLink:
      "https://mega.nz/file/5LdjgJQY#XMIClDPN0j0p7FrjNTGL3518OU3nrJl-xCA5W5jZZcg",

    knownIssues: [
      "Some users may experience sign-in issues on the first attempt",
      "Achievements may not sync properly in some cases",
    ],
    communityTips: [
      "Join our Discord server to share and find more tips from other players!",
    ],
  },
  {
    title: "007: Quantum of Solace",
    slug: "007-quantum-of-solace",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "First-person shooter based on the James Bond film of the same name.",
    knownIssues: [
      "Some users may experience sign-in issues on the first attempt",
      "Achievements may not sync properly in some cases",
    ],
    communityTips: [
      "Join our Discord server to share and find more tips from other players!",
    ],
  },
  {
    title: "Ace Combat: Assault Horizon - Enhanced Edition",
    slug: "ace-combat-assault-horizon",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Combat flight simulator with modern aircraft and helicopters.",
  },
  {
    title: "Age of Empires Online",
    slug: "age-of-empires-online",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Free-to-play real-time strategy game with persistent civilizations.",
  },
  {
    title: "AFL Live",
    slug: "afl-live",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description: "Australian Football League sports simulation game.",
  },
  {
    title: "Batman: Arkham Asylum",
    slug: "batman-arkham-asylum",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Action-adventure game featuring Batman in Gotham's infamous asylum.",
  },
  {
    title: "Batman: Arkham City",
    slug: "batman-arkham-city",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Open-world sequel to Batman: Arkham Asylum set in a prison district.",
  },
  {
    title: "Battle vs. Chess",
    slug: "battle-vs-chess",
    activationType: "SSA",
    status: "unsupported",
    description: "Chess game with battle animations and various game modes.",
  },
  {
    title: "Battlestations: Pacific",
    slug: "battlestations-pacific",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Naval and aerial combat simulator set in the Pacific theater of WWII.",
  },
  {
    title: "BioShock 2",
    slug: "bioshock-2",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "First-person shooter and sequel to BioShock, set in the underwater city of Rapture.",
  },
  {
    title: "Blacklight: Tango Down",
    slug: "blacklight-tango-down",
    activationType: "SSA",
    status: "unsupported",
    description: "Futuristic first-person shooter with multiplayer focus.",
  },
  {
    title: "BlazBlue: Calamity Trigger",
    slug: "blazblue-calamity-trigger",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "2D fighting game with anime-style graphics and complex mechanics.",
  },
  {
    title: "Bulletstorm",
    slug: "bulletstorm",
    activationType: "SSA",
    status: "unsupported",
    description: "First-person shooter that rewards creative kills and combos.",
  },
  {
    title: "CarneyVale: Showtime",
    slug: "carneyvale-showtime",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Physics-based puzzle game where you control an acrobat through dangerous circus acts.",
  },
  {
    title: "Colin McRae: DiRT 2",
    slug: "colin-mcrae-dirt-2",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Off-road racing game featuring various disciplines of rally racing.",
  },
  {
    title: "Crash Time 4: The Syndicate",
    slug: "crash-time-4",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Racing and action game based on the German TV series 'Alarm for Cobra 11'.",
  },
  {
    title: "Dark Souls: Prepare to Die Edition",
    slug: "dark-souls-prepare-to-die",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Challenging action RPG known for its difficulty and atmospheric world.",
  },
  {
    title: "Dark Void",
    slug: "dark-void",
    activationType: "SSA",
    status: "unsupported",
    description: "Third-person shooter with jetpack-based aerial combat.",
  },
  {
    title: "Dead Rising 2",
    slug: "dead-rising-2",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Open-world survival horror game featuring zombie hordes and improvised weapons.",
  },
  {
    title: "Dead Rising 2: Off the Record",
    slug: "dead-rising-2-off-the-record",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Alternate version of Dead Rising 2 featuring Frank West from the original game.",
  },
  {
    title: "DiRT 3",
    slug: "dirt-3",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Rally racing game with various disciplines and weather conditions.",
  },
  {
    title: "F1 2010",
    slug: "f1-2010",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Official Formula 1 racing simulation game for the 2010 season.",
  },
  {
    title: "F1 2011",
    slug: "f1-2011",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Official Formula 1 racing simulation game for the 2011 season.",
  },
  {
    title: "Fable III",
    slug: "fable-3",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Action RPG where players can shape the world of Albion through their choices.",
  },
  {
    title: "Fallout 3",
    slug: "fallout-3",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Post-apocalyptic open-world RPG set in the ruins of Washington D.C.",
  },
  {
    title: "FlatOut: Ultimate Carnage",
    slug: "flatout-ultimate-carnage",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Demolition derby-style racing game with destructible environments.",
  },
  {
    title: "Fuel",
    slug: "fuel",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Open-world racing game set in a post-apocalyptic United States.",
  },
  {
    title: "Game Room",
    slug: "game-room",
    activationType: "SSA",
    status: "unsupported",
    description: "Virtual arcade featuring classic arcade and console games.",
  },
  {
    title: "Gears of War",
    slug: "gears-of-war",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Third-person shooter featuring humanity's struggle against the Locust Horde.",
  },
  {
    title: "Gotham City Impostors",
    slug: "gotham-city-impostors",
    activationType: "SSA",
    status: "unsupported",
    description:
      "First-person shooter set in the Batman universe with customizable characters.",
  },
  {
    title: "Grand Theft Auto IV",
    slug: "grand-theft-auto-4",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Open-world action game following immigrant Niko Bellic in Liberty City.",
    discordLink: "https://discord.gg/yJk32PapSx",
    redditLink: "",
    downloadLink: "",
    knownIssues: [
      "Some users may experience sign-in issues on the first attempt",
      "Achievements may not sync properly in some cases",
    ],
    communityTips: [
      "Join our Discord server to share and find more tips from other players!",
    ],
  },
  {
    title: "Grand Theft Auto: Episodes from Liberty City",
    slug: "grand-theft-auto-episodes-from-liberty-city",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Standalone expansion for GTA IV featuring two additional stories.",
  },
  {
    title: "Halo 2",
    slug: "halo-2",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "First-person shooter continuing Master Chief's battle against the Covenant.",
  },
  {
    title: "Hour of Victory",
    slug: "hour-of-victory",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "World War II first-person shooter with multiple playable characters.",
  },
  {
    title: "Insanely Twisted Shadow Planet",
    slug: "insanely-twisted-shadow-planet",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description: "2D action-adventure game with unique silhouette art style.",
  },
  {
    title: "Iron Brigade",
    slug: "iron-brigade",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Tower defense and third-person shooter hybrid set in an alternate 1940s.",
  },
  {
    title: "Kane & Lynch: Dead Men",
    slug: "kane-and-lynch-dead-men",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Third-person shooter following two criminals on a violent journey.",
  },
  {
    title: "Legend of the Galactic Heroes",
    slug: "legend-of-the-galactic-heroes",
    activationType: "Legacy (5x5)",
    status: "supported",
    description: "Strategy game based on the anime series of the same name.",
  },
  {
    title: "Lost Planet 2",
    slug: "lost-planet-2",
    activationType: "SSA",
    status: "unsupported",
    description: "Third-person shooter set on the hostile planet E.D.N. III.",
  },
  {
    title: "Lost Planet: Extreme Condition Colonies Edition",
    slug: "lost-planet-extreme-condition",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Enhanced version of the third-person shooter with additional content.",
  },
  {
    title: "Mahjong Tales: Ancient Wisdom",
    slug: "mahjong-tales",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Tile-matching puzzle game based on the classic Chinese game Mahjong.",
  },
  {
    title: "Microsoft Flight",
    slug: "microsoft-flight",
    activationType: "SSA",
    status: "unsupported",
    description: "Free-to-play flight simulator focusing on accessibility.",
  },
  {
    title: "Mortal Kombat Arcade Kollection",
    slug: "mortal-kombat-arcade-kollection",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description: "Collection of the first three Mortal Kombat arcade games.",
  },
  {
    title: "Ms. Splosion Man",
    slug: "ms-splosion-man",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Platform game where the main character navigates by exploding herself.",
  },
  {
    title: "Operation Flashpoint: Red River",
    slug: "operation-flashpoint-red-river",
    activationType: "SSA",
    status: "unsupported",
    description: "Tactical first-person shooter set in Tajikistan.",
  },
  {
    title: "Osmos",
    slug: "osmos",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Ambient puzzle game where players absorb smaller cells to grow.",
  },
  {
    title: "Red Faction: Guerrilla",
    slug: "red-faction-guerrilla",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Open-world third-person shooter with destructible environments on Mars.",
  },
  {
    title: "Resident Evil 5",
    slug: "resident-evil-5",
    activationType: "Legacy (5x5)",
    status: "supported",
    description: "Third-person shooter and survival horror game set in Africa.",
  },
  {
    title: "Resident Evil: Operation Raccoon City",
    slug: "resident-evil-operation-raccoon-city",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description:
      "Team-based third-person shooter set during the Raccoon City incident.",
  },
  {
    title: "Rugby League Live",
    slug: "rugby-league-live",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description: "Rugby simulation game featuring teams from various leagues.",
  },
  {
    title: "Section 8",
    slug: "section-8",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Sci-fi first-person shooter with jetpacks and dynamic missions.",
  },
  {
    title: "Section 8: Prejudice",
    slug: "section-8-prejudice",
    activationType: "SSA",
    status: "unsupported",
    description: "Standalone expansion to Section 8 with enhanced gameplay.",
  },
  {
    title: "Star Wars: The Clone Wars - Republic Heroes",
    slug: "star-wars-the-clone-wars-republic-heroes",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Action-adventure game based on the Clone Wars animated series.",
  },
  {
    title: "Stormrise",
    slug: "stormrise",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Real-time strategy game with a unique control system called Whip Select.",
  },
  {
    title: "Street Fighter IV",
    slug: "street-fighter-4",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "2D fighting game with 3D graphics featuring classic and new characters.",
  },
  {
    title: "Street Fighter X Tekken",
    slug: "street-fighter-x-tekken",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Crossover fighting game combining characters from Street Fighter and Tekken.",
  },
  {
    title: "Super Street Fighter IV: Arcade Edition",
    slug: "super-street-fighter-4-arcade-edition",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Enhanced version of Street Fighter IV with additional characters and balance changes.",
  },
  {
    title: "Test Drive: Ferrari Racing Legends",
    slug: "test-drive-ferrari-racing-legends",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description:
      "Racing game featuring Ferrari cars from throughout the company's history.",
  },
  {
    title: "The Club",
    slug: "the-club",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Third-person shooter with arcade-style gameplay and scoring system.",
    discordLink: "https://discord.gg/rpBXqdDf6m",
  },
  {
    title: "Toy Soldiers",
    slug: "toy-soldiers",
    activationType: "SSA",
    status: "unsupported",
    description: "Tower defense game set in a World War I diorama.",
  },
  {
    title: "Tron: Evolution",
    slug: "tron-evolution",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description:
      "Third-person action game set between the original Tron film and Tron: Legacy.",
  },
  {
    title: "Universe at War: Earth Assault",
    slug: "universe-at-war-earth-assault",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Real-time strategy game featuring three unique alien factions battling on Earth.",
  },
  {
    title: "Vancouver 2010",
    slug: "vancouver-2010",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Official video game of the 2010 Winter Olympics in Vancouver.",
  },
  {
    title: "Virtua Tennis 4",
    slug: "virtua-tennis-4",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Tennis simulation game featuring professional players and various game modes.",
  },
  {
    title: "Viva Piñata",
    slug: "viva-pinata",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Simulation game where players create and maintain a garden to attract piñata creatures.",
  },
  {
    title: "Warhammer 40,000: Dawn of War II",
    slug: "warhammer-40000-dawn-of-war-2",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Real-time strategy game set in the Warhammer 40,000 universe with RPG elements.",
  },
  {
    title: "Where's Waldo? The Fantastic Journey",
    slug: "wheres-waldo-the-fantastic-journey",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Hidden object game based on the popular children's book series.",
  },
  {
    title: "World of Goo",
    slug: "world-of-goo",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Physics-based puzzle game where players build structures using balls of goo.",
  },
];
