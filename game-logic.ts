import {
  GameMapConfig,
  ITEM_LOOKUP,
  NPCInfo,
  NPC_LOOKUP,
  PlayerActions,
  PlayerInfo,
  PlayerStates,
  ServerState,
  Vec2,
  tilekey,
} from "./core.ts";

export function genUUID(): string {
  return crypto.randomUUID();
}

export function calculateMaxInventorySize(player: PlayerInfo): number {
  return 16;
}

export function validateAndProcessPlayerAction(
  state: ServerState,
  player: PlayerInfo,
  action: PlayerActions
): PlayerStates | null {
  switch (action.type) {
    case "move-to":
      if (!isTileBlocked(state, action.to)) {
        return {
          type: "move",
          from: player.position,
          to: action.to,
          startedTick: state.tick,
        };
      }
      break;
    case "pick-up-items":
      const tile = tilekey(action.tile[0], action.tile[1]);
      const tileItems = state.map[tile]?.items;
      if (!tileItems || tileItems.length === 0) return null;
      let firstAvailableIx: number | null = null;
      const maxInvSlots = calculateMaxInventorySize(player);
      for (let i = 0; i < player.inventory.length; i++) {
        if (!player.inventory[i]) {
          firstAvailableIx = i;
          break;
        }
      }

      if (firstAvailableIx === null) return null;
      player.inventory[firstAvailableIx] = tileItems.shift()!;
      return player.state;
    case "use-item":
      const itemIndex = player.inventory.findIndex(
        (item) => item?.id === action.itemId
      );
      if (itemIndex !== -1) {
        const item = player.inventory[itemIndex]!;
        const itemEffect = ITEM_LOOKUP[item.iid];
        // @ts-ignore
        if (itemEffect.consumable) {
          // @ts-ignore
          player.hp += itemEffect.consumable.addHp ?? 0;
          player.inventory[itemIndex] = null;
          player.inventory.splice(itemIndex, 1);
          return { type: "idle" };
        }
      }
      break;
    case "attack-npc":
      const npc = state.npcs[action.npcId];
      if (npc && calculateDistance(player.position, npc.position) <= 1) {
        // Assume attack range of 1 tile
        // Simulate attack logic (e.g., reducing NPC's HP)
        npc.hp -= 3; // Example damage
        if (npc.hp <= 0) {
          delete state.npcs[action.npcId]; // Remove NPC if dead
        }
        return {
          type: "attacking-npc",
          npcId: action.npcId,
        };
      }
      break;
  }
  return null;
}

function calculateDistance(pos1: Vec2, pos2: Vec2): number {
  return Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]);
}

function isTileBlocked(state: ServerState, position: Vec2): boolean {
  return false;
  // const tileKey = tilekey(position[0], position[1]);
  // return state.mapConfig.tiles[tileKey]?.isSolid || false;
}

export function processCommandQueue(state: ServerState): ServerState {
  state.commandQueue.forEach((command) => {
    if (command.type === "player-action") {
      const player = state.players[command.senderId];
      const newState = validateAndProcessPlayerAction(
        state,
        player,
        command.action
      );
      if (newState) {
        player.state = newState;
      }
    }
  });
  return state;
}

export function processTick(state: ServerState): ServerState {
  state.tick++;

  // Process each player
  for (let player of Object.values(state.players)) {
    // Handle player movement
    switch (player.state.type) {
      case "move":
        // Move player towards the target in a straight line with a single turn at midpoint
        if (state.tick - player.state.startedTick >= 1) {
          // Calculate the next position towards the destination
          const nextPosition = getNextPosition(
            player.position,
            player.state.to
          );
          if (nextPosition) {
            player.position = nextPosition;
            // Check if the player has reached the destination
            if (
              player.position[0] === player.state.to[0] &&
              player.position[1] === player.state.to[1]
            ) {
              player.state = { type: "idle" };
            }
          } else {
            player.state = { type: "idle" }; // Stop moving if unable to calculate next position
          }
        }
        break;
    }
  }

  for (let spawn of state.mapConfig.spawns) {
    if (spawn.type === "fixed") {
      if (!state.npcs[spawn.id]) {
        const npcInfo: NPCInfo = {
          id: spawn.id,
          npcId: spawn.npcId,
          position: spawn.position,
          hp: NPC_LOOKUP[spawn.npcId].hp,
          mp: NPC_LOOKUP[spawn.npcId].hp,
        };
        state.npcs[spawn.id] = npcInfo;
      }
    } else if (spawn.type === "interval") {
      const npcExists = state.npcs[spawn.id];
      if (!npcExists && state.tick % spawn.minTicks === 0) {
        const npcInfo: NPCInfo = {
          id: spawn.id,
          npcId: spawn.npcId,
          position: spawn.position,
          hp: NPC_LOOKUP[spawn.npcId].hp,
          mp: NPC_LOOKUP[spawn.npcId].hp,
        };
        state.npcs[spawn.id] = npcInfo;
      }
    }
  }

  return state;
}

function getNextPosition(current: Vec2, destination: Vec2): Vec2 | null {
  const [x0, y0] = current;
  const [x1, y1] = destination;

  // Calculate midpoint
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;

  if (x0 !== x1) {
    // Horizontal movement
    return [x0 < x1 ? x0 + 1 : x0 - 1, y0];
  } else if (y0 !== y1) {
    // Vertical movement
    return [x0, y0 < y1 ? y0 + 1 : y0 - 1];
  }

  return null; // No movement needed, already at destination
}

export function initServerState(map: GameMapConfig): ServerState {
  const state: ServerState = {
    tick: 0,
    players: {},
    npcs: {},
    commandQueue: [],
    log: [],
    mapConfig: map,
    map: {},
  };

  // Initialize the tiles in the map
  Object.keys(map.tiles).forEach((tileKey) => {
    state.map[tileKey] = {
      npcs: [],
      items: [],
    };
  });

  return state;
}
