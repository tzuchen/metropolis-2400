import { TileType, SecurityLevel } from '../src/types';
import { TerminalSession } from '../src/terminal';
import { GameEngine } from '../src/game';
import { GameRenderer } from '../src/renderer';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error('ASSERT FAILED: ' + message);
  }
}

function getTileAt(map: any, x: number, y: number): number {
  const tiles = map.tiles;
  if (!tiles || !tiles[y]) return -1;
  return tiles[y][x];
}

export function verifyCheckpointRelayAnnex(): void {
  // Headless mock canvas (no document.createElement)
  const canvas: any = {
    width: 960,
    height: 600,
    getContext: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
    style: {},
    parentElement: null,
  };

  const game = new GameEngine(canvas);

  // Verify initial annex interior is FLOOR (28..30, 4..10)
  for (let x = 28; x <= 30; x++) {
    for (let y = 4; y <= 10; y++) {
      const t = getTileAt(game.map, x, y);
      assert(t === TileType.FLOOR, `Annex interior (${x},${y}) should be FLOOR, got ${t}`);
    }
  }

  // Verify terminal position (29,9)
  const relayTerminal = game.map.terminals['TERMINAL_CHECKPOINT_RELAY'];
  assert(relayTerminal, 'TERMINAL_CHECKPOINT_RELAY should exist');
  assert(relayTerminal.position.x === 29 && relayTerminal.position.y === 9, 'Relay terminal at (29,9)');

  // Verify credential position (29,7)
  const credItem = game.groundItems.find((i: any) => i.id === 'item-forged-checkin-credential');
  assert(credItem, 'Credential item should exist');
  assert(credItem.x === 29 && credItem.y === 7, 'Credential at (29,7)');

  // Verify slate position (30,5)
  const slateItem = game.groundItems.find((i: any) => i.id === 'slate-item-checkpoint-relay');
  assert(slateItem, 'Slate item should exist');
  assert(slateItem.x === 30 && slateItem.y === 5, 'Slate at (30,5)');

  // Verify bypass (29,11) is WALL
  const bypassTile = getTileAt(game.map, 29, 11);
  assert(bypassTile === TileType.WALL, `Bypass (29,11) should be WALL, got ${bypassTile}`);

  // Verify forcefield positions are FORCEFIELD initially
  for (let y = 4; y <= 10; y++) {
    const t = getTileAt(game.map, 27, y);
    assert(t === TileType.FORCEFIELD, `Forcefield (27,${y}) should be FORCEFIELD, got ${t}`);
  }

  // Verify obj-forcefield not completed, obj-checkpoint-relay not discovered
  const objForcefield = game.missionObjectives.find((o: any) => o.id === 'obj-forcefield');
  assert(objForcefield && !objForcefield.completed, 'obj-forcefield should be incomplete initially');
  const objRelay = game.missionObjectives.find((o: any) => o.id === 'obj-checkpoint-relay');
  assert(objRelay && !objRelay.discovered, 'obj-checkpoint-relay should be undiscovered initially');

  // Execute terminal override via real path
  const session = new TerminalSession(game.map.terminals['TERMINAL_CHECKPOINT_CONTROL']);
  game.activeTerminal = session;
  game.terminalInputBuffer = 'override';
  session.input = 'override';
  game.handleKeyDown('Enter');

  // Verify forcefield disabled: x=27, y=4..10 now FLOOR
  for (let y = 4; y <= 10; y++) {
    const t = getTileAt(game.map, 27, y);
    assert(t === TileType.FLOOR, `After override, (27,${y}) should be FLOOR, got ${t}`);
  }

  // Verify obj-forcefield completed
  const objForcefieldAfter = game.missionObjectives.find((o: any) => o.id === 'obj-forcefield');
  assert(objForcefieldAfter && objForcefieldAfter.completed, 'obj-forcefield should be completed after override');

  // Verify obj-checkpoint-relay discovered but incomplete
  const objRelayAfter = game.missionObjectives.find((o: any) => o.id === 'obj-checkpoint-relay');
  assert(objRelayAfter && objRelayAfter.discovered, 'obj-checkpoint-relay should be discovered after override');
  assert(!objRelayAfter.completed, 'obj-checkpoint-relay should be incomplete after override');

  // Verify guidance message exists
  const hasGuidance = game.messages.some((m: any) =>
    m.text.includes('Relay Annex') || m.text.includes('中繼附屬區')
  );
  assert(hasGuidance, 'Guidance message for relay annex should exist');

  // Verify bypass still WALL
  const bypassAfter = getTileAt(game.map, 29, 11);
  assert(bypassAfter === TileType.WALL, `Bypass (29,11) should remain WALL, got ${bypassAfter}`);

  // Move player to credential at (29,7) and pick it up
  // Wrap gainExp to record calls
  const expCalls: Array<{ amount: number; reason: string }> = [];
  const originalGainExp = game.gainExp.bind(game);
  game.gainExp = function (amount: number, reason?: string) {
    expCalls.push({ amount, reason: reason || '' });
    originalGainExp(amount, reason);
  } as any;

  // Teleport player to credential location
  game.player.x = 29;
  game.player.y = 7;
  game.updateFOV();

  // Simulate picking up the credential by calling the pickup logic
  game.checkItemPickup();

  // Verify exactly one gainExp call with amount=100, reason='CREDENTIAL'
  const credExpCall = expCalls.find((c) => c.amount === 100 && c.reason === 'CREDENTIAL');
  assert(credExpCall, 'Should have exactly one gainExp call with amount=100, reason=CREDENTIAL');
  const credExpCount = expCalls.filter((c) => c.amount === 100 && c.reason === 'CREDENTIAL').length;
  assert(credExpCount === 1, `Should have exactly 1 CREDENTIAL exp call, got ${credExpCount}`);

  // Restore original gainExp
  game.gainExp = originalGainExp;

  // Verify credential in inventory
  const invCred = game.player.inventory.find((i: any) => i.id === 'item-forged-checkin-credential');
  assert(invCred, 'Credential should be in inventory after pickup');

  // Verify max timer is 125
  assert(game.player.checkInMaxTimer === 125, `checkInMaxTimer should be 125, got ${game.player.checkInMaxTimer}`);

  // Verify current timer unchanged (still 100 from initial) and alert not active
  assert(game.player.checkInTimer === 100, `checkInTimer should remain 100, got ${game.player.checkInTimer}`);
  assert(!game.checkInAlertActive, 'checkInAlertActive should be false');

  // Verify relay objective complete after credential pickup
  const objRelayCred = game.missionObjectives.find((o: any) => o.id === 'obj-checkpoint-relay');
  assert(objRelayCred && objRelayCred.completed, 'obj-checkpoint-relay should be complete after credential pickup');

  // Test performCheckIn resets timer to 125
  game.performCheckIn();
  assert(game.player.checkInTimer === 125, `After performCheckIn, timer should be 125, got ${game.player.checkInTimer}`);

  // Pick up slate at (30,5)
  game.player.x = 30;
  game.player.y = 5;
  game.checkItemPickup();

  // Verify slate becomes read and active
  const slateLog = game.storyLogs.find((l: any) => l.id === 'slate-checkpoint-relay');
  assert(slateLog, 'Slate story log should exist');
  assert(slateLog.read === true, 'Slate should be read after pickup');
  assert(game.activeStoryLog !== null && game.activeStoryLog.id === 'slate-checkpoint-relay', 'Active story log should be the checkpoint relay slate');

  // HUD regression: verify CHK: 125/125 is rendered when checkInTimer=125, checkInMaxTimer=125, isCollarDisarmed=false
  const hudRecordedTexts: string[] = [];
  const hudRecordingCtx = {
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: (text: string) => { hudRecordedTexts.push(String(text)); },
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    setLineDash: () => {},
    measureText: (text: string) => ({ width: String(text).length * 7 }),
  };
  const hudRecordingCanvas = {
    width: 800,
    height: 600,
    getContext: () => hudRecordingCtx,
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    style: {},
    parentElement: null,
  } as any;

  const hudRenderer = new GameRenderer(hudRecordingCanvas);
  hudRenderer.language = 'en';

  const hudPlayer = {
    ...game.player,
    checkInTimer: 125,
    checkInMaxTimer: 125,
    isCollarDisarmed: false,
  };

  hudRenderer.drawHud(800, 600, hudPlayer as any, SecurityLevel.CLEAR, [], hudRecordingCtx);

  const chkEntry = hudRecordedTexts.find((t) => t === 'CHK: 125/125');
  assert(chkEntry !== undefined, 'HUD should render exactly "CHK: 125/125"');
  const chkCount = hudRecordedTexts.filter((t) => t === 'CHK: 125/125').length;
  assert(chkCount === 1, `HUD should render "CHK: 125/125" exactly once, got ${chkCount}`);
}

try {
  verifyCheckpointRelayAnnex();
  console.log('PASS: verify-checkpoint-relay-annex');
} catch (e: any) {
  console.error('FAIL: verify-checkpoint-relay-annex');
  console.error(e && e.message ? e.message : String(e));
  process.exit(1);
}
