import { GameEngine } from '../src/game';
import { buildSector1Map, buildSector2Map, isWalkable, isTransparent } from '../src/map';
import { TileType } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

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

console.log('Testing Themed District Tiles & Sector Maps...');

// 1. Check Sector 1 map tiles
const s1Map = buildSector1Map();
let hasBioTree = false;
let hasParkWater = false;
let hasVendorStall = false;
let hasRebelBarricade = false;

for (let y = 0; y < s1Map.height; y++) {
  for (let x = 0; x < s1Map.width; x++) {
    const tile = s1Map.tiles[y][x];
    if (tile === TileType.BIO_TREE) hasBioTree = true;
    if (tile === TileType.PARK_WATER) hasParkWater = true;
    if (tile === TileType.VENDOR_STALL) hasVendorStall = true;
    if (tile === TileType.REBEL_BARRICADE) hasRebelBarricade = true;
  }
}

assert(hasBioTree, 'Sector 1 must contain BIO_TREE tiles in the Bionic Park');
assert(hasParkWater, 'Sector 1 must contain PARK_WATER tiles in the Bionic Park');
assert(hasVendorStall, 'Sector 1 must contain VENDOR_STALL tiles in the Commercial Street');
assert(hasRebelBarricade, 'Sector 1 must contain REBEL_BARRICADE tiles in the Rebel Base');
console.log('✅ Sector 1 Themed Districts verified (Park, Market, Rebel Base)!');

// 2. Check Sector 2 map tiles
const s2Map = buildSector2Map();
let hasServerRack = false;
let hasSteamVent = false;

for (let y = 0; y < s2Map.height; y++) {
  for (let x = 0; x < s2Map.width; x++) {
    const tile = s2Map.tiles[y][x];
    if (tile === TileType.SERVER_RACK) hasServerRack = true;
    if (tile === TileType.STEAM_VENT) hasSteamVent = true;
  }
}

assert(hasServerRack, 'Sector 2 must contain SERVER_RACK tiles in the Server Core');
assert(hasSteamVent, 'Sector 2 must contain STEAM_VENT tiles in the Black Market Alley');
console.log('✅ Sector 2 Themed Districts verified (Server Core, Black Market Alley)!');

// 3. Tile properties check
assert(isWalkable(TileType.STEAM_VENT), 'Steam vents should be walkable');
assert(!isWalkable(TileType.BIO_TREE), 'Bio trees should be solid obstacles');
assert(!isWalkable(TileType.SERVER_RACK), 'Server racks should be solid obstacles');
assert(!isWalkable(TileType.PARK_WATER), 'Park water should be non-walkable');
assert(isTransparent(TileType.STEAM_VENT), 'Steam vents should allow vision');
assert(isTransparent(TileType.PARK_WATER), 'Park water should allow vision');
assert(!isTransparent(TileType.SERVER_RACK), 'Server racks should block vision');
console.log('✅ Tile physical and optical properties verified!');

// 4. Check Sector NPCs and Sector Switching
const engine = new GameEngine(mockCanvas);
const npcsS1 = (engine as any).npcs;
const hiro = npcsS1.find((n: any) => n.id === 'npc-hiro');
const sylvia = npcsS1.find((n: any) => n.id === 'npc-sylvia');

assert(!!hiro, 'Sector 1 must have Hiro the ramen vendor');
assert(hiro.role === '商店街拉麵商', 'Hiro role should be 商店街拉麵商');
assert(!!sylvia, 'Sector 1 must have Sylvia the park botanist');
assert(sylvia.role === '仿生公園植物學家', 'Sylvia role should be 仿生公園植物學家');
console.log('✅ Sector 1 District NPCs verified!');

// Switch to Sector 2
engine.switchSector('sector-2');
const npcsS2 = (engine as any).npcs;
const jackal = npcsS2.find((n: any) => n.id === 'npc-jackal');
const zeroOne = npcsS2.find((n: any) => n.id === 'npc-zero-one');

assert(!!jackal, 'Sector 2 must have Jackal the black market broker');
assert(jackal.role === '黑市軍火掮客', 'Jackal role should be 黑市軍火掮客');
assert(!!zeroOne, 'Sector 2 must have Zero-One the awakened android');
assert(zeroOne.role === '叛逃覺醒生化人', 'Zero-One role should be 叛逃覺醒生化人');
console.log('✅ Sector 2 District NPCs and Sector switching verified!');

// Switch back to Sector 1
engine.switchSector('sector-1');
const npcsBackS1 = (engine as any).npcs;
assert(npcsBackS1.some((n: any) => n.id === 'npc-hiro'), 'Switching back to Sector 1 restores Sector 1 NPCs');
console.log('✅ Sector switching back and forth maintains correct NPCs!');

console.log('🎉 All themed district and sector verification tests passed successfully!');
