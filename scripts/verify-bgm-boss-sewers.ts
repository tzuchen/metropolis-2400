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
    createGain: () => ({
      gain: mockAudioParam(),
      connect: () => {},
    }),
    createBiquadFilter: () => ({
      type: 'lowpass',
      frequency: mockAudioParam(),
      Q: mockAudioParam(),
      connect: () => {},
    }),
    createOscillator: () => ({
      type: 'sawtooth',
      frequency: mockAudioParam(),
      detune: mockAudioParam(),
      connect: () => {},
      start: () => {},
      stop: () => {},
    }),
    createBuffer: (_channels: number, length: number, _rate: number) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => ({
      buffer: null,
      playbackRate: mockAudioParam(),
      connect: () => {},
      start: () => {},
      stop: () => {},
    }),
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
import { TerminalSession } from '../src/terminal';
import { bgm } from '../src/music';
import { createBossExterminator, isBossRobot, applyBossDamage } from '../src/boss';
import { buildSubSectorZeroMap, getNextSectorId } from '../src/sewerMap';
import type { TerminalData, SecurityLevel } from '../src/types';

console.log('Testing Procedural Synthwave BGM Controller...');
if (bgm.enabled) {
  throw new Error('BGM should start muted until user toggle or interaction');
}
bgm.toggle();
if (!bgm.enabled) {
  throw new Error('BGM should be enabled after toggle()');
}
bgm.setIntensity('combat');
if (bgm.currentIntensity !== 'combat') {
  throw new Error('BGM intensity should be combat');
}
bgm.setIntensity('boss');
if (bgm.currentIntensity !== 'boss') {
  throw new Error('BGM intensity should be boss');
}
bgm.setIntensity('exploration');
if (bgm.currentIntensity !== 'exploration') {
  throw new Error('BGM intensity should be exploration');
}
bgm.toggle();
if (bgm.enabled) {
  throw new Error('BGM should be disabled after second toggle()');
}
console.log('✅ Procedural Synthwave BGM Controller verified!');

console.log('Testing Sub-Sector Zero Sewers and Bidirectional Transit Routing...');
const sewerMap = buildSubSectorZeroMap();
if (sewerMap.id !== 'sub-sector-0' || sewerMap.width !== 40 || sewerMap.height !== 28) {
  throw new Error('Invalid Sub-Sector Zero sewer map dimensions or id');
}

// Check sewer ladder navigation routing
// Sector 1: (4, 22) leads to Sub-Sector Zero; (38, 25) leads to Sector 2
if (getNextSectorId('sector-1', 4, 22) !== 'sub-sector-0') {
  throw new Error('Sector 1 sewer ladder at (4, 22) must route to sub-sector-0');
}
if (getNextSectorId('sector-1', 38, 25) !== 'sector-2') {
  throw new Error('Sector 1 elevator at (38, 25) must route to sector-2');
}

// Sub-Sector Zero: west ladder (3, 5) routes to sector-1; east ladder (36, 22) routes to sector-2
if (getNextSectorId('sub-sector-0', 3, 5) !== 'sector-1') {
  throw new Error('Sub-Sector Zero ladder at (3, 5) must route to sector-1');
}
if (getNextSectorId('sub-sector-0', 36, 22) !== 'sector-2') {
  throw new Error('Sub-Sector Zero ladder at (36, 22) must route to sector-2');
}

// Sector 2: sewer ladder at (2, 25) routes to sub-sector-0; elevator at (2, 5) routes to sector-1
if (getNextSectorId('sector-2', 2, 25) !== 'sub-sector-0') {
  throw new Error('Sector 2 sewer ladder at (2, 25) must route to sub-sector-0');
}
if (getNextSectorId('sector-2', 2, 5) !== 'sector-1') {
  throw new Error('Sector 2 elevator at (2, 5) must route to sector-1');
}
console.log('✅ Sewer bidirectional routing verified!');

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

console.log('Testing In-Engine Sector Switching to Sub-Sector Zero...');
game.switchSector('sub-sector-0');
if (game.map.id !== 'sub-sector-0') {
  throw new Error('Game should switch to sub-sector-0');
}
if (game.player.x !== 4 || game.player.y !== 5) {
  throw new Error(`Player entered sewer at (${game.player.x}, ${game.player.y}), expected (4, 5)`);
}
const recipeItem = game.groundItems.find((it) => it.id === 'item-ramen-recipe');
if (!recipeItem) {
  throw new Error('Lost ramen recipe must spawn in Sub-Sector Zero');
}
console.log('✅ In-engine sewer transit verified!');

console.log('Testing Transit from Sub-Sector Zero to Sector 2 and back...');
game.switchSector('sector-2');
if (game.map.id !== 'sector-2') {
  throw new Error('Expected current map to be sector-2');
}
if (game.player.x !== 3 || game.player.y !== 25) {
  throw new Error(`Player entering Sector 2 from sewer should be at (3, 25), got (${game.player.x}, ${game.player.y})`);
}

