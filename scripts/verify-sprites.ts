import { drawTileSprite, drawPlayerSprite, drawRobotSprite } from '../src/sprites';
import { createPlayer, createRobot } from '../src/entities';
import { RobotType } from '../src/types';

let fills = 0;
let strokes = 0;

const mockCtx = {
  save: () => {},
  restore: () => {},
  beginPath: () => {},
  closePath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  arc: () => {},
  ellipse: () => {},
  rect: () => {},
  fill: () => { fills++; },
  stroke: () => { strokes++; },
  fillRect: () => { fills++; },
  strokeRect: () => { strokes++; },
  fillText: () => {},
  setLineDash: () => {},
  shadowColor: '',
  shadowBlur: 0,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
} as unknown as CanvasRenderingContext2D;

const player = createPlayer({ x: 5, y: 5 });
player.isWeaponDrawn = true;
player.isDisguised = true;

const drone = createRobot('SCOUT_DRONE' as RobotType, { x: 10, y: 10 });
const enforcer = createRobot('SHOCK_ENFORCER' as RobotType, { x: 11, y: 11 });

// Test tile types (1 to 6)
for (let t = 1; t <= 6; t++) {
  drawTileSprite(mockCtx, t, 0, 0, 24, true, 1000);
}

drawPlayerSprite(mockCtx, player, 0, 0, 24, 1000);
drawRobotSprite(mockCtx, drone, 0, 0, 24, true, 1000);
drawRobotSprite(mockCtx, enforcer, 0, 0, 24, true, 1000);

if (fills < 10) throw new Error('Fills too few, sprite not drawn properly');
console.log('Sprites verification passed! fills:', fills, 'strokes:', strokes);
