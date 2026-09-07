import type {
  Player,
  Robot,
  RobotType,
  Item,
  ItemType,
  Position,
  SecurityLevel,
  CyberwareAugment,
} from './types';

const LASER_PISTOL_ID = 'laser-pistol';
const PERSONAL_SHIELD_ID = 'personal-shield';
const HOLO_DISGUISE_ID = 'holo-disguise';
const HACKER_ID = 'hacker-id';

const WEAPON_TYPE = 'weapon' as unknown as ItemType;
const SHIELD_TYPE = 'shield' as unknown as ItemType;
const GADGET_TYPE = 'gadget' as unknown as ItemType;

const DERMAL_ARMOR_ID = 'DERMAL_ARMOR';
const OPTIC_HUD_ID = 'OPTIC_HUD';
const REFLEX_BOOSTER_ID = 'REFLEX_BOOSTER';
const POWER_CORE_ID = 'POWER_CORE';

export const AVAILABLE_AUGMENTS: CyberwareAugment[] = [
  {
    id: DERMAL_ARMOR_ID,
    name: 'Dermal Armor',
    description: 'Subdermal plating that reduces incoming damage.',
    cost: 100,
  },
  {
    id: OPTIC_HUD_ID,
    name: 'Optic HUD',
    description: 'Retinal display that overlays tactical information.',
    cost: 120,
  },
  {
    id: REFLEX_BOOSTER_ID,
    name: 'Reflex Booster',
    description: 'Neural stimulator that improves reaction speed.',
    cost: 150,
  },
  {
    id: POWER_CORE_ID,
    name: 'Power Core',
    description: 'Auxiliary energy core that increases maximum energy.',
    cost: 100,
  },
] as unknown as CyberwareAugment[];

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

function lowSecurity(): SecurityLevel {
  return 'low' as unknown as SecurityLevel;
}

export function createPlayer(startPos: Position): Player {
  const laserPistol = createItem(
    LASER_PISTOL_ID,
    'Laser Pistol',
    WEAPON_TYPE,
    {
      power: 20,
      energyCost: 5,
      equipped: true,
      description: 'A futuristic pistol that fires concentrated laser beams.',
    }
  );

  const personalShield = createItem(
    PERSONAL_SHIELD_ID,
    'Personal Shield',
    SHIELD_TYPE,
    {
      power: 15,
      energyCost: 10,
      equipped: true,
      description: 'A small personal energy shield that absorbs damage.',
    }
  );

  const holoDisguise = createItem(
    HOLO_DISGUISE_ID,
    'Holo Disguise',
    GADGET_TYPE,
    {
      power: 10,
      energyCost: 8,
      equipped: true,
      description: 'Projects a holographic disguise to blend into crowds.',
    }
  );

  const hackerId = createItem(
    HACKER_ID,
    'Hacker ID',
    GADGET_TYPE,
    {
      power: 5,
      energyCost: 0,
      equipped: false,
      description: 'An identification badge that grants access to hacking terminals.',
    }
  );

  const dartGun = createItem(
    'silenced-dart-gun',
    'Silenced Dart Gun',
    WEAPON_TYPE,
    {
      power: 25,
      energyCost: 3,
      equipped: false,
      description: 'Pneumatic needle thrower. Zero acoustic signature.',
    }
  );
  (dartGun as any).weaponId = 'DART_GUN';
  (dartGun as any).range = 5;
  (dartGun as any).isSuppressed = true;

  const scatterShotgun = createItem(
    'scatter-shotgun',
    'Scatter Plasma Shotgun',
    WEAPON_TYPE,
    {
      power: 65,
      energyCost: 9,
      equipped: false,
      description: 'Wide-angle plasma burst. Devastating close-range scatter.',
    }
  );
  (scatterShotgun as any).weaponId = 'SCATTER_SHOTGUN';
  (scatterShotgun as any).range = 3;
  (scatterShotgun as any).isSuppressed = false;

  return {
    id: 'player',
    name: 'Player',
    x: startPos.x,
    y: startPos.y,
    hp: 100,
    maxHp: 100,
    isAlive: true,
    energy: 100,
    maxEnergy: 100,
    credits: 50,
    clearanceLevel: lowSecurity(),
    augments: {
      DERMAL_ARMOR: false,
      OPTIC_HUD: false,
      REFLEX_BOOSTER: false,
      POWER_CORE: false,
    },
    inventory: [laserPistol, personalShield, holoDisguise, hackerId],
    weapons: [laserPistol, dartGun, scatterShotgun],
    equippedWeapon: laserPistol,
    equippedShield: personalShield,
    equippedGadget: holoDisguise,
    isDisguised: false,
    isWeaponDrawn: false,
    consumables: {
      medkits: 1,
      batteries: 1,
      empGrenades: 1,
    },
  } as unknown as Player;
}

