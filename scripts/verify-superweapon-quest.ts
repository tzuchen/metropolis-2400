import { GameEngine } from '../src/game';
import { setupSubSectorZero } from '../src/sewerMap';
import { createBossExterminator, applyBossDamage } from '../src/boss';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

const mockCanvas = {
  width: 960,
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
    fill: () => {},
    stroke: () => {},
    measureText: () => ({ width: 50 }),
  }),
} as unknown as HTMLCanvasElement;

console.log('Testing Hidden Super-Weapon Quest & Boss Annihilation System...');

const game = new GameEngine(mockCanvas);

// 1. Check Project Singularity Objective
const superObj = game.missionObjectives.find((o) => o.id === 'obj-superweapon');
assert(!!superObj, 'Mission objectives must contain obj-superweapon');
assert(!superObj.completed, 'obj-superweapon should be uncompleted initially');
console.log('✅ Mission objective [Project Singularity: Quantum Annihilator] initialized!');

// 2. Step 1: Talk to Sylvia in Sector 1 to acquire Quantum Containment Core
const sylvia = game.npcs.find((n) => n.id === 'npc-sylvia');
assert(!!sylvia, 'Sylvia must exist in Sector 1');

// Trigger dialogue with Sylvia
game.activeDialogue = { npc: sylvia, textIndex: 0 };
const sylviaDialogueCount = sylvia.dialogue.length;
for (let i = 0; i < sylviaDialogueCount; i++) {
  game.handleKeyDown(' ');
}

const hasQuantumCore = game.player.inventory.some((it: any) => it?.id === 'item-quantum-core');
assert(hasQuantumCore, 'Player must receive item-quantum-core after completing Sylvia dialogue');
console.log('✅ Component 1/2: Quantum Containment Core obtained from Sylvia!');

// 3. Step 2: Transit to Sub-Sector Zero and collect Tzorg Matrix Override Chip
setupSubSectorZero(game);
const chipItem = game.groundItems.find((it: any) => it?.id === 'item-matrix-chip');
assert(!!chipItem, 'Sub-Sector Zero must spawn item-matrix-chip in drainage control');

// Move player to pick up matrix chip
game.player.x = chipItem.x;
game.player.y = chipItem.y;
game.checkItemPickup();

const hasMatrixChip = game.player.inventory.some((it: any) => it?.id === 'item-matrix-chip');
assert(hasMatrixChip, 'Player must collect item-matrix-chip from Sub-Sector Zero');
console.log('✅ Component 2/2: Tzorg Matrix Override Chip scavenged from Sub-Sector Zero!');

// 4. Step 3: Transit to Sector 2 and forge Quantum Annihilator with Zero-One
game.switchSector('sector-2');
const zeroOne = game.npcs.find((n) => n.id === 'npc-zero-one');
assert(!!zeroOne, 'Zero-One must exist in Sector 2');

const initialCredits = game.player.credits;
game.activeDialogue = { npc: zeroOne, textIndex: 0 };
const zeroOneDialogueCount = zeroOne.dialogue.length;
for (let i = 0; i < zeroOneDialogueCount; i++) {
  game.handleKeyDown(' ');
}

// Verify weapon forged
const hasSuperWeaponInv = game.player.inventory.some((it: any) => it?.id === 'quantum-annihilator');
const hasSuperWeaponList = (game.player as any).weapons.some((w: any) => (w as any)?.weaponId === 'QUANTUM_ANNIHILATOR');
const isSuperWeaponEquipped = (game.player.equippedWeapon as any)?.weaponId === 'QUANTUM_ANNIHILATOR';

assert(hasSuperWeaponInv, 'Quantum Annihilator must be in player inventory');
assert(hasSuperWeaponList, 'Quantum Annihilator must be added to player weapons list');
assert(isSuperWeaponEquipped, 'Quantum Annihilator must be automatically equipped');
assert(game.player.credits === initialCredits + 100, 'Forging super-weapon awards +100 Credits');

// Verify components consumed
assert(!game.player.inventory.some((it: any) => it?.id === 'item-quantum-core'), 'Quantum Core must be consumed during forge');
assert(!game.player.inventory.some((it: any) => it?.id === 'item-matrix-chip'), 'Matrix Chip must be consumed during forge');

// Verify objective completed
assert(superObj.completed, 'obj-superweapon objective must be marked completed');
console.log('✅ Hidden Super-Weapon [Quantum Annihilator] forged and equipped (Power: 220, Range: 7)!');

// 5. Test 4-Weapon Cycling [Q]
console.log('Testing 4-Weapon Arsenal Cycling...');
// Currently equipped: Quantum Annihilator
// Cycle 1: should wrap to Laser Pistol
game.handleKeyDown('q');
assert((game.player.equippedWeapon as any)?.name.includes('Laser'), 'Cycle from Quantum should loop to Laser Pistol');

// Cycle 2: Dart Gun
game.handleKeyDown('q');
assert((game.player.equippedWeapon as any)?.weaponId === 'DART_GUN', 'Cycle 2 should be Dart Gun');

// Cycle 3: Shotgun
game.handleKeyDown('q');
assert((game.player.equippedWeapon as any)?.weaponId === 'SCATTER_SHOTGUN', 'Cycle 3 should be Shotgun');

// Cycle 4: Quantum Annihilator
game.handleKeyDown('q');
assert((game.player.equippedWeapon as any)?.weaponId === 'QUANTUM_ANNIHILATOR', 'Cycle 4 should return to Quantum Annihilator');
console.log('✅ 4-Weapon Arsenal Cycling verified!');

// 6. Test Combat with Quantum Annihilator against Boss EXTERMINATOR-PRIME
console.log('Testing Quantum Annihilator vs EXTERMINATOR-PRIME Phase 2 Shield...');
const boss = createBossExterminator({ x: 30, y: 18 });
boss.hp = 120;
(boss as any).phase2Overclock = true; // Phase 2 shield active (normally 35% damage reduction)

// Standard weapon test (e.g. 100 raw damage reduced to 65)
const reducedDamage = applyBossDamage(boss, 100, { player: { equippedWeapon: { weaponId: 'LASER_PISTOL' } } });
assert(reducedDamage === 65, `Standard weapon should be reduced by 35% shield (expected 65, got ${reducedDamage})`);

// Reset boss HP and test Quantum Annihilator shield penetration
boss.hp = 220;
(boss as any).phase2Overclock = true;
boss.isAlive = true;
const quantumDamage = applyBossDamage(boss, 220, { player: { equippedWeapon: { weaponId: 'QUANTUM_ANNIHILATOR' } } });
assert(quantumDamage === 220, `Quantum Annihilator must bypass 35% Phase 2 shield completely (expected 220, got ${quantumDamage})`);
assert(boss.hp === 0, 'Boss should be eliminated by direct Quantum Annihilator blast');
assert(!boss.isAlive, 'Boss must be marked not alive');
assert((boss as any).stunnedTurns >= 1, 'Boss should receive EMP stun from Quantum beam');
console.log('✅ Boss Phase 2 Overclock Shield penetration & 220 DMG annihilation verified!');

console.log('🎉 All Hidden Super-Weapon Quest & Boss Annihilation tests passed successfully!');
