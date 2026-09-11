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
