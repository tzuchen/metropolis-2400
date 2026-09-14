import { GameEngine } from '../src/game';
import { getSector1NPCs, getSector2NPCs, getSectorStoryLogs } from '../src/dialogues';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

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

console.log('Testing Title Screen, Bilingual Translations, and Save/Load Systems...');

// 1. Verify Dialogues & Lore Data
const s1Npcs = getSector1NPCs();
assert(s1Npcs.length >= 6, 'Must have at least 6 Sector 1 NPCs');
s1Npcs.forEach((npc) => {
  assert(!!npc.dialogue && npc.dialogue.length > 0, `${npc.name} must have English dialogue`);
  assert(!!npc.dialogueZh && npc.dialogueZh.length > 0, `${npc.name} must have Chinese dialogue`);
  assert(!!npc.roleZh, `${npc.name} must have Chinese role`);
});
console.log('✅ All Sector 1 NPCs have complete bilingual dialogues & roles!');

const s2Npcs = getSector2NPCs();
assert(s2Npcs.length >= 2, 'Must have at least 2 Sector 2 NPCs');
s2Npcs.forEach((npc) => {
  assert(!!npc.dialogue && npc.dialogue.length > 0, `${npc.name} must have English dialogue`);
  assert(!!npc.dialogueZh && npc.dialogueZh.length > 0, `${npc.name} must have Chinese dialogue`);
  assert(!!npc.roleZh, `${npc.name} must have Chinese role`);
});
console.log('✅ All Sector 2 NPCs have complete bilingual dialogues & roles!');

const logs = getSectorStoryLogs();
assert(logs.length >= 4, 'Must have at least 4 story logs');
logs.forEach((log) => {
  assert(!!log.titleZh, `Story log ${log.id} must have Chinese title`);
  assert(!!log.contentZh && log.contentZh.length > 0, `Story log ${log.id} must have Chinese content`);
});
console.log('✅ All Story Logs have complete bilingual titles & contents!');

// 2. Verify Title Screen Interaction
const game = new GameEngine(mockCanvas);
game.isTitleScreen = true;
game.language = 'zh';

// Toggle language on Title Screen
game.handleKeyDown('z');
assert(game.language === 'en', 'Pressing [Z] on Title Screen should toggle language to en');
game.handleKeyDown('z');
assert(game.language === 'zh', 'Pressing [Z] again should toggle language back to zh');

// Arrow navigation selects title menu entries without moving the player
game.titleMenuIndex = 0;
game.handleKeyDown('ArrowDown');
assert(game.titleMenuIndex === 1, 'ArrowDown should select the next title menu item');
game.handleKeyDown('ArrowUp');
assert(game.titleMenuIndex === 0, 'ArrowUp should select the previous title menu item');

// Pressing move key while on title screen should NOT move player
const startX = game.player.x;
game.handleKeyDown('ArrowRight');
assert(game.player.x === startX, 'Player should not move while on Title Screen');

// Pressing 'N' starts the new game
game.handleKeyDown('n');
assert(!game.isTitleScreen, 'Pressing [N] on Title Screen should enter the game');
console.log('✅ Title Screen controls & language toggle verified!');

// 2b. Verify Title Screen Navigation Wraps Through 7 Entries
game.isTitleScreen = true;
game.titleMenuIndex = 0;
game.handleKeyDown('ArrowDown');
assert(game.titleMenuIndex === 1, 'ArrowDown from 0 should go to 1');
game.handleKeyDown('ArrowDown');
assert(game.titleMenuIndex === 2, 'ArrowDown from 1 should go to 2');
game.handleKeyDown('ArrowDown');
assert(game.titleMenuIndex === 3, 'ArrowDown from 2 should go to 3');
game.handleKeyDown('ArrowDown');
assert(game.titleMenuIndex === 4, 'ArrowDown from 3 should go to 4');
game.handleKeyDown('ArrowDown');
assert(game.titleMenuIndex === 5, 'ArrowDown from 4 should go to 5');
game.handleKeyDown('ArrowDown');
assert(game.titleMenuIndex === 6, 'ArrowDown from 5 should go to 6');
game.handleKeyDown('ArrowDown');
assert(game.titleMenuIndex === 0, 'ArrowDown from 6 should wrap to 0');
game.handleKeyDown('ArrowUp');
assert(game.titleMenuIndex === 6, 'ArrowUp from 0 should wrap to 6');
game.handleKeyDown('ArrowUp');
assert(game.titleMenuIndex === 5, 'ArrowUp from 6 should go to 5');
console.log('✅ Title Screen navigation wraps through 7 entries!');

// 2c. Verify Load remains at index 1 and Story opens from index 4.
game.titleMenuIndex = 1;
game.handleKeyDown('Enter');
assert(game.isTitleStoryOpen === false, 'Load entry must not open Title Story');
game.titleMenuIndex = 4;
game.isTitleStoryOpen = false;
const storyOpenStartX = game.player.x;
const storyOpenStartY = game.player.y;
game.handleKeyDown('Enter');
assert(game.isTitleStoryOpen === true, 'Pressing Enter on Story entry should open Title Story');
assert(game.isTitleScreen === true, 'Title Screen should remain active while Story is open');
assert(game.player.x === storyOpenStartX && game.player.y === storyOpenStartY, 'Player should not move when opening Story');
game.render();
assert(game.renderer.isTitleStoryOpen === true, 'Renderer should receive active Title Story state');
console.log('✅ Title Story entry opens correctly!');

