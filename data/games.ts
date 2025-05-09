export type ActivationType = "Legacy (5x5)" | "Legacy (Per-Title)" | "SSA";
export type SupportStatus = "supported" | "testing" | "unsupported";

export interface Game {
  id: string;
  title: string;
  slug: string;
  activationType: ActivationType;
  status: SupportStatus;
  description: string;
  releaseDate: string;
  developer: string;
  publisher: string;
  genres: string[];
  platforms: string[];
  imageUrl?: string;
  discordLink?: string;
  redditLink?: string;
  featureEnabled?: boolean;
  downloadLink?: string;
  fileName?: string;
  virusTotalHash?: string;
  knownIssues?: string[];
  communityTips?: string[];
}

export const games: Game[] = [
  {
    id: "shadowrun",
    title: "Shadowrun",
    slug: "shadowrun",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "A team-based, round-based multiplayer shooter that blends modern weaponry and ancient magic within a Shadowrun setting",
    releaseDate: "May 29, 2007",
    developer: "FASA Studios",
    publisher: "Microsoft Studios",
    genres: ["Action", "Adventure", "First-Person Shooter"],
    platforms: ["Windows"],
    // imageUrl:
    //   "https://thumbnails.pcgamingwiki.com/c/c2/Shadowrun_cover.jpg/300px-Shadowrun_cover.jpg",
    discordLink: "https://discord.gg/shadowrun",
    redditLink: "https://www.reddit.com/r/shadowrunfps/",
    featureEnabled: true,
    downloadLink:
      "http://157.245.214.234/releases/Shadowrun%20FPS%20Launcher.exe",
    fileName: "Shadowrun Launcher",
    virusTotalHash:
      "87adfa7b167930934a738bfa2ee53e9d110dc51d6cb072063f6c86708fdabb58",
    knownIssues: [
      "Some users may experience sign-in issues on the first attempt",
      "Achievements may not sync properly in some cases",
      "Must install GFWL & DirectX to run.",
    ],
    communityTips: [
      "Join our Discord server to share and find more tips from other players!",
    ],
  },
  {
    id: "007-quantum-of-solace",
    title: "007: Quantum of Solace",
    slug: "007-quantum-of-solace",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "First-person shooter based on the James Bond film of the same name.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
    knownIssues: [
      "Some users may experience sign-in issues on the first attempt",
      "Achievements may not sync properly in some cases",
    ],
    communityTips: [
      "Join our Discord server to share and find more tips from other players!",
    ],
  },
  {
    id: "ace-combat-assault-horizon",
    title: "Ace Combat: Assault Horizon - Enhanced Edition",
    slug: "ace-combat-assault-horizon",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Combat flight simulator with modern aircraft and helicopters.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "age-of-empires-online",
    title: "Age of Empires Online",
    slug: "age-of-empires-online",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Free-to-play real-time strategy game with persistent civilizations.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "afl-live",
    title: "AFL Live",
    slug: "afl-live",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description: "Australian Football League sports simulation game.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "batman-arkham-asylum",
    title: "Batman: Arkham Asylum",
    slug: "batman-arkham-asylum",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Action-adventure game featuring Batman in Gotham's infamous asylum.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "batman-arkham-city",
    title: "Batman: Arkham City",
    slug: "batman-arkham-city",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Open-world sequel to Batman: Arkham Asylum set in a prison district.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "battle-vs-chess",
    title: "Battle vs. Chess",
    slug: "battle-vs-chess",
    activationType: "SSA",
    status: "unsupported",
    description: "Chess game with battle animations and various game modes.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "battlestations-pacific",
    title: "Battlestations: Pacific",
    slug: "battlestations-pacific",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Naval and aerial combat simulator set in the Pacific theater of WWII.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "bioshock-2",
    title: "BioShock 2",
    slug: "bioshock-2",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "First-person shooter and sequel to BioShock, set in the underwater city of Rapture.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "blacklight-tango-down",
    title: "Blacklight: Tango Down",
    slug: "blacklight-tango-down",
    activationType: "SSA",
    status: "unsupported",
    description: "Futuristic first-person shooter with multiplayer focus.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "blazblue-calamity-trigger",
    title: "BlazBlue: Calamity Trigger",
    slug: "blazblue-calamity-trigger",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "2D fighting game with anime-style graphics and complex mechanics.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "bulletstorm",
    title: "Bulletstorm",
    slug: "bulletstorm",
    activationType: "SSA",
    status: "unsupported",
    description: "First-person shooter that rewards creative kills and combos.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "carneyvale-showtime",
    title: "CarneyVale: Showtime",
    slug: "carneyvale-showtime",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Physics-based puzzle game where you control an acrobat through dangerous circus acts.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "colin-mcrae-dirt-2",
    title: "Colin McRae: DiRT 2",
    slug: "colin-mcrae-dirt-2",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Off-road racing game featuring various disciplines of rally racing.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "crash-time-4",
    title: "Crash Time 4: The Syndicate",
    slug: "crash-time-4",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Racing and action game based on the German TV series 'Alarm for Cobra 11'.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "dark-souls-prepare-to-die",
    title: "Dark Souls: Prepare to Die Edition",
    slug: "dark-souls-prepare-to-die",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Challenging action RPG known for its difficulty and atmospheric world.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "dark-void",
    title: "Dark Void",
    slug: "dark-void",
    activationType: "SSA",
    status: "unsupported",
    description: "Third-person shooter with jetpack-based aerial combat.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "dead-rising-2",
    title: "Dead Rising 2",
    slug: "dead-rising-2",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Open-world survival horror game featuring zombie hordes and improvised weapons.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "dead-rising-2-off-the-record",
    title: "Dead Rising 2: Off the Record",
    slug: "dead-rising-2-off-the-record",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Alternate version of Dead Rising 2 featuring Frank West from the original game.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "dirt-3",
    title: "DiRT 3",
    slug: "dirt-3",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Rally racing game with various disciplines and weather conditions.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "f1-2010",
    title: "F1 2010",
    slug: "f1-2010",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Official Formula 1 racing simulation game for the 2010 season.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "f1-2011",
    title: "F1 2011",
    slug: "f1-2011",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Official Formula 1 racing simulation game for the 2011 season.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "fable-3",
    title: "Fable III",
    slug: "fable-3",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Action RPG where players can shape the world of Albion through their choices.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "fallout-3",
    title: "Fallout 3",
    slug: "fallout-3",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Post-apocalyptic open-world RPG set in the ruins of Washington D.C.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "flatout-ultimate-carnage",
    title: "FlatOut: Ultimate Carnage",
    slug: "flatout-ultimate-carnage",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Demolition derby-style racing game with destructible environments.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "fuel",
    title: "Fuel",
    slug: "fuel",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Open-world racing game set in a post-apocalyptic United States.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "game-room",
    title: "Game Room",
    slug: "game-room",
    activationType: "SSA",
    status: "unsupported",
    description: "Virtual arcade featuring classic arcade and console games.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "gears-of-war",
    title: "Gears of War",
    slug: "gears-of-war",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Third-person shooter featuring humanity's struggle against the Locust Horde.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "gotham-city-impostors",
    title: "Gotham City Impostors",
    slug: "gotham-city-impostors",
    activationType: "SSA",
    status: "unsupported",
    description:
      "First-person shooter set in the Batman universe with customizable characters.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "grand-theft-auto-4",
    title: "Grand Theft Auto IV",
    slug: "grand-theft-auto-4",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Open-world action game following immigrant Niko Bellic in Liberty City.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
    discordLink: "https://discord.gg/yJk32PapSx",
    redditLink: "",
    downloadLink: "",
    virusTotalHash: "",
    knownIssues: [
      "Some users may experience sign-in issues on the first attempt",
      "Achievements may not sync properly in some cases",
    ],
    communityTips: [
      "Join our Discord server to share and find more tips from other players!",
    ],
  },
  {
    id: "grand-theft-auto-episodes-from-liberty-city",
    title: "Grand Theft Auto: Episodes from Liberty City",
    slug: "grand-theft-auto-episodes-from-liberty-city",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Standalone expansion for GTA IV featuring two additional stories.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "halo-2",
    title: "Halo 2",
    slug: "halo-2",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "First-person shooter continuing Master Chief's battle against the Covenant.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "hour-of-victory",
    title: "Hour of Victory",
    slug: "hour-of-victory",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "World War II first-person shooter with multiple playable characters.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "insanely-twisted-shadow-planet",
    title: "Insanely Twisted Shadow Planet",
    slug: "insanely-twisted-shadow-planet",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description: "2D action-adventure game with unique silhouette art style.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "iron-brigade",
    title: "Iron Brigade",
    slug: "iron-brigade",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Tower defense and third-person shooter hybrid set in an alternate 1940s.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "kane-and-lynch-dead-men",
    title: "Kane & Lynch: Dead Men",
    slug: "kane-and-lynch-dead-men",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Third-person shooter following two criminals on a violent journey.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "legend-of-the-galactic-heroes",
    title: "Legend of the Galactic Heroes",
    slug: "legend-of-the-galactic-heroes",
    activationType: "Legacy (5x5)",
    status: "supported",
    description: "Strategy game based on the anime series of the same name.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "lost-planet-2",
    title: "Lost Planet 2",
    slug: "lost-planet-2",
    activationType: "SSA",
    status: "unsupported",
    description: "Third-person shooter set on the hostile planet E.D.N. III.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "lost-planet-extreme-condition",
    title: "Lost Planet: Extreme Condition Colonies Edition",
    slug: "lost-planet-extreme-condition",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Enhanced version of the third-person shooter with additional content.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "mahjong-tales",
    title: "Mahjong Tales: Ancient Wisdom",
    slug: "mahjong-tales",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Tile-matching puzzle game based on the classic Chinese game Mahjong.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "microsoft-flight",
    title: "Microsoft Flight",
    slug: "microsoft-flight",
    activationType: "SSA",
    status: "unsupported",
    description: "Free-to-play flight simulator focusing on accessibility.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "mortal-kombat-arcade-kollection",
    title: "Mortal Kombat Arcade Kollection",
    slug: "mortal-kombat-arcade-kollection",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description: "Collection of the first three Mortal Kombat arcade games.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "ms-splosion-man",
    title: "Ms. Splosion Man",
    slug: "ms-splosion-man",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Platform game where the main character navigates by exploding herself.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "operation-flashpoint-red-river",
    title: "Operation Flashpoint: Red River",
    slug: "operation-flashpoint-red-river",
    activationType: "SSA",
    status: "unsupported",
    description: "Tactical first-person shooter set in Tajikistan.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "osmos",
    title: "Osmos",
    slug: "osmos",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Ambient puzzle game where players absorb smaller cells to grow.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "red-faction-guerrilla",
    title: "Red Faction: Guerrilla",
    slug: "red-faction-guerrilla",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Open-world third-person shooter with destructible environments on Mars.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "resident-evil-5",
    title: "Resident Evil 5",
    slug: "resident-evil-5",
    activationType: "Legacy (5x5)",
    status: "supported",
    description: "Third-person shooter and survival horror game set in Africa.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "resident-evil-operation-raccoon-city",
    title: "Resident Evil: Operation Raccoon City",
    slug: "resident-evil-operation-raccoon-city",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description:
      "Team-based third-person shooter set during the Raccoon City incident.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "rugby-league-live",
    title: "Rugby League Live",
    slug: "rugby-league-live",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description: "Rugby simulation game featuring teams from various leagues.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "section-8",
    title: "Section 8",
    slug: "section-8",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Sci-fi first-person shooter with jetpacks and dynamic missions.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "section-8-prejudice",
    title: "Section 8: Prejudice",
    slug: "section-8-prejudice",
    activationType: "SSA",
    status: "unsupported",
    description: "Standalone expansion to Section 8 with enhanced gameplay.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "star-wars-the-clone-wars-republic-heroes",
    title: "Star Wars: The Clone Wars - Republic Heroes",
    slug: "star-wars-the-clone-wars-republic-heroes",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Action-adventure game based on the Clone Wars animated series.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "stormrise",
    title: "Stormrise",
    slug: "stormrise",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Real-time strategy game with a unique control system called Whip Select.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "street-fighter-4",
    title: "Street Fighter IV",
    slug: "street-fighter-4",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "2D fighting game with 3D graphics featuring classic and new characters.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "street-fighter-x-tekken",
    title: "Street Fighter X Tekken",
    slug: "street-fighter-x-tekken",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Crossover fighting game combining characters from Street Fighter and Tekken.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "super-street-fighter-4-arcade-edition",
    title: "Super Street Fighter IV: Arcade Edition",
    slug: "super-street-fighter-4-arcade-edition",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Enhanced version of Street Fighter IV with additional characters and balance changes.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "test-drive-ferrari-racing-legends",
    title: "Test Drive: Ferrari Racing Legends",
    slug: "test-drive-ferrari-racing-legends",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description:
      "Racing game featuring Ferrari cars from throughout the company's history.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "the-club",
    title: "The Club",
    slug: "the-club",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Third-person shooter with arcade-style gameplay and scoring system.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
    discordLink: "https://discord.gg/rpBXqdDf6m",
  },
  {
    id: "toy-soldiers",
    title: "Toy Soldiers",
    slug: "toy-soldiers",
    activationType: "SSA",
    status: "unsupported",
    description: "Tower defense game set in a World War I diorama.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "tron-evolution",
    title: "Tron: Evolution",
    slug: "tron-evolution",
    activationType: "Legacy (Per-Title)",
    status: "testing",
    description:
      "Third-person action game set between the original Tron film and Tron: Legacy.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "universe-at-war-earth-assault",
    title: "Universe at War: Earth Assault",
    slug: "universe-at-war-earth-assault",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Real-time strategy game featuring three unique alien factions battling on Earth.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "vancouver-2010",
    title: "Vancouver 2010",
    slug: "vancouver-2010",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Official video game of the 2010 Winter Olympics in Vancouver.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "virtua-tennis-4",
    title: "Virtua Tennis 4",
    slug: "virtua-tennis-4",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Tennis simulation game featuring professional players and various game modes.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "viva-pinata",
    title: "Viva Piñata",
    slug: "viva-pinata",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Simulation game where players create and maintain a garden to attract piñata creatures.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "warhammer-40000-dawn-of-war-2",
    title: "Warhammer 40,000: Dawn of War II",
    slug: "warhammer-40000-dawn-of-war-2",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Real-time strategy game set in the Warhammer 40,000 universe with RPG elements.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "wheres-waldo-the-fantastic-journey",
    title: "Where's Waldo? The Fantastic Journey",
    slug: "wheres-waldo-the-fantastic-journey",
    activationType: "SSA",
    status: "unsupported",
    description:
      "Hidden object game based on the popular children's book series.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
  {
    id: "world-of-goo",
    title: "World of Goo",
    slug: "world-of-goo",
    activationType: "Legacy (5x5)",
    status: "supported",
    description:
      "Physics-based puzzle game where players build structures using balls of goo.",
    releaseDate: "",
    developer: "",
    publisher: "",
    genres: [],
    platforms: [],
    imageUrl: "",
  },
];
