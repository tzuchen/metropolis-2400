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

// Cycle 2: should switch to Scatter Plasma Shotgun
game.handleKeyDown('q');
const wpn2 = game.player.equippedWeapon;
if (!wpn2 || !wpn2.name.includes('Shotgun')) {
  throw new Error(`Expected weapon 2 to be Scatter Plasma Shotgun, got: ${wpn2?.name}`);
}
if (wpn2.power !== 65) {
  throw new Error(`Scatter Shotgun should have power 65, got: ${wpn2.power}`);
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

console.log('All multi-weapon tactical systems verified successfully!');
