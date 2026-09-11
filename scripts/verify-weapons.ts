import { GameEngine } from '../src/game';

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

console.log('Testing initial weapons arsenal...');
if (!game.player.weapons || game.player.weapons.length < 3) {
  throw new Error(`Player should have at least 3 weapons, found: ${game.player.weapons?.length}`);
}

const initialWpn = game.player.equippedWeapon;
if (!initialWpn || !initialWpn.name.includes('Laser')) {
  throw new Error(`Expected initial weapon to be Laser Blaster, got: ${initialWpn?.name}`);
}

// Direct spec assertions prevent documented weapon statistics from drifting.
if (initialWpn.name !== "Laser Blaster Mk-II" || initialWpn.power !== 35 || initialWpn.energyCost !== 5 || (initialWpn as any).range !== 6 || (initialWpn as any).isSuppressed !== false) {
  throw new Error("Laser Blaster Mk-II spec must be 35 DMG, 5 EN, range 6, unsuppressed");
}

console.log('Testing Weapon Cycling [Q]...');
// Cycle 1: should switch to Dart Gun
game.handleKeyDown('q');
const wpn1 = game.player.equippedWeapon;
if (!wpn1 || !wpn1.name.includes('Dart')) {
  throw new Error(`Expected weapon 1 to be Silenced Dart Gun, got: ${wpn1?.name}`);
}
if (!(wpn1 as any).isSuppressed) {
  throw new Error('Dart Gun should be flagged as isSuppressed');
}

if (wpn1.power !== 25 || wpn1.energyCost !== 3 || (wpn1 as any).range !== 5 || !(wpn1 as any).isSuppressed) {
  throw new Error("Silenced Dart Gun spec must be 25 DMG, 3 EN, range 5, suppressed");
}

// Cycle 2: should switch to Scatter Plasma Shotgun
game.handleKeyDown('q');
const wpn2 = game.player.equippedWeapon;
if (!wpn2 || !wpn2.name.includes('Shotgun')) {
  throw new Error(`Expected weapon 2 to be Scatter Plasma Shotgun, got: ${wpn2?.name}`);
}
if (wpn2.power !== 65) {
  throw new Error(`Scatter Shotgun should have power 65, got: ${wpn2.power}`);
}

if (wpn2.power !== 65 || wpn2.energyCost !== 9 || (wpn2 as any).range !== 3 || (wpn2 as any).isSuppressed !== false) {
  throw new Error("Scatter Plasma Shotgun spec must be 65 DMG, 9 EN, range 3, unsuppressed");
}

// Cycle 3: should switch back to Laser Blaster
game.handleKeyDown('q');
const wpn3 = game.player.equippedWeapon;
if (!wpn3 || !wpn3.name.includes('Laser')) {
  throw new Error(`Expected weapon 3 to cycle back to Laser Blaster, got: ${wpn3?.name}`);
}

console.log('Testing Suppressed Firing acoustic suppression...');
// Switch to dart gun
game.handleKeyDown('q');
game.player.isWeaponDrawn = true;
// Disguise to prevent visual sight alarm
game.player.isDisguised = true;
game.securityLevel = 'CLEAR';

// Move robots far away so only acoustic check could alert them
game.robots.forEach(r => { r.x = 35; r.y = 25; });

game.handleKeyDown('ArrowRight');
// With suppressed weapon and no visual detection, securityLevel must remain CLEAR
if (game.securityLevel === 'ALERT') {
  throw new Error('Suppressed weapon should not trigger acoustic security ALERT');
}

console.log('Testing Scatter Plasma Shotgun cone...');
// Select the Scatter Plasma Shotgun (cycle: Laser -> Dart -> Shotgun)
// After the suppressed firing test, the weapon is on Dart Gun (index 1).
// We need to cycle to Shotgun (index 2), which is one more press.
game.handleKeyDown('q');
const shotgun = game.player.equippedWeapon;
if (!shotgun || !shotgun.name.includes('Shotgun')) {
  throw new Error(`Expected to equip Scatter Plasma Shotgun, got: ${shotgun?.name}`);
}

