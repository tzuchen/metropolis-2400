/**
 * Verification test suite for PlayerMovementController module in isolation.
 */

import { PlayerMovementController, MovementHost, MovementContext } from '../src/playerMovement';
import { Player, SectorMap, Robot, NPC, PushableBlock } from '../src/types';

console.log('Testing PlayerMovementController in isolation...');

const createMockMovementHost = (): MovementHost => {
  const map: SectorMap = {
    id: 'sector-1',
    name: 'Sector 1: Metropolis',
    width: 20,
    height: 20,
    tiles: Array.from({ length: 20 }, () => Array(20).fill(1)), // All floors (walkable)
    revealed: Array.from({ length: 20 }, () => Array(20).fill(true)),
    playerStart: { x: 5, y: 5 },
  } as any;

  const player: Player = {
    id: 'player',
    name: 'Raven',
    x: 5,
    y: 5,
    facing: 'right',
    hp: 100,
    maxHp: 100,
    energy: 50,
    maxEnergy: 50,
    isWeaponDrawn: false,
    isDisguised: false,
    inventory: [],
  } as any;

  const npcs: NPC[] = [
    {
      id: 'npc-test',
      name: 'Test NPC',
      x: 6,
      y: 5,
      isAlive: true,
      facing: 'left',
    } as any,
  ];

  const pushableBlocks: PushableBlock[] = [
    {
      id: 'block-test',
      x: 5,
      y: 7,
      blockType: 'crate',
      name: 'Cargo Crate',
      revealed: false,
    } as any,
  ];

  const messages: any[] = [];
  const floatingTexts: any[] = [];
  let stepCount = 0;
  let tickCount = 0;

  return {
    player,
    map,
    robots: [],
    npcs,
    hazards: [],
    pushableBlocks,
    groundItems: [],
    activeDialogue: null,
    language: 'en',
    fireEquippedWeapon() {},
    updateNPCDialogues() {},
    checkSideQuestDiscovery() {},
    handlePlayerStep() {
      stepCount++;
    },
    checkItemPickup() {},
    tick() {
      tickCount++;
    },
    render() {},
    switchSector() {},
    gainExp() {},
    pushFloatingText(x, y, text, color) {
      floatingTexts.push({ x, y, text, color });
    },
    pushMessage(text, type) {
      messages.push({ text, type });
    },
  };
};

// 1. Normal Walk (Empty Floor)
const host = createMockMovementHost();
const ctx: MovementContext = { lastDialogueNpcId: null };

// Move Up from (5, 5) -> (5, 4)
PlayerMovementController.handleMovement(host, 0, -1, ctx);
if (host.player.x !== 5 || host.player.y !== 4) {
  throw new Error(`Expected player at (5, 4), got (${host.player.x}, ${host.player.y})`);
}
console.log('✅ Normal walking updates player coordinates correctly');

// 2. NPC Dialogue Trigger & Position Swapping (借過)
// Move toward NPC at (6, 5) from (5, 4): first move back to (5, 5)
PlayerMovementController.handleMovement(host, 0, 1, ctx); // Now at (5, 5)
// Now walk right into NPC at (6, 5): should open dialogue
PlayerMovementController.handleMovement(host, 1, 0, ctx);
if (!host.activeDialogue || host.activeDialogue.npc.id !== 'npc-test') {
  throw new Error('Walking into NPC should initiate activeDialogue');
}
if (ctx.lastDialogueNpcId !== 'npc-test') {
  throw new Error('ctx.lastDialogueNpcId should be recorded');
}
console.log('✅ First bump into NPC opens activeDialogue');

// Second walk into the same NPC: should swap positions ('借過')
PlayerMovementController.handleMovement(host, 1, 0, ctx);
if (host.player.x !== 6 || host.player.y !== 5) {
  throw new Error(`Player should swap to (6, 5), got (${host.player.x}, ${host.player.y})`);
}
const swappedNPC = host.npcs.find((n) => n.id === 'npc-test');
if (!swappedNPC || swappedNPC.x !== 5 || swappedNPC.y !== 5) {
  throw new Error(`NPC should swap to (5, 5), got (${swappedNPC?.x}, ${swappedNPC?.y})`);
}
console.log('✅ Second bump into same NPC executes position swapping (借過)');

// 3. Pushable Block Interaction
// Player is at (6, 5). Move to (5, 6), facing block at (5, 7)
PlayerMovementController.handleMovement(host, -1, 1, ctx); // (5, 6)
// Push block south (0, 1) -> block should move to (5, 8), player to (5, 7)
PlayerMovementController.handleMovement(host, 0, 1, ctx);
const testBlock = host.pushableBlocks.find((b) => b.id === 'block-test');
if (!testBlock || testBlock.y !== 8) {
  throw new Error(`Pushable block should move to y=8, got ${testBlock?.y}`);
}
if (host.player.y !== 7) {
  throw new Error(`Player should advance to y=7, got ${host.player.y}`);
}
console.log('✅ Pushing block advances both block and player coordinates');

console.log('🎉 All PlayerMovementController isolation tests passed successfully!');
