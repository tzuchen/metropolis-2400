import assert from 'assert';
import { GameEngine } from '../src/game';
import { SECTOR_STREET_SIGNS } from '../src/renderer';

console.log('=== Verifying Sewer Signs and NPC Collision ===\n');

// 1. Verify Street Signs sector segregation
console.log('1. Verifying Street Signs per sector...');
const sec1Signs = SECTOR_STREET_SIGNS.filter((s: any) => s.sectorId === 'sector-1');
const sec2Signs = SECTOR_STREET_SIGNS.filter((s: any) => s.sectorId === 'sector-2');
const sewerSigns = SECTOR_STREET_SIGNS.filter((s: any) => s.sectorId === 'sub-sector-0');
const citadelSigns = SECTOR_STREET_SIGNS.filter((s: any) => s.sectorId === 'sector-citadel');

assert(sec1Signs.length > 0, 'Sector 1 should have signs');
assert(sec2Signs.length > 0, 'Sector 2 should have signs');
assert(sewerSigns.length > 0, 'Sub-Sector 0 should have signs');
assert(citadelSigns.length > 0, 'Citadel should have signs');

// Ensure all signs have coordinates within map bounds (width 40, height <= 30)
for (const sign of SECTOR_STREET_SIGNS) {
  assert(sign.x >= 0 && sign.x < 40, `Sign "${sign.text}" x=${sign.x} out of bounds`);
  assert(sign.y >= 0 && sign.y < 30, `Sign "${sign.text}" y=${sign.y} out of bounds`);
  assert(sign.sectorId, `Sign "${sign.text}" must have sectorId`);
}
console.log('✅ All street signs have valid sectorId and within bounds!');

// 2. Verify sub-sector-0 signs do not contain Sector 1 signs
const sewerTexts = sewerSigns.map((s: any) => s.text);
assert(!sewerTexts.includes('★ REBEL BASE'), 'Sewer must not contain REBEL BASE');
assert(!sewerTexts.includes('CYBER-ALLEY 4'), 'Sewer must not contain CYBER-ALLEY 4');
assert(sewerTexts.includes('☣ STRANDED TECH'), 'Sewer should contain STRANDED TECH');
assert(sewerTexts.includes('⚠ PUMP CONTROLLER'), 'Sewer should contain PUMP CONTROLLER');
console.log('✅ Sewer street signs strictly separated from Sector 1!');

// 3. Verify Stranded Technician attributes in sub-sector-0
console.log('\n2. Verifying Stranded Technician NPC attributes...');
const canvas = {
  getContext: () => ({
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 10 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  }),
  width: 800,
  height: 600,
} as unknown as HTMLCanvasElement;

const game = new GameEngine(canvas);
game.switchSector('sub-sector-0');

const tech = game.npcs.find((n: any) => n.id === 'npc-technician');
assert(tech, 'Technician NPC should exist in sub-sector-0');
assert(tech.isAlive === true, 'Technician NPC must have isAlive === true');
assert(tech.hp === 100, 'Technician NPC must have hp === 100');
assert(tech.homeX === 22 && tech.homeY === 6, 'Technician homeX and homeY must be defined');
assert(tech.wanderRadius === 1, 'Technician wanderRadius must be 1');
console.log('✅ Stranded Technician has full valid NPC properties!');

// 4. Verify NPC collision: walking toward technician cannot penetrate
console.log('\n3. Verifying player cannot penetrate Technician...');
game.player.x = 22;
game.player.y = 5;
game.player.isWeaponDrawn = false;
game.activeDialogue = null;
(game as any).inputRouter.lastDialogueNpcId = null;

// Move Down into (22, 6)
game.handleKeyDown('s');

// Walking toward NPC when weapon is not drawn should trigger dialogue and NOT walk through
assert(game.activeDialogue !== null, 'Walking toward NPC should trigger activeDialogue');
assert(game.activeDialogue.npc.id === 'npc-technician', 'Active dialogue should be with Technician');
assert(game.player.x === 22 && game.player.y === 5, 'Player should remain at (22, 5), NOT penetrate to (22, 6)');
console.log('✅ Player walking toward NPC opens dialogue without penetrating NPC tile!');

// Now test with weapon drawn
console.log('\n4. Verifying weapon drawn blocks movement toward NPC...');
game.activeDialogue = null;
(game as any).inputRouter.lastDialogueNpcId = null;
game.player.isWeaponDrawn = true;

// Player at (22, 5), Technician at (22, 6)
// Move Down into (22, 6)
game.handleKeyDown('s');
assert(game.player.x === 22 && game.player.y === 5, 'Player with drawn weapon must NOT penetrate into NPC');
const msgs = game.messages.map((m: any) => m.text);
const hasHolsterWarning = msgs.some((m: string) => m.includes('收槍') || m.includes('Holster'));
assert(hasHolsterWarning, 'Game should warn player to holster weapon before talking');
console.log('✅ Weapon drawn prevents walking through NPC and issues holster warning!');

console.log('\n🎉 ALL SEWER SIGNS AND NPC COLLISION TESTS PASSED!');
