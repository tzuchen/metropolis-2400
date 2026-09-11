import { GameRenderer } from '../src/renderer';
import { buildSector1Map } from '../src/map';
import { createPlayer, createRobot } from '../src/entities';
import { RobotType, SecurityLevel } from '../src/types';

let fillRectCalls = 0;
let fillTextCalls = 0;

const mockCanvas = {
  width: 800,
  height: 600,
  getContext: () => ({
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => { fillRectCalls++; },
    strokeRect: () => {},
    fillText: () => { fillTextCalls++; },
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
  })
} as unknown as HTMLCanvasElement;

const map = buildSector1Map();
const player = createPlayer({ x: 5, y: 5 });
const robot = createRobot('SCOUT_DRONE' as RobotType, { x: 6, y: 6 });
const visible = new Set<string>(['5,5', '6,6', '5,6']);
const explored = new Set<string>(['5,5', '6,6', '5,6', '4,4']);

const renderer = new GameRenderer(mockCanvas);
renderer.render(
  map,
  player,
  [robot],
  visible,
  explored,
  SecurityLevel.CLEAR,
  [{ text: 'Welcome to Metropolis', type: 'info' }],
  null
);

if (fillRectCalls < 3) {
  throw new Error('Renderer did not draw tiles or background');
}
if (fillTextCalls < 2) {
  throw new Error('Renderer did not draw HUD or text');
}

console.log('Rigorous renderer test passed! fillRect:', fillRectCalls, 'fillText:', fillTextCalls);

// Mission Log Modal Test
let recordedTexts: string[] = [];
const recordingCtx = {
  save: () => {},
  restore: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  fillText: (text: string) => { recordedTexts.push(text); },
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  setLineDash: () => {},
  measureText: () => ({ width: 50 }),
};
const recordingCanvas = {
  width: 800,
  height: 600,
  getContext: () => recordingCtx
} as unknown as HTMLCanvasElement;

const missionRenderer = new GameRenderer(recordingCanvas);

const objectives = [
  { id: '1', title: 'Objective 1', description: 'Desc 1', completed: true },
  { id: '2', title: 'Objective 2', description: 'Desc 2', completed: true },
  { id: '3', title: 'Objective 3', description: 'Desc 3', completed: false },
];

// Test English
recordedTexts = [];
missionRenderer.language = 'en';
missionRenderer.drawMissionLogModal(objectives, 800, 600, recordingCtx, 0);
if (!recordedTexts.includes('SECTOR 1 INFILTRATION PROTOCOL // STATUS: ACTIVE // 2/3 COMPLETE')) {
  throw new Error('Mission Log Modal English assertion failed');
}

// Test Chinese
recordedTexts = [];
missionRenderer.language = 'zh';
missionRenderer.drawMissionLogModal(objectives, 800, 600, recordingCtx, 0);
if (!recordedTexts.includes('第一分區滲透作戰協議 // 狀態：進行中 // 已完成 2/3')) {
  throw new Error('Mission Log Modal Chinese assertion failed');
}

// Test Empty
recordedTexts = [];
missionRenderer.language = 'en';
missionRenderer.drawMissionLogModal([], 800, 600, recordingCtx, 0);
if (!recordedTexts.includes('SECTOR 1 INFILTRATION PROTOCOL // STATUS: ACTIVE // 0/0 COMPLETE')) {
  throw new Error('Mission Log Modal Empty assertion failed');
}

console.log('Mission Log Modal test passed!');

// Compact HUD Regression Test
let hudRecordedTexts: Array<{ text: string; x: number; y: number; width: number }> = [];
const MONO_CHAR_WIDTH = 7.2;
const hudRecordingCtx = {
  save: () => {},
  restore: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  fillText: (text: string, x: number, y: number) => {
    const width = String(text).length * MONO_CHAR_WIDTH;
    hudRecordedTexts.push({ text: String(text), x, y, width });
  },
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  setLineDash: () => {},
  measureText: (text: string) => ({ width: String(text).length * MONO_CHAR_WIDTH }),
};
const hudRecordingCanvas = {
  width: 800,
  height: 600,
  getContext: () => hudRecordingCtx
} as unknown as HTMLCanvasElement;