game.switchSector('sub-sector-0');
if (game.player.x !== 35 || game.player.y !== 22) {
  throw new Error(`Player entering sewer from Sector 2 should be at (35, 22), got (${game.player.x}, ${game.player.y})`);
}

game.switchSector('sector-1');
if (game.map.id !== 'sector-1') {
  throw new Error('Expected current map to be sector-1');
}
if (game.player.x !== 4 || game.player.y !== 21) {
  throw new Error(`Player returning from sewer to Sector 1 should be at (4, 21), got (${game.player.x}, ${game.player.y})`);
}
console.log('✅ Bidirectional coordinates verified!');

console.log('Testing Hiro Ramen Recipe Quest Turn-in...');
const initialMaxHp = game.player.maxHp;
// Add recipe to player inventory
game.player.inventory.push({
  id: 'item-ramen-recipe',
  name: '失落的拉麵鮮味秘方',
  itemType: 'KEYCARD',
  description: 'Hiro ramen recipe',
});

// Trigger dialogue with Hiro
const hiro = game.npcs.find((n) => n.id === 'npc-hiro');
if (!hiro) {
  throw new Error('Hiro NPC not found in Sector 1');
}
game.activeDialogue = {
  npc: hiro,
  textIndex: (hiro.dialogueZh || hiro.dialogue).length - 2, // Advance to final dialogue step
};
// Press Space to advance dialogue and claim reward
game.handleKeyDown(' ');

if (game.player.maxHp !== initialMaxHp + 50) {
  throw new Error(`Expected max HP to increase by 50 to ${initialMaxHp + 50}, got ${game.player.maxHp}`);
}
if (game.player.hp !== game.player.maxHp) {
  throw new Error('Player HP should be fully restored upon eating ultimate ramen');
}
const recipeStillInInv = game.player.inventory.some((it) => it.id === 'item-ramen-recipe');
if (recipeStillInInv) {
  throw new Error('Ramen recipe should be removed from inventory after turn-in');
}
console.log('✅ Hiro Ramen Recipe Quest Turn-in verified!');

console.log('Testing Boss EXTERMINATOR-PRIME Phase 2 Overdrive & Legendary Loot...');
const boss = createBossExterminator({ x: 10, y: 10 });
if (!isBossRobot(boss)) {
  throw new Error('isBossRobot should identify EXTERMINATOR boss');
}
if (boss.hp !== 250) {
  throw new Error('Boss should start with 250 HP');
}

// Apply damage to bring boss below 125 HP (trigger Phase 2)
applyBossDamage(boss, 130, game);
if (boss.hp !== 120) {
  throw new Error(`Expected boss HP to be 120, got ${boss.hp}`);
}
if (!(boss as any).phase2Overclock) {
  throw new Error('Boss should have entered Phase 2 Overclocked state');
}

// Next hit should receive 35% damage reduction
const normalDamage = 100;
const actualDamageDealt = applyBossDamage(boss, normalDamage, game);
const expectedDamage = Math.round(normalDamage * 0.65); // 65 DMG
if (actualDamageDealt !== expectedDamage) {
  throw new Error(`Expected overclocked boss to take ${expectedDamage} DMG, took ${actualDamageDealt}`);
}

// Defeat boss and check legendary loot
applyBossDamage(boss, 200, game);
if (boss.hp !== 0 || boss.isAlive) {
  throw new Error('Boss should be defeated');
}
const masterCipher = game.groundItems.find((it) => it.id === 'item-master-cipher');
const vibroBlade = game.groundItems.find((it) => it.id === 'item-vibro-katana');
if (!masterCipher || !vibroBlade) {
  throw new Error('Defeating boss must drop item-master-cipher and item-vibro-katana');
}
console.log('✅ Boss Phase 2 Overdrive & Legendary Loot verified!');

console.log('Testing 4th True Ending: AWAKEN (The Great Awakening)...');
const coreTerminalData: TerminalData = {
  id: 'TERMINAL_OVERMIND_CORE',
  position: { x: 34, y: 22 },
  type: 'CORE',
  securityLevel: 'HIGH' as unknown as SecurityLevel,
  log: 'Core Interface',
};
const coreSession = new TerminalSession(coreTerminalData);
const awakenRes = coreSession.executeCommand('awaken');
if (awakenRes.endgameChoice !== 'AWAKEN') {
  throw new Error('AWAKEN command should return endgameChoice: "AWAKEN"');
}
if (!awakenRes.output.includes('五百萬人的全民大覺醒')) {
  throw new Error('AWAKEN command output should include Great Awakening victory text');
}

console.log('🎉 All Synthwave BGM, Boss Overdrive, Sewers, Quests, and Awaken Ending tests passed successfully!');
