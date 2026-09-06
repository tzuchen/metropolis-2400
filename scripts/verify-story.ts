import { GameEngine } from '../src/game';

// Create mock canvas
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
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
  }),
} as unknown as HTMLCanvasElement;

const game = new GameEngine(mockCanvas);

console.log('Testing story logs initialization...');
if (!game.storyLogs || game.storyLogs.length !== 4) {
  throw new Error(`Expected 4 story logs, got ${game.storyLogs?.length}`);
}

const slateItems = game.groundItems.filter((it) => it.itemType === 'DATA_SLATE');
if (slateItems.length !== 4) {
  throw new Error(`Expected 4 data slate ground items, got ${slateItems.length}`);
}

console.log('Testing Story Archive toggle [L]...');
game.handleKeyDown('l');
if (!game.isStoryArchiveOpen) {
  throw new Error('Story Archive modal should be open after pressing L');
}
game.handleKeyDown('Escape');
if (game.isStoryArchiveOpen) {
  throw new Error('Story Archive modal should be closed after Escape');
}

console.log('Testing Data Slate pickup & lore unlock...');
// Pick up Dr. Vance's data slate
const vanceSlate = slateItems.find((it) => it.storyLogId === 'slate-vance')!;
game.player.x = vanceSlate.x;
game.player.y = vanceSlate.y;
game.handleKeyDown('g');

if (!game.activeStoryLog) {
  throw new Error('Active story log modal should open when data slate is collected');
}
if (game.activeStoryLog.id !== 'slate-vance') {
  throw new Error(`Expected active story log slate-vance, got ${game.activeStoryLog.id}`);
}
if (!game.storyLogs.find((l) => l.id === 'slate-vance')?.read) {
  throw new Error('Story log slate-vance should be marked as read');
}

console.log('Testing closing Story Log modal...');
game.handleKeyDown(' ');
if (game.activeStoryLog !== null) {
  throw new Error('Story log modal should be closed after pressing SPACE');
}

console.log('Testing dynamic NPC dialogue progression...');
const vance = game.npcs.find((n) => n.id === 'npc-vance')!;
if (!vance.dialogue[0].includes('laboratory disc') && !vance.dialogue[0].includes('research slate')) {
  throw new Error(`Doc Vance dialogue did not evolve after reading his log: ${vance.dialogue[0]}`);
}

console.log('Story and Lore narrative systems verified successfully!');