// Clear robots/hazards/pushableBlocks so only our three targets exist
game.robots.length = 0;
game.hazards.length = 0;
game.pushableBlocks.length = 0;

// Place player at an open location with valid floor tiles nearby
game.player.x = 10;
game.player.y = 10;

// Add three robot targets: center (12,10) and diagonals (11,9),(11,11)
const centerRobot = {
  id: 'shotgun-center',
  name: 'Center Sentry',
  x: 12,
  y: 10,
  hp: 100,
  maxHp: 100,
  isAlive: true,
  aiState: 'patrol',
  targetPos: null,
} as unknown as Robot;
const diagRobot1 = {
  id: 'shotgun-diag1',
  name: 'Diag Sentry A',
  x: 11,
  y: 9,
  hp: 100,
  maxHp: 100,
  isAlive: true,
  aiState: 'patrol',
  targetPos: null,
} as unknown as Robot;
const diagRobot2 = {
  id: 'shotgun-diag2',
  name: 'Diag Sentry B',
  x: 11,
  y: 11,
  hp: 100,
  maxHp: 100,
  isAlive: true,
  aiState: 'patrol',
  targetPos: null,
} as unknown as Robot;
game.robots.push(centerRobot, diagRobot1, diagRobot2);

const energyBefore = game.player.energy;
const beamsBefore = game.laserBeams.length;

game.fireEquippedWeapon({ dx: 1, dy: 0 });

// Energy must fall by exactly 9 (shotgun energyCost)
if (energyBefore - game.player.energy !== 9) {
  throw new Error(`Shotgun should consume 9 energy, fell by: ${energyBefore - game.player.energy}`);
}

// Three new beams, all PLASMA
const newBeams = game.laserBeams.slice(beamsBefore);
if (newBeams.length !== 3) {
  throw new Error(`Expected 3 new beams, got: ${newBeams.length}`);
}
for (const b of newBeams) {
  if (b.beamType !== 'PLASMA') {
    throw new Error(`All shotgun beams must be PLASMA, got: ${b.beamType}`);
  }
}

// Endpoints must include (12,10), (11,9), (11,11)
const endpoints = newBeams.map((b) => `${b.to.x},${b.to.y}`).sort();
const expectedEndpoints = ['11,11', '11,9', '12,10'].sort();
if (JSON.stringify(endpoints) !== JSON.stringify(expectedEndpoints)) {
  throw new Error(`Shotgun beam endpoints must be (12,10),(11,9),(11,11), got: ${endpoints.join(' ')}`);
}

// Center HP fell by 65, each diagonal HP fell by 35
if (centerRobot.hp !== 35) {
  throw new Error(`Center robot should take 65 damage (hp 100->35), got hp: ${centerRobot.hp}`);
}
if (diagRobot1.hp !== 65) {
  throw new Error(`Diagonal robot A should take 35 damage (hp 100->65), got hp: ${diagRobot1.hp}`);
}
if (diagRobot2.hp !== 65) {
  throw new Error(`Diagonal robot B should take 35 damage (hp 100->65), got hp: ${diagRobot2.hp}`);
}

console.log('Testing Scatter Plasma Shotgun deterministic branch...');
// Build a clean, deterministic state: open map, shotgun equipped, three targets on the
// center + forward-diagonal right-facing pellet paths. No reliance on wall layout or live time.
const shotgunGame = new GameEngine(mockCanvas);
// Ensure the Scatter Plasma Shotgun is equipped (cycle from Laser -> Dart -> Shotgun).
shotgunGame.handleKeyDown('q');
shotgunGame.handleKeyDown('q');
const shotgunWpn = shotgunGame.player.equippedWeapon;
if (!shotgunWpn || !shotgunWpn.name.includes('Shotgun')) {
  throw new Error(`Expected Scatter Plasma Shotgun equipped, got: ${shotgunWpn?.name}`);
}