export function createRobot(type: RobotType, startPos: Position, patrolPath?: Position[]): Robot {
  const statsByType: Record<string, { hp: number; attackPower: number; scanRange: number; attackRange: number }> = {
    SCOUT_DRONE: { hp: 55, attackPower: 12, scanRange: 7, attackRange: 3 },
    SHOCK_ENFORCER: { hp: 120, attackPower: 22, scanRange: 6, attackRange: 2 },
    HUNTER_KILLER: { hp: 180, attackPower: 32, scanRange: 9, attackRange: 5 },
    EXTERMINATOR: { hp: 300, attackPower: 45, scanRange: 8, attackRange: 5 },
    SERVICE_BOT: { hp: 20, attackPower: 0, scanRange: 2, attackRange: 0 },
  };

  const key = String(type).toUpperCase();
  const stats = statsByType[key] ?? { hp: 50, attackPower: 10, scanRange: 5, attackRange: 1 };
  const path = (patrolPath ?? []).map(clonePosition);
  const targetPos = path.length > 0 ? clonePosition(path[0]) : null;

  return {
    id: `robot-${String(type)}`,
    name: String(type),
    x: startPos.x,
    y: startPos.y,
    hp: stats.hp,
    maxHp: stats.hp,
    isAlive: true,
    robotType: type,
    aiState: 'patrol' as Robot['aiState'],
    patrolPath: path,
    currentPatrolIndex: 0,
    targetPos,
    alertCooldown: 0,
    attackPower: stats.attackPower,
    scanRange: stats.scanRange,
    attackRange: stats.attackRange ?? 1,
    stunnedTurns: 0,
  } as unknown as Robot;
}

export function toggleWeaponDraw(player: Player): boolean {
  player.isWeaponDrawn = !player.isWeaponDrawn;
  return player.isWeaponDrawn;
}

export function cycleWeapon(player: Player): Item {
  const p = player as unknown as { weapons?: Item[]; equippedWeapon?: Item };
  const weapons = p.weapons ?? [];

  if (weapons.length === 0) {
    return p.equippedWeapon as Item;
  }

  const current = p.equippedWeapon;
  const currentIndex = weapons.findIndex(
    (weapon) => weapon === current || (current !== undefined && weapon.id === current.id)
  );

  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % weapons.length;
  const nextWeapon = weapons[nextIndex];

  p.equippedWeapon = nextWeapon;
  return nextWeapon;
}

export function toggleDisguise(player: Player): boolean {
  player.isDisguised = !player.isDisguised;
  return player.isDisguised;
}

export function damageEntity(entity: { hp: number; isAlive: boolean }, amount: number): number {
  if (!entity.isAlive || !Number.isFinite(amount) || amount <= 0) {
    return entity.hp;
  }

  entity.hp = Math.max(0, entity.hp - amount);
  entity.isAlive = entity.hp > 0;
  return entity.hp;
}

export function consumeEnergy(player: Player, amount: number): boolean {
  if (!Number.isFinite(amount) || amount < 0) {
    return false;
  }

  if (player.energy < amount) {
    return false;
  }

  player.energy -= amount;
  return true;
}

export function installAugment(player: Player, augmentId: string): boolean {
  const p = player as unknown as {
    credits: number;
    maxEnergy: number;
    augments?: Record<string, boolean>;
  };

  const augment = AVAILABLE_AUGMENTS.find(
    (entry) => (entry as unknown as { id?: string }).id === augmentId
  ) as unknown as { id: string; cost: number } | undefined;

  if (!augment || !Number.isFinite(augment.cost) || augment.cost < 0) {
    return false;
  }

  if (p.augments?.[augmentId]) {
    return false;
  }

  if (!Number.isFinite(p.credits) || p.credits < augment.cost) {
    return false;
  }

  p.credits -= augment.cost;

  if (!p.augments) {
    p.augments = {
      DERMAL_ARMOR: false,
      OPTIC_HUD: false,
      REFLEX_BOOSTER: false,
      POWER_CORE: false,
    };
  }

  p.augments[augmentId] = true;

  if (augmentId === POWER_CORE_ID) {
    p.maxEnergy = 150;
  }

  return true;
}