// 2d. Verify Z works while Story is open
game.language = 'zh';
game.handleKeyDown('z');
assert(game.language === 'en', 'Pressing Z while Story is open should toggle language to en');
game.handleKeyDown('z');
assert(game.language === 'zh', 'Pressing Z again while Story is open should toggle language back to zh');
console.log('✅ Language toggle works while Title Story is open!');

// 2e. Verify Escape closes Story without activating menu action
game.handleKeyDown('Escape');
assert(game.isTitleStoryOpen === false, 'Pressing Escape should close Title Story');
assert(game.isTitleScreen === true, 'Title Screen should still be active after closing Story');
assert(game.titleMenuIndex === 4, 'Menu index should remain at 4 after closing Story');
console.log('✅ Escape closes Title Story without side effects!');

// 2f. Verify Enter closes Story without activating menu action
game.handleKeyDown('Enter');
assert(game.isTitleStoryOpen === true, 'Pressing Enter on Story entry should open Title Story again');
game.handleKeyDown('Enter');
assert(game.isTitleStoryOpen === false, 'Pressing Enter while Story is open should close it');
assert(game.isTitleScreen === true, 'Title Screen should still be active after closing Story via Enter');
assert(game.titleMenuIndex === 4, 'Menu index should remain at 4 after closing Story via Enter');
console.log('✅ Enter closes Title Story without side effects!');

// 3. Verify In-Game Language Toggle
game.handleKeyDown('z');
assert(game.language === 'en', 'Pressing [Z] during gameplay toggles language to en');
game.handleKeyDown('z');
assert(game.language === 'zh', 'Pressing [Z] during gameplay toggles language to zh');
console.log('✅ In-game language switching verified!');

// 4. Verify Save & Load Functionality
// Ensure we are in-game mode for save/load shortcuts
game.isTitleScreen = false;
game.isTitleStoryOpen = false;
game.player.x = 10;
game.player.y = 12;
game.player.credits = 888;
game.player.hp = 55;
game.player.level = 3;
game.player.exp = 75;
game.player.expToNext = 225;
game.player.skillPoints = 2;
game.language = 'zh';

// Save the game via shortcut '8'
game.handleKeyDown('8');
assert(game.hasSaveGame(), 'Save game data should exist after pressing [8]');
console.log('✅ Game state saved successfully!');

// Modify state to simulate progress / damage
game.player.x = 2;
game.player.y = 2;
game.player.credits = 50;
game.player.hp = 20;
game.player.level = 1;
game.player.exp = 0;
game.player.expToNext = 100;
game.player.skillPoints = 0;
game.language = 'en';

// Load game via shortcut '9'
game.handleKeyDown('9');
assert(game.player.x === 10, `Expected player.x to be 10, got ${game.player.x}`);
assert(game.player.y === 12, `Expected player.y to be 12, got ${game.player.y}`);
assert(game.player.credits === 888, `Expected player.credits to be 888, got ${game.player.credits}`);
assert(game.player.hp === 55, `Expected player.hp to be 55, got ${game.player.hp}`);
assert(game.player.level === 3, `Expected player.level to be 3, got ${game.player.level}`);
assert(game.player.exp === 75, `Expected player.exp to be 75, got ${game.player.exp}`);
assert(game.player.expToNext === 225, `Expected player.expToNext to be 225, got ${game.player.expToNext}`);
assert(game.player.skillPoints === 2, `Expected player.skillPoints to be 2, got ${game.player.skillPoints}`);
assert(game.language === 'zh', `Expected language to be restored to zh, got ${game.language}`);
console.log('✅ In-game Quick Save [8] and Quick Load [9] verified!');

// 5. Verify Loading directly from Title Screen
game.isTitleScreen = true;
game.player.credits = 0;
game.handleKeyDown('l');
assert(!game.isTitleScreen, 'Loading game from Title Screen should close Title Screen and enter game');
assert(game.player.credits === 888, 'Loading from Title Screen should restore saved state');
console.log('✅ Title Screen Load Game [L] verified!');

// 6. Verify Chinese NPC Dialogue interaction
const hiro = (game as any).npcs.find((n: any) => n.id === 'npc-hiro');
assert(!!hiro, 'Hiro NPC must exist in Sector 1');
game.activeDialogue = { npc: hiro, textIndex: 0 };
game.language = 'zh';
game.handleKeyDown(' ');
assert(game.activeDialogue.textIndex === 1, 'Advancing Chinese dialogue should increment textIndex to 1');
console.log('✅ Chinese NPC Dialogue stepping verified!');

console.log('🎉 All Title Screen, Save/Load, and Bilingual Translation tests passed successfully!');
