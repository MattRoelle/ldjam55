export const BOARD_WIDTH = 32;
export const BOARD_HEIGHT = 32;
export const PLAYER_SPAWN_POSITION: Vec2 = [16, 16];

export const GAME_MAP: GameMapConfig = {
  spawns: [
    {
      id: "guide",
      npcId: "GUIDE",
      position: [16, 12],
      type: "interval",
      minTicks: 4,
      maxTicks: 8,
    },
    {
      id: "slime-1",
      npcId: "SLIME",
      position: [5, 5],
      type: "interval",
      minTicks: 4,
      maxTicks: 8,
    },
    {
      id: "goblin-1",
      npcId: "GOBLIN",
      position: [25, 25],
      type: "interval",
      minTicks: 10,
      maxTicks: 20,
    },
  ],
  tiles: {
    "0,0": {
      isSolid: true,
    },
  },
};

export const ITEM_LOOKUP = {
  HP_POT_1: {
    name: "Small HP Potion",
    consumable: {
      addHp: 5,
    },
    basePrice: 5,
  },
  RUSTY_SWORD: {
    weapon: {
      physicalAttack: 5,
      class: "melee",
      basePrice: 1,
    },
  },
  IRON_BAR: {
    basePrice: 10,
  },
};

export const NPC_LOOKUP = {
  GUIDE: {
    hp: 10,
    mode: "friendly",
  },
  SLIME: {
    hp: 10,
    mp: 0,
    mode: "hostile",
    drops: [
      {
        item: "hp-potion-1",
        chance: 10,
      },
    ],
  },
  GOBLIN: {
    hp: 20,
    mp: 0,
    mode: "hostile",
    drops: [
      {
        item: "iron-bar",
        chance: 15,
      },
    ],
  },
};

export type ItemInstance = {
  id: string;
  iid: ItemID;
};

export type NPCInfo = {
  id: string;
  npcId: NPCID;
  position: Vec2;
  hp: number;
  mp: number;
};

export type PlayerActions =
  | {
      type: "move-to";
      to: Vec2;
    }
  | {
      type: "pick-up-items";
      tile: Vec2;
    }
  | {
      type: "use-item";
      // Must be in player's inventory
      itemId: string;
    }
  | {
      type: "attack-npc";
      npcId: string;
    };

export type PlayerStates =
  | {
      type: "move";
      from: Vec2;
      to: Vec2;
      startedTick: number;
    }
  | {
      type: "idle";
    }
  | {
      type: "attacking-npc";
      npcId: string;
    };

export type PlayerInfo = {
  id: string;
  name: string;
  position: Vec2;
  state: PlayerStates;
  /**
   * Map of skill ID to experience points
   */
  skills: {
    strength: number;
    attack: number;
    defense: number;
    magic: number;
  };
  inventory: (ItemInstance | null)[];
  hp: number;
  mp: number;
};

export type GameMapTileConfig = {
  isSolid?: boolean;
  isWater?: boolean;
};

export type GameMapConfig = {
  spawns: NPCSpawnConfig[];
  // tileKey
  tiles: Record<string, GameMapTileConfig>;
};

export function tilekey(x: number, y: number): string {
  return `${x},${y}`;
}

export type NPCSpawnConfig = {
  id: string;
  npcId: NPCID;
  position: Vec2;
} & (
  | {
      type: "fixed";
    }
  | {
      type: "interval";
      minTicks: number;
      maxTicks: number;
    }
);

export type TileInstance = {
  npcs: NPCInfo[];
  items: ItemInstance[];
};

export type ServerCommand =
  | ({
      senderId: string;
    } & {
      type: "player-action";
      action: PlayerActions;
    })
  | {
      type: "connect";
    };

export type ServerLogMessasge = {
  tick: number;
  message: string;
};

export type ServerState = {
  tick: number;
  players: Record<string, PlayerInfo>;
  npcs: Record<string, NPCInfo>;
  commandQueue: ServerCommand[];
  log: ServerLogMessasge[];
  mapConfig: GameMapConfig;
  // tileKey
  map: Record<string, TileInstance>;
};

export type Vec2 = [number, number];
export type ActorInfo = PlayerInfo & NPCInfo;
export type NPCID = keyof typeof NPC_LOOKUP;
export type ItemID = keyof typeof ITEM_LOOKUP;
export type ItemInfo = (typeof ITEM_LOOKUP)[ItemID];
export type SkillType = keyof PlayerInfo["skills"];
