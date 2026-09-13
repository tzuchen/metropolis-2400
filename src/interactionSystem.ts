import type {
  SectorMap,
  Player,
  Robot,
  NPC,
  GroundItem,
  Position,
  PushableBlock,
  DialogueSession,
  GameMessage,
  SecurityLevel,
  Language,
  TerminalData,
  StoryLog,
  MissionObjective,
} from './types';
import type { TerminalSession } from './terminal';
import { getTile, isWalkable, toggleDoor } from './map';
import { soundFX } from './audio';

/**
 * Minimal capability interface for the InteractionSystem.
 * This avoids a runtime circular import with GameEngine while providing
 * the exact capabilities needed for E, T, and G interactions.
 */
export interface InteractionSystemHost {
  map: SectorMap;
  player: Player;
  robots: Robot[];
  npcs: NPC[];
  groundItems: GroundItem[];
  pushableBlocks: PushableBlock[];
  activeTerminal: TerminalSession | null;
  activeDialogue: DialogueSession | null;
  terminalInputBuffer: string;
  language: Language;
  renderer: { tileSize: number };
  fx: {
    spawnSparks(x: number, y: number, color: string, count: number): void;
    triggerShake(intensity: number): void;
  };
  pushMessage(text: string, type: GameMessage['type']): void;
  pushFloatingText(x: number, y: number, text: string, color: string): void;
  gainExp(amount: number, reason?: string): void;
  tick(): void;
  render(): void;
  checkItemPickup(): void;
  updateNPCDialogues(): void;
  checkSideQuestDiscovery(npcId: string): void;
  performCheckIn(): void;
  recoverConfiscatedGear(): void;
  resetDetentionCell(): void;
  openStoryLog(selected: StoryLog): void;
  storyLogs: StoryLog[];
  missionObjectives: MissionObjective[];
  createTerminalSession(terminal: TerminalData): TerminalSession;
}

/**
 * Handles 'E' key: Environmental interaction (secret pushable blocks and doors).
 * Verbatim behavior from GameEngine.handleKeyDown for key 'e'/'E'.
 */
export function handleEnvironmentalInteraction(host: InteractionSystemHost): void {
  const { map, player, robots, npcs, pushableBlocks, language, renderer, fx } = host;

  // Check for pushable blocks with secret doors nearby
  const dirs: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  let foundBlock: PushableBlock | null = null;
  for (const [ox, oy] of dirs) {
    const tx = player.x + ox;
    const ty = player.y + oy;
    const block = pushableBlocks.find((b) => b.x === tx && b.y === ty && !b.revealed && b.secretDoor);
    if (block) {
      foundBlock = block;
      break;
    }
  }

  if (foundBlock) {
    const moveDirs: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    let moved = false;
    for (const [mx, my] of moveDirs) {
      const nx = foundBlock.x + mx;
      const ny = foundBlock.y + my;
      const mapWidth = Number(map.width) || 0;
      const mapHeight = Number(map.height) || 0;
      if (nx < 0 || nx >= mapWidth || ny < 0 || ny >= mapHeight) continue;
      const targetTile = getTile(map, { x: nx, y: ny });
      if (targetTile === undefined || !isWalkable(targetTile)) continue;
      if (robots.some((r) => r.isAlive && r.x === nx && r.y === ny)) continue;
      if (npcs.some((n) => n.isAlive && n.x === nx && n.y === ny)) continue;
      if (pushableBlocks.some((b) => b !== foundBlock && b.x === nx && b.y === ny)) continue;

      foundBlock.x = nx;
      foundBlock.y = ny;
      foundBlock.revealed = true;

      if (foundBlock.secretDoor && foundBlock.secretDoor.revealedTile !== undefined) {
        const mapData = map.tiles || map.grid;
        if (Array.isArray(mapData)) {
          const row = mapData[foundBlock.secretDoor.y];
          if (Array.isArray(row)) {
            row[foundBlock.secretDoor.x] = foundBlock.secretDoor.revealedTile;
          }
        }
      }

      soundFX.victory();
      host.pushFloatingText(
        foundBlock.secretDoor?.x ?? foundBlock.x,
        foundBlock.secretDoor?.y ?? foundBlock.y,
        'VENT OPEN!',
        '#00ff88'
      );
      host.pushMessage(
        language === 'zh'
          ? `【拆開柵板】你拆開了【${foundBlock.nameZh || foundBlock.name}】，顯現出通風暗門！`
          : `[PRY OPEN] You pried open the [${foundBlock.name}], revealing the ventilation secret door!`,
        'success'
      );
      host.gainExp(50, 'SECRET_DISCOVERY');
      moved = true;
      break;
    }

    if (moved) {
      host.tick();
      host.render();
      return;
    }
  }

  for (const [ox, oy] of dirs) {
    const tx = player.x + ox;
    const ty = player.y + oy;
    if (toggleDoor(map, { x: tx, y: ty })) {
      soundFX.door();
      host.pushMessage('Airlock blast door cycled.', 'info');
      host.tick();
      return;
    }
  }
  host.pushMessage('No blast door within reach.', 'warning');
  host.render();
}