// Clear all existing robots/hazards/blocks so only our three deterministic targets exist.
shotgunGame.robots.length = 0;
shotgunGame.hazards.length = 0;
shotgunGame.pushableBlocks.length = 0;
shotgunGame.laserBeams.length = 0;

// Place the player at an open location.
shotgunGame.player.x = 10;
shotgunGame.player.y = 10;
shotgunGame.player.isWeaponDrawn = true;
shotgunGame.securityLevel = 'CLEAR';

// Three targets: center (12,10) and forward diagonals (11,9) up / (11,11) down.
const sCenter = {
  id: 's-center',
  name: 'S Center',
  x: 12,
  y: 10,
  hp: 100,
  maxHp: 100,
  isAlive: true,
  aiState: 'patrol',
  targetPos: null,
} as unknown as Robot;
const sUp = {
  id: 's-up',
  name: 'S Up',
  x: 11,
  y: 9,
  hp: 100,
  maxHp: 100,
  isAlive: true,
  aiState: 'patrol',
  targetPos: null,
} as unknown as Robot;
const sDown = {
  id: 's-down',
  name: 'S Down',
  x: 11,
  y: 11,
  hp: 100,
  maxHp: 100,
  isAlive: true,
  aiState: 'patrol',
  targetPos: null,
} as unknown as Robot;
shotgunGame.robots.push(sCenter, sUp, sDown);

const sEnergyBefore = shotgunGame.player.energy;
const sBeamsBefore = shotgunGame.laserBeams.length;

// Fire right: deterministic, no browser APIs required for the shotgun branch.
shotgunGame.fireEquippedWeapon({ dx: 1, dy: 0 });

// Energy must fall by exactly 9 (shotgun energyCost).
if (sEnergyBefore - shotgunGame.player.energy !== 9) {
  throw new Error(`Shotgun should consume 9 energy, fell by: ${sEnergyBefore - shotgunGame.player.energy}`);
}

// Exactly three newly-created PLASMA beams, all originating at the player.
const sNewBeams = shotgunGame.laserBeams.slice(sBeamsBefore);
if (sNewBeams.length !== 3) {
  throw new Error(`Expected 3 new shotgun beams, got: ${sNewBeams.length}`);
}
for (const b of sNewBeams) {
  if (b.beamType !== 'PLASMA') {
    throw new Error(`All shotgun beams must be PLASMA, got: ${b.beamType}`);
  }
  if (b.from.x !== 10 || b.from.y !== 10) {
    throw new Error(`Shotgun beam must originate at player (10,10), got: ${b.from.x},${b.from.y}`);
  }
}

// Endpoints must match the center / right-up / right-down first-target positions.
const sEndpoints = sNewBeams.map((b) => `${b.to.x},${b.to.y}`).sort();
const sExpectedEndpoints = ['11,11', '11,9', '12,10'].sort();
if (JSON.stringify(sEndpoints) !== JSON.stringify(sExpectedEndpoints)) {
  throw new Error(`Shotgun beam endpoints must be (12,10),(11,9),(11,11), got: ${sEndpoints.join(' ')}`);
}

// Center target loses 65 HP; each diagonal target loses 35 HP.
if (sCenter.hp !== 35) {
  throw new Error(`Center robot should take 65 damage (hp 100->35), got hp: ${sCenter.hp}`);
}
if (sUp.hp !== 65) {
  throw new Error(`Diagonal-up robot should take 35 damage (hp 100->65), got hp: ${sUp.hp}`);
}
if (sDown.hp !== 65) {
  throw new Error(`Diagonal-down robot should take 35 damage (hp 100->65), got hp: ${sDown.hp}`);
}

console.log('All multi-weapon tactical systems verified successfully!');
