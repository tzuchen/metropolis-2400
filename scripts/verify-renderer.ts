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