/**
 * Handles 'T' key: Nearby NPC dialogue or terminal access.
 * Verbatim behavior from GameEngine.handleKeyDown for key 't'/'T'.
 */
export function handleNPCOrTerminalInteraction(host: InteractionSystemHost): void {
  const { map, player, npcs, language, renderer } = host;

  // Priority: Check for adjacent NPC dialogue first
  const dirs: [number, number][] = [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [ox, oy] of dirs) {
    const tx = player.x + ox;
    const ty = player.y + oy;
    const npc = npcs.find((n) => n.isAlive && n.x === tx && n.y === ty);
    if (npc) {
      soundFX.terminal();
      host.updateNPCDialogues();
      const dx = player.x - npc.x;
      const dy = player.y - npc.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        npc.facing = dx > 0 ? 'right' : 'left';
      } else {
        npc.facing = dy > 0 ? 'down' : 'up';
      }
      host.activeDialogue = { npc, textIndex: 0 };
      host.checkSideQuestDiscovery(npc.id);
      host.render();
      return;
    }
  }

  // If no NPC, check for terminal
  for (const [ox, oy] of dirs) {
    const tx = player.x + ox;
    const ty = player.y + oy;
    const terminal = findTerminalAt(map, tx, ty);
    if (terminal) {
      soundFX.terminal();
      host.performCheckIn();
      host.activeTerminal = host.createTerminalSession(terminal);
      host.terminalInputBuffer = '';
      host.activeTerminal.input = '';
      host.pushMessage('Terminal interface accessed. Type HELP for commands.', 'info');
      host.render();
      return;
    }
  }

  host.pushMessage('Nothing to interact with nearby.', 'warning');
  host.render();
}

/**
 * Helper to find a terminal at a given position on the map.
 * Verbatim logic from GameEngine.findTerminalAt.
 */
function findTerminalAt(map: SectorMap, x: number, y: number): TerminalData | null {
  const rawTerminals = map.terminals;

  if (Array.isArray(rawTerminals)) {
    for (const terminal of rawTerminals) {
      const pos = terminal?.position;
      if (pos && pos.x === x && pos.y === y) {
        return terminal;
      }
    }
    return null;
  }

  if (rawTerminals && typeof rawTerminals === 'object') {
    for (const terminal of Object.values(rawTerminals)) {
      const pos = terminal?.position;
      if (pos && pos.x === x && pos.y === y) {
        return terminal;
      }
    }
  }

  return null;
}

/**
 * Handles 'G' key: Item pickup.
 * Verbatim behavior from GameEngine.handleKeyDown for key 'g'/'G'.
 * The original code calls this.checkItemPickup() and then this.render().
 */
export function handleItemPickup(host: InteractionSystemHost): void {
  host.checkItemPickup();
  host.render();
}