const hudRenderer = new GameRenderer(hudRecordingCanvas);
hudRenderer.language = 'en';
hudRenderer.activeWaypoint = { x: 10, y: 10, name: 'REBEL_BASE' };

const hudPlayer = {
  x: 5,
  y: 5,
  hp: 80,
  maxHp: 100,
  energy: 60,
  maxEnergy: 100,
  credits: 250,
  level: 7,
  exp: 45,
  expToNext: 100,
  checkInTimer: 42,
  isCollarDisarmed: false,
  isDisguised: true,
  currentSectorId: 'sector-1',
  equippedWeapon: {
    id: 'quantum-annihilator',
    name: 'Quantum Annihilator Mark VII Heavy Antimatter Cannon',
    power: 99,
    range: 8,
    energyCost: 20,
  },
  weapons: [
    { id: 'quantum-annihilator', name: 'Quantum Annihilator Mark VII Heavy Antimatter Cannon', power: 99, range: 8, energyCost: 20 },
    { id: 'laser-pistol', name: 'Laser Blaster Mk-II', power: 35, range: 6, energyCost: 5 },
  ],
  isWeaponDrawn: true,
  augments: {},
  consumables: { medkits: 2, batteries: 1, empGrenades: 0 },
};

hudRecordedTexts = [];
hudRenderer.drawHud(800, 600, hudPlayer as any, SecurityLevel.CLEAR, [], hudRecordingCtx);

// Assert expected prefixes are present
const expectedPrefixes = ['SECTOR', 'SEC:', 'CHK:', 'LV.', 'HP', 'EN', 'CR:', 'WEAPON:', '[ GPS:', '[DISGUISED]'];
for (const prefix of expectedPrefixes) {
  const found = hudRecordedTexts.some((entry) => entry.text.startsWith(prefix));
  if (!found) {
    throw new Error(`Compact HUD regression: expected prefix "${prefix}" not found in recorded texts`);
  }
}

// Every recorded status label must begin inside the 800px right inset and end no later than it
const rightInset = 800 - 12; // hudRightMargin = 12
for (const entry of hudRecordedTexts) {
  if (entry.x < 0) {
    throw new Error(`Compact HUD regression: label "${entry.text}" starts at x=${entry.x} which is outside the canvas`);
  }
  if (entry.x + entry.width > rightInset + 1) {
    throw new Error(`Compact HUD regression: label "${entry.text}" ends at x=${(entry.x + entry.width).toFixed(1)} which exceeds right inset ${rightInset}`);
  }
}

// Labels sharing the same y coordinate must have non-overlapping horizontal intervals
const yGroups = new Map<number, Array<{ x: number; width: number; text: string }>>();
for (const entry of hudRecordedTexts) {
  const yKey = Math.round(entry.y * 100) / 100;
  if (!yGroups.has(yKey)) yGroups.set(yKey, []);
  yGroups.get(yKey)!.push({ x: entry.x, width: entry.width, text: entry.text });
}
for (const [yKey, labels] of yGroups) {
  labels.sort((a, b) => a.x - b.x);
  for (let i = 0; i < labels.length - 1; i++) {
    const aEnd = labels[i].x + labels[i].width;
    const bStart = labels[i + 1].x;
    if (aEnd > bStart) {
      throw new Error(`Compact HUD regression: labels at y=${yKey} overlap: "${labels[i].text}" ends at ${aEnd.toFixed(1)}, "${labels[i + 1].text}" starts at ${bStart.toFixed(1)}`);
    }
  }
}

// At least two y rows are used for this crowded state
const uniqueYRows = new Set(hudRecordedTexts.map((entry) => Math.round(entry.y * 100) / 100));
if (uniqueYRows.size < 2) {
  throw new Error(`Compact HUD regression: expected at least 2 y rows, got ${uniqueYRows.size}`);
}

console.log('Compact HUD regression test passed! Rows:', uniqueYRows.size, 'Labels:', hudRecordedTexts.length);
