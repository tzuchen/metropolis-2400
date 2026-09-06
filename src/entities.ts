import type {
  Player,
  Robot,
  RobotType,
  Item,
  ItemType,
  Position,
  SecurityLevel,
} from './types';

const LASER_PISTOL_ID = 'laser-pistol';
const PERSONAL_SHIELD_ID = 'personal-shield';
const HOLO_DISGUISE_ID = 'holo-disguise';
const HACKER_ID = 'hacker-id';

function clonePosition(pos: Position): Position {
  return { ...pos } as Position;
}

function createItem(
  id: string,
  name: string,
  type: ItemType,
  options: { power?: number; energyCost?: number; equipped?: boolean; description?: string } = {}
): Item {
  return {
    id,
    name,
    type,
    power: options.power ?? 0,
    energyCost: options.energyCost ?? 0,
    equipped: options.equipped ?? false,
    description: options.description ?? '',
  } as unknown as Item;
}

export function createPlayer(startPos: Position): Player {
  const laserPistol = createItem(LASER_PISTOL_ID, 'Laser Pistol', 'WEAPON' as ItemType, { power: 25, energyCost: 10, equipped: true, description: 'Default sidearm.' });
  const personalShield = createItem(PERSONAL_SHIELD_ID, 'Personal Shield', 'SHIELD' as ItemType, { power: 15, energyCost: 5, equipped: true, description: 'Personal force shield.' });
  const holoDisguise = createItem(HOLO_DISGUISE_ID, 'Holo-Disguise', 'GADGET' as ItemType, { energyCost: 20, equipped: false, description: 'Holographic disguise.' });
  const hackerId = createItem(HACKER_ID, 'Hacker ID', 'KEYCARD' as ItemType, { equipped: false, description: 'Contraband identity chip.' });
  const inventory = [laserPistol, personalShield, holoDisguise, hackerId];
  const position = clonePosition(startPos);
  const player = {
    id: 'player',
    name: 'Player',
    pos: position,
    position: position,
    x: position.x,
    y: position.y,
    hp: 100,
    maxHp: 100,
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    energyLevel: 100,
    maxEnergyLevel: 100,
    credits: 50,
    clearanceLevel: 'CLEAR' as SecurityLevel,
    inventory,
    items: inventory,
    equipment: inventory.filter(item => item.equipped === true),
    backpack: inventory.filter(item => item.equipped !== true),
    isDisguised: false,
    isWeaponDrawn: false,
  } as unknown as Player;
  return player;
}
