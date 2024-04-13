export const BOARD_WIDTH = 64;
export const BOARD_HEIGHT = 64;
export const BOARD_TOP_LEFT: Vec2 = [0, 0];
export const BOARD_TOP_RIGHT: Vec2 = [BOARD_WIDTH - 1, 0];
export const BOARD_BOTTOM_RIGHT: Vec2 = [BOARD_WIDTH - 1, BOARD_HEIGHT - 1];
export const BOARD_BOTTOM_LEFT: Vec2 = [0, BOARD_HEIGHT - 1];
export const BOARD_CENTER: Vec2 = [BOARD_WIDTH / 2, BOARD_HEIGHT / 2];
export const PLAYER_SPAWN_POSITION: Vec2 = [32, 32];

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
  iid: ItemID;
};

export type NPCInfo = {
  id: string;
  position: Vec2;
  hp: number;
  mp: number;
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
  inventory: ItemInstance[];
  hp: number;
  mp: number;
};

export type NPCSpawnConfig = {
  npcId: NPCID;
  position: Vec2;
} & (
  | {
      type: "fixed";
    }
  | {
      type: "interval";
      minSeconds: number;
      maxSeconds: number;
    }
);

export type TileInstance = {
  npcs: NPCInfo[];
  items: ItemInstance[];
};

export type ServerState = {
  tick: number;
  players: Record<string, PlayerInfo>;
  npcs: Record<string, NPCInfo>;
  mapData: {
    [x: number]: {
      [y: number]: TileInstance;
    };
  };
};

export type Vec2 = [number, number];
export type ActorInfo = PlayerInfo & NPCInfo;
export type NPCID = keyof typeof NPC_LOOKUP;
export type ItemID = keyof typeof ITEM_LOOKUP;
export type ItemInfo = (typeof ITEM_LOOKUP)[ItemID];
export type SkillType = keyof PlayerInfo["skills"];
