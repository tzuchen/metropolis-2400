/**
 * Verification test suite for CollarSystem isolation and CollarHost contract.
 */

import { CollarSystem, CollarHost } from '../src/collarSystem';
import { Player, Robot, SecurityLevel } from '../src/types';

console.log('Testing CollarSystem module in isolation...');

// 1. Create a lightweight mock CollarHost
const createMockHost = (initialTimer = 100): CollarHost => {
  const player: Player = {
    id: 'player',
    name: 'Operative',
    x: 10,
    y: 10,
    hp: 100,
    maxHp: 100,
    energy: 50,
    maxEnergy: 50,
    credits: 0,
    inventory: [],
    equippedWeapon: null,
    isWeaponDrawn: false,
    checkInTimer: initialTimer,
    checkInMaxTimer: 100,
    isCollarDisarmed: false,
  } as any;

  const robots: Robot[] = [
    {
      id: 'bot-1',
      name: 'Patrol Drone',
      type: 'patrol',
      x: 15,
      y: 15,
      hp: 30,
      maxHp: 30,
      isAlive: true,
      aiState: 'patrol',
      targetPos: null,
      pursuitTurns: 0,
    } as any,
  ];

  const messages: { text: string; type?: string }[] = [];
  const floatingTexts: { text: string; color: string }[] = [];
  let expGained = 0;
  let renderCount = 0;

  return {
    player,
    isCollarDisarmed: false,
    checkInAlertActive: false,
    securityLevel: 'CLEAR' as SecurityLevel,
    robots,
    language: 'en',
    pushMessage(text: string, type?: string) {
      messages.push({ text, type });
    },
    pushFloatingText(x: number, y: number, text: string, color: string) {
      floatingTexts.push({ text, color });
    },
    gainExp(amount: number) {
      expGained += amount;
    },
    render() {
      renderCount++;
    },
  };
};

// Test 1: getCollarStatus inspection
const host1 = createMockHost(100);
const status1 = CollarSystem.getCollarStatus(host1);
if (status1.isDisarmed !== false || status1.timer !== 100 || status1.warningState !== 'NORMAL') {
  throw new Error(`getCollarStatus failed for NORMAL: ${JSON.stringify(status1)}`);
}
console.log('✅ CollarSystem.getCollarStatus reports NORMAL status');

// Test 2: Step decrement & warning state at 20
const host2 = createMockHost(21);
CollarSystem.handlePlayerStep(host2);
if (host2.player.checkInTimer !== 20) {
  throw new Error(`Expected timer 20, got ${host2.player.checkInTimer}`);
}
const status2 = CollarSystem.getCollarStatus(host2);
if (status2.warningState !== 'WARNING') {
  throw new Error(`Expected warningState WARNING, got ${status2.warningState}`);
}
console.log('✅ CollarSystem.handlePlayerStep decrements timer and triggers WARNING');

// Test 3: Critical warning at 10
const host3 = createMockHost(11);
CollarSystem.handlePlayerStep(host3);
if (host3.player.checkInTimer !== 10) {
  throw new Error(`Expected timer 10, got ${host3.player.checkInTimer}`);
}
const status3 = CollarSystem.getCollarStatus(host3);
if (status3.warningState !== 'CRITICAL') {
  throw new Error(`Expected warningState CRITICAL, got ${status3.warningState}`);
}
console.log('✅ CollarSystem.handlePlayerStep triggers CRITICAL warning');

// Test 4: Overdue triggers alert and robots enter chase mode
const host4 = createMockHost(1);
CollarSystem.handlePlayerStep(host4);
if (host4.player.checkInTimer !== 0) {
  throw new Error(`Expected timer 0, got ${host4.player.checkInTimer}`);
}
if (!host4.checkInAlertActive || host4.securityLevel !== 'ALERT') {
  throw new Error('Expected checkInAlertActive true and securityLevel ALERT');
}
if (host4.robots[0].aiState !== 'chase') {
  throw new Error(`Expected robot aiState chase, got ${host4.robots[0].aiState}`);
}
const status4 = CollarSystem.getCollarStatus(host4);
if (status4.warningState !== 'OVERDUE') {
  throw new Error(`Expected warningState OVERDUE, got ${status4.warningState}`);
}
console.log('✅ CollarSystem.handlePlayerStep overdue triggers ALERT and robot chase');

// Test 5: performCheckIn restores timer and de-escalates security
CollarSystem.performCheckIn(host4);
if (host4.player.checkInTimer !== 100) {
  throw new Error(`Expected checkInTimer reset to 100, got ${host4.player.checkInTimer}`);
}
if (host4.checkInAlertActive || host4.securityLevel !== 'CLEAR') {
  throw new Error('Expected checkInAlertActive false and securityLevel CLEAR');
}
if (host4.robots[0].aiState !== 'patrol') {
  throw new Error(`Expected robot aiState patrol, got ${host4.robots[0].aiState}`);
}
console.log('✅ CollarSystem.performCheckIn clears alert and resets timer');

// Test 6: Master pass disarms collar permanently
const host5 = createMockHost(50);
host5.player.inventory.push({ id: 'item-master-pass', name: 'Tzorg Master Keycard' } as any);
CollarSystem.performCheckIn(host5);
if (!host5.isCollarDisarmed || !host5.player.isCollarDisarmed) {
  throw new Error('Expected collar to be disarmed with Master Pass');
}
const status5 = CollarSystem.getCollarStatus(host5);
if (!status5.isDisarmed) {
  throw new Error('Expected status to report isDisarmed true');
}

// Subsequent steps should not decrement timer when disarmed
CollarSystem.handlePlayerStep(host5);
if (host5.player.checkInTimer !== 100) {
  throw new Error(`Timer should not decrement when disarmed, got ${host5.player.checkInTimer}`);
}
console.log('✅ CollarSystem.performCheckIn with Master Pass disarms collar permanently');

console.log('🎉 All CollarSystem isolation tests passed successfully!');
