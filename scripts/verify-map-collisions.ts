import { GameEngine } from '../src/game';
import { isWalkable, getTile } from '../src/map';
import { TileType } from '../src/types';

const mockCanvas = {
  width: 800,
  height: 600,
  getContext: () => ({
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    arcTo: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
  }),
} as unknown as HTMLCanvasElement;

console.log('Testing Map Collision and Entity Accessibility across all sectors...');

const game = new GameEngine(mockCanvas);

function checkSector(sectorId: 'sector-1' | 'sector-2' | 'sub-sector-0' | 'sector-citadel') {
  console.log(`\n--- Checking ${sectorId} ---`);
  game.switchSector(sectorId);
  const map = game.map;
  let errors = 0;

  // 1. Check NPCs
  for (const npc of game.npcs) {
    const tile = getTile(map, { x: npc.x, y: npc.y });
    const walkable = isWalkable(tile);
    if (!walkable) {
      console.error(`❌ NPC ${npc.name} (${npc.id}) at (${npc.x}, ${npc.y}) is on non-walkable tile ${tile} (${TileType[tile] || 'UNKNOWN'})`);
      errors++;
    } else {
      console.log(`✅ NPC ${npc.name} at (${npc.x}, ${npc.y}) is on walkable tile ${TileType[tile] || tile}`);
    }
  }

  // 2. Check Robots
  for (const robot of game.robots) {
    const tile = getTile(map, { x: robot.x, y: robot.y });
    const walkable = isWalkable(tile);
    if (!walkable) {
      console.error(`❌ Robot ${robot.robotType} (${robot.id}) at (${robot.x}, ${robot.y}) is on non-walkable tile ${tile} (${TileType[tile] || 'UNKNOWN'})`);
      errors++;
    } else {
      console.log(`✅ Robot ${robot.robotType} at (${robot.x}, ${robot.y}) is on walkable tile ${TileType[tile] || tile}`);
    }
  }

  // 3. Check Ground Items
  for (const item of game.groundItems) {
    const tile = getTile(map, { x: item.x, y: item.y });
    const walkable = isWalkable(tile);
    if (!walkable) {
      console.error(`❌ Item ${item.name} (${item.id}) at (${item.x}, ${item.y}) is on non-walkable tile ${tile} (${TileType[tile] || 'UNKNOWN'})`);
      errors++;
    } else {
      console.log(`✅ Item ${item.name} at (${item.x}, ${item.y}) is on walkable tile ${TileType[tile] || tile}`);
    }
  }

  // 4. Check Terminals
  const terminals = map.terminals ? Object.values(map.terminals) : [];
  for (const term of terminals) {
    const pos = (term as any).position;
    if (!pos) {
      console.error(`❌ Terminal ${term.id} has no position defined!`);
      errors++;
      continue;
    }
    const tile = getTile(map, pos);
    const neighbors = [
      [pos.x + 1, pos.y],
      [pos.x - 1, pos.y],
      [pos.x, pos.y + 1],
      [pos.x, pos.y - 1],
    ];
    const hasWalkableNeighbor = neighbors.some(([nx, ny]) => isWalkable(getTile(map, { x: nx, y: ny })));
    if (!hasWalkableNeighbor) {
      console.error(`❌ Terminal ${term.id} at (${pos.x}, ${pos.y}) has no accessible adjacent walkable tile!`);
      errors++;
    } else {
      console.log(`✅ Terminal ${term.id} at (${pos.x}, ${pos.y}) is accessible (tile=${TileType[tile] || tile})`);
    }
  }

  // 5. Check Hazards
  for (const hazard of game.hazards) {
    const tile = getTile(map, { x: hazard.x, y: hazard.y });
    const walkable = isWalkable(tile);
    if (!walkable) {
      console.error(`❌ Hazard ${hazard.id} at (${hazard.x}, ${hazard.y}) is on non-walkable tile ${tile} (${TileType[tile] || 'UNKNOWN'})`);
      errors++;
    } else {
      console.log(`✅ Hazard ${hazard.id} at (${hazard.x}, ${hazard.y}) is on walkable tile ${TileType[tile] || tile}`);
    }
  }

  return errors;
}

let totalErrors = 0;
totalErrors += checkSector('sector-1');
totalErrors += checkSector('sector-2');
totalErrors += checkSector('sub-sector-0');
totalErrors += checkSector('sector-citadel');

if (totalErrors > 0) {
  console.error(`\n❌ Found ${totalErrors} collision/placement errors!`);
  process.exit(1);
} else {
  console.log(`\n🎉 All entities, items, and NPCs across all sectors are collision-free and properly placed!`);
}
