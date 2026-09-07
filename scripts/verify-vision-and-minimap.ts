// Setup mock Web Audio API environment for Node.js
const mockAudioParam = () => ({
  value: 1,
  setValueAtTime: () => {},
  setTargetAtTime: () => {},
  cancelScheduledValues: () => {},
  linearRampToValueAtTime: () => {},
  exponentialRampToValueAtTime: () => {},
});

const mockAudioContext = function () {
  return {
    state: 'running',
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createGain: () => ({ gain: mockAudioParam(), connect: () => {} }),
    createBiquadFilter: () => ({ type: 'lowpass', frequency: mockAudioParam(), Q: mockAudioParam(), connect: () => {} }),
    createOscillator: () => ({ type: 'sawtooth', frequency: mockAudioParam(), detune: mockAudioParam(), connect: () => {}, start: () => {}, stop: () => {} }),
    createBuffer: (_channels: number, length: number, _rate: number) => ({ getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => ({ buffer: null, playbackRate: mockAudioParam(), connect: () => {}, start: () => {}, stop: () => {} }),
    resume: async () => {},
    close: async () => {},
  };
};

(globalThis as any).window = {
  AudioContext: mockAudioContext,
  addEventListener: () => {},
  removeEventListener: () => {},
};

import { GameEngine } from '../src/game';
import { drawMiniRadar } from '../src/radar';

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

const game = new GameEngine(mockCanvas);

console.log('Testing Initial Standard Vision & Minimap state...');
if (game.hasOmniVision() || game.isOmniVisionActive) {
  throw new Error('Omni-Vision should be inactive by default');
}
if (game.hasFullMap() || game.isFullMapActive) {
  throw new Error('Full Map should be inactive by default');
}
const normalVisibleCount = game.visibleTiles.size;
const totalTiles = (game.map.width || 40) * (game.map.height || 30);
if (normalVisibleCount >= totalTiles / 2) {
  throw new Error(`Standard visible tiles (${normalVisibleCount}) should be much smaller than total map tiles (${totalTiles})`);
}
console.log(`✅ Standard initial FOV verified (${normalVisibleCount} / ${totalTiles} tiles visible)!`);

console.log('Testing Secret Key [V] (Toggle Omni-Vision)...');
// Press 'v' to enable Omni-Vision
game.handleKeyDown('v');
if (!game.isOmniVisionActive || !game.hasOmniVision()) {
  throw new Error('Pressing [V] should enable Omni-Vision');
}
if (game.visibleTiles.size !== totalTiles) {
  throw new Error(`Omni-Vision should reveal all ${totalTiles} tiles, got ${game.visibleTiles.size}`);
}

// Press 'V' to disable Omni-Vision
game.handleKeyDown('V');
if (game.isOmniVisionActive || game.hasOmniVision()) {
  throw new Error('Pressing [V] again should disable Omni-Vision');
}
if (game.visibleTiles.size !== normalVisibleCount) {
  throw new Error(`Disabling Omni-Vision should restore standard FOV count (${normalVisibleCount}), got ${game.visibleTiles.size}`);
}
console.log('✅ Secret Key [V] Omni-Vision toggle verified!');

console.log('Testing Secret Key [X] (Toggle Full Minimap Cartography)...');
// Press 'x' to enable Full Minimap
game.handleKeyDown('x');
if (!game.isFullMapActive || !game.hasFullMap()) {
  throw new Error('Pressing [X] should enable Full Minimap');
}
if (game.exploredTiles.size !== totalTiles) {
  throw new Error(`Full Minimap should mark all ${totalTiles} tiles as explored, got ${game.exploredTiles.size}`);
}

// Press 'X' to disable Full Minimap
game.handleKeyDown('X');
if (game.isFullMapActive || game.hasFullMap()) {
  throw new Error('Pressing [X] again should disable Full Minimap');
}
console.log('✅ Secret Key [X] Full Minimap toggle verified!');

console.log('Testing Treasure Item [item-omni-visor]...');
const omniVisorItem = game.groundItems.find((it) => it.id === 'item-omni-visor');
if (!omniVisorItem) {
  throw new Error('item-omni-visor must spawn in Sector 1 ground items');
}
// Teleport to item and pick it up
game.player.x = omniVisorItem.x;
game.player.y = omniVisorItem.y;
game.handleKeyDown('g'); // checkItemPickup

const hasVisorInInv = game.player.inventory.some((it: any) => it.id === 'item-omni-visor');
if (!hasVisorInInv) {
  throw new Error('Player inventory should contain item-omni-visor');
}
if (!game.hasOmniVision()) {
  throw new Error('Holding item-omni-visor in inventory must grant hasOmniVision()');
}
game.updateFOV();
if (game.visibleTiles.size !== totalTiles) {
  throw new Error(`Holding item-omni-visor must reveal all ${totalTiles} tiles, got ${game.visibleTiles.size}`);
}
console.log('✅ Treasure Item [item-omni-visor] pickup & passive omni-vision verified!');

console.log('Testing Treasure Item [item-full-map-uplink]...');
const mapUplinkItem = game.groundItems.find((it) => it.id === 'item-full-map-uplink');
if (!mapUplinkItem) {
  throw new Error('item-full-map-uplink must spawn in Sector 1 ground items');
}
// Teleport to item and pick it up
game.player.x = mapUplinkItem.x;
game.player.y = mapUplinkItem.y;
game.handleKeyDown('g'); // checkItemPickup

const hasUplinkInInv = game.player.inventory.some((it: any) => it.id === 'item-full-map-uplink');
if (!hasUplinkInInv) {
  throw new Error('Player inventory should contain item-full-map-uplink');
}
if (!game.hasFullMap()) {
  throw new Error('Holding item-full-map-uplink in inventory must grant hasFullMap()');
}
game.updateFOV();
if (game.exploredTiles.size !== totalTiles) {
  throw new Error(`Holding item-full-map-uplink must reveal all ${totalTiles} explored tiles, got ${game.exploredTiles.size}`);
}
console.log('✅ Treasure Item [item-full-map-uplink] pickup & passive full minimap verified!');

console.log('Testing Radar Blueprint & Entity Rendering...');
const mockCtx = mockCanvas.getContext('2d')!;
// Normal radar
drawMiniRadar(800, game.map, game.player, game.robots, game.npcs, game.groundItems, game.visibleTiles, mockCtx, 1000, false, 'zh');
// Full orbital cartography radar
drawMiniRadar(800, game.map, game.player, game.robots, game.npcs, game.groundItems, game.visibleTiles, mockCtx, 1000, true, 'zh');
drawMiniRadar(800, game.map, game.player, game.robots, game.npcs, game.groundItems, game.visibleTiles, mockCtx, 1000, true, 'en');
console.log('✅ Tactical Radar & Full Cartography drawing verified!');

console.log('🎉 All Omni-Vision, Full Minimap, Secret Keys, and Treasure Item tests passed successfully!');
