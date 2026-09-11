import type {
  Robot,
  RobotType,
  NPC,
  StoryLog,
  GroundItem,
  MissionObjective,
  Hazard,
  PushableBlock,
} from './types';
import { createRobot } from './entities';
import { getSector1NPCs, getSector2NPCs, getSectorStoryLogs } from './dialogues';

export function createSectorRobots(): Robot[] {
  return [
    createRobot('SCOUT_DRONE' as RobotType, { x: 12, y: 5 }, [{ x: 12, y: 5 }, { x: 12, y: 12 }]),
    createRobot('SCOUT_DRONE' as RobotType, { x: 18, y: 8 }, [{ x: 18, y: 8 }, { x: 24, y: 8 }]),
    createRobot('SHOCK_ENFORCER' as RobotType, { x: 24, y: 6 }, [{ x: 24, y: 5 }, { x: 24, y: 8 }]),
    createRobot('HUNTER_KILLER' as RobotType, { x: 32, y: 18 }, [{ x: 32, y: 18 }, { x: 32, y: 24 }]),
    createRobot('SERVICE_BOT' as RobotType, { x: 8, y: 10 }, [{ x: 8, y: 10 }, { x: 8, y: 14 }]),
  ];
}

export function createSectorNPCs(): NPC[] {
  return getSector1NPCs();
}

export function createSector2NPCs(): NPC[] {
  return getSector2NPCs();
}

export function createSectorStoryLogs(): StoryLog[] {
  const baseLogs = getSectorStoryLogs();
  const existingIds = new Set(baseLogs.map((l) => l.id));
  const extraLogs: StoryLog[] = [];

  if (!existingIds.has('slate-tzorg')) {
    extraLogs.push({
      id: 'slate-tzorg',
      title: 'Tzorg Security Directive',
      read: false,
      content: 'CLASSIFIED: Subject Raven has breached perimeter. All units engage on sight. Deploy Hunter-Killers to Central Data Core. The Five Million must remain dormant. Failure to comply will result in neural termination.',
    } as unknown as StoryLog);
  }

  if (!existingIds.has('slate-ghost')) {
    extraLogs.push({
      id: 'slate-ghost',
      title: 'Awakening the Five Million',
      read: false,
      content: 'Intercepted quantum transmission: The neural collars can be reversed. If the Central Overmind core is breached, the signal can be broadcast to all five million subjects. Freedom is not a privilege. It is a right. — Ghost',
    } as unknown as StoryLog);
  }

  return [...baseLogs, ...extraLogs];
}

export function createSectorItems(): GroundItem[] {
  return [
    {
      id: 'item-med-1',
      name: 'Nanite Medkit',
      itemType: 'MEDKIT',
      x: 8,
      y: 7,
      description: 'Military-grade nanite injector. Restores +40 HP.',
      amount: 1,
      iconColor: '#00ff88',
    },
    {
      id: 'item-bat-1',
      name: 'Plasma Battery',
      itemType: 'BATTERY',
      x: 19,
      y: 3,
      description: 'Super-capacitance plasma power cell. Restores +50 EN.',
      amount: 1,
      iconColor: '#00f0ff',
    },
    {
      id: 'item-emp-1',
      name: 'EMP Disruptor',
      itemType: 'EMP_GRENADE',
      x: 23,
      y: 11,
      description: 'Electro-magnetic disruptor grenade. Stuns all robots in radius 4 for 4 turns.',
      amount: 1,
      iconColor: '#c77dff',
    },
    {
      id: 'item-med-2',
      name: 'Nanite Medkit',
      itemType: 'MEDKIT',
      x: 28,
      y: 4,
      description: 'Emergency trauma pack left behind by Tzorg patrol.',
      amount: 1,
      iconColor: '#00ff88',
    },
    {
      id: 'item-key-1',
      name: 'Security Pass',
      itemType: 'KEYCARD',
      x: 15,
      y: 11,
      description: 'Decrypted security clearance token for Tzorg terminal override.',
      amount: 1,
      iconColor: '#ffea00',
    },
    {
      id: 'slate-item-vance',
      name: 'Data Slate 01',
      itemType: 'DATA_SLATE',
      x: 5,
      y: 3,
      description: 'Encrypted memory disc: Dr. Vance\'s remorse regarding the Neural Collar.',
      iconColor: '#00e5ff',
      storyLogId: 'slate-vance',
    },
    {
      id: 'slate-item-kira',
      name: 'Data Slate 02',
      itemType: 'DATA_SLATE',
      x: 4,
      y: 7,
      description: 'Resistance dispatch: The Fall of Sector 2 & Operation Prometheus.',
      iconColor: '#ff7700',
      storyLogId: 'slate-kira',
    },
    {
      id: 'slate-item-tzorg',
      name: 'Data Slate 03',
      itemType: 'DATA_SLATE',
      x: 21,
      y: 8,
      description: 'Tzorg Syndicate security directive concerning rogue Subject Raven.',
      iconColor: '#ff2a4b',
      storyLogId: 'slate-tzorg',
    },
    {
      id: 'slate-item-ghost',
      name: 'Data Slate 04',
      itemType: 'DATA_SLATE',
      x: 17,
      y: 4,
      description: 'Intercepted quantum transmission: Awakening the Five Million.',
      iconColor: '#9d4edd',
      storyLogId: 'slate-ghost',
    },
    {
      id: 'item-omni-visor',
      name: '全知超感光子透鏡',
      itemType: 'KEYCARD',
      x: 5,
      y: 23,
      description: '全知超感光子透鏡：啟動全視域掃描，偵測全地圖單位。',
      amount: 1,
      iconColor: '#00f0ff',
    },
    {
      id: 'item-full-map-uplink',
      name: '全域軌道測繪晶片',
      itemType: 'KEYCARD',
      x: 6,
      y: 23,
      description: '全域軌道測繪晶片：啟動全地圖探索視圖。',
      amount: 1,
      iconColor: '#ffea00',
    },
    {
      id: 'item-blackmarket-tactical',
      name: '黑市特工戰術寶箱',
      itemType: 'CREDIT_CHIP',
      x: 16,
      y: 15,
      description: '黑市特工戰術寶箱：+200 CR / 治療 40 HP',
      amount: 200,
      iconColor: '#ffea00',
    },
  ];
}

export function createSector2Items(): GroundItem[] {
  return [
    {
      id: 'sec2-med-1',
      name: 'Nanite Medkit',
      itemType: 'MEDKIT',
      x: 8,
      y: 5,
      description: 'Military-grade nanite injector. Restores +40 HP.',
      amount: 1,
      iconColor: '#00ff88',
    },
    {
      id: 'sec2-bat-1',
      name: 'Plasma Battery',
      itemType: 'BATTERY',
      x: 16,
      y: 7,
      description: 'Super-capacitance plasma power cell. Restores +50 EN.',
      amount: 1,
      iconColor: '#00f0ff',
    },
    {
      id: 'sec2-emp-1',
      name: 'EMP Disruptor',
      itemType: 'EMP_GRENADE',
      x: 25,
      y: 20,
      description: 'Electro-magnetic disruptor grenade. Stuns all robots in radius 4 for 4 turns.',
      amount: 1,
      iconColor: '#c77dff',
    },
    {
      id: 'item-tzorg-plasma-capacitor',
      name: '佐格原型等離子電容',
      itemType: 'BATTERY',
      x: 29,
      y: 5,
      description: '佐格原型等離子電容：+60 EN',
      amount: 1,
      iconColor: '#00f0ff',
    },
    {
      id: 'item-chromatic-aerosol',
      name: '超光譜量子色劑',
      itemType: 'KEYCARD',
      x: 23,
      y: 5,
      description: '超光譜量子色劑：Vesper 的塗鴉創作材料。',
      amount: 1,
      iconColor: '#ff00ff',
    },
  ];
}

export function createSectorObjectives(): MissionObjective[] {
  return [
    {
      id: 'obj-safehouse',
      title: 'Safehouse Recon & Gear',
      titleZh: '安全屋偵察與整裝',
      description: 'Converse with Commander Kira and Doc Vance in Sector 1 Safehouse.',
      descriptionZh: '在第一區安全屋與反抗軍指揮官席拉 (Kira) 及凡斯博士 (Doc Vance) 交談。',
      completed: false,
    },
    {
      id: 'obj-scavenge',
      title: 'Tactical Stockpile',
      titleZh: '搜集戰術物資',
      description: 'Scavenge field supplies (Nanite Medkit, Battery, or EMP Grenade).',
      descriptionZh: '搜刮野外補給物資（奈米急救包、電漿電池或 EMP 脈衝手榴彈）。',
      completed: false,
    },
    {
      id: 'obj-forcefield',
      title: 'Deactivate Checkpoint 01',
      titleZh: '解除 01 號檢查哨能量屏障',
      description: 'Access terminal CHECKPOINT_FF to lower the high-energy plasma barrier.',
      descriptionZh: '操作終端機 CHECKPOINT_FF 解除高能電漿力場屏障。',
      completed: false,
    },
    {
      id: 'obj-vault',
      title: 'Infiltrate Central Data Core',
      titleZh: '潛入中央數據核心',
      description: 'Bypass Hunter-Killer defense grid and reach Sector 1 Extraction Nexus.',
      descriptionZh: '繞過獵殺者防禦網，抵達第一區撤離中繼點。',
      completed: false,
    },
    {
      id: 'obj-superweapon',
      title: 'Project Singularity: Quantum Annihilator',
      titleZh: '奇點計畫：量子殲滅砲',
      description: 'Collect Quantum Core from Sylvia and Matrix Chip from Sewers, then forge weapon with Zero-One in Sector 2.',
      descriptionZh: '向希維亞取得量子核心並在下水道找到矩陣晶片，交由第二區的零壹 (Zero-One) 鍛造終極神兵。',
      completed: false,
    },
  ];
}

export function createSectorHazards(): Hazard[] {
  return [
    { id: 'hazard-plasma-1', x: 19, y: 8, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-plasma-2', x: 26, y: 7, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-plasma-3', x: 33, y: 19, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
    { id: 'hazard-plasma-4', x: 14, y: 13, type: 'PLASMA_CANISTER', hp: 1, exploded: false },
  ];
}

export function createSectorPushableBlocks(sectorId?: string): PushableBlock[] {
  const id = sectorId || undefined || 'sector-1';
  if (id === 'sector-1') {
    return [
      {
        id: 'crate-detention-grate',
        x: 36,
        y: 4,
        initialX: 36,
        initialY: 4,
        sectorId: 'sector-1',
        name: 'Loose Ventilation Metal Grate',
        nameZh: '鬆動的通風金屬柵板',
        blockType: 'crate',
        secretDoor: { x: 36, y: 3, revealedTile: 4 },
        revealed: false,
      },
      {
        id: 'crate-sec1-secret',
        x: 16,
        y: 18,
        initialX: 16,
        initialY: 18,
        sectorId: 'sector-1',
        name: 'Disguised Armor Wall Panel',
        nameZh: '偽裝滑動裝甲牆',
        blockType: 'disguised_wall',
        secretDoor: { x: 16, y: 17, revealedTile: 4 },
        revealed: false,
      },
      {
        id: 'crate-sec1-alley',
        x: 20,
        y: 15,
        initialX: 20,
        initialY: 15,
        sectorId: 'sector-1',
        name: 'Reinforced Cargo Crate',
        nameZh: '加固物流重裝箱',
        blockType: 'crate',
        revealed: false,
        secretSurprise: {
          type: 'credits',
          amount: 150,
          messageZh: '【發現隱密補給】移開重裝箱後，在箱底夾層發現了 150 信用點！',
          messageEn: '[SUPPLY CACHE] Pushed cargo crate to uncover 150 Credits in a secret compartment!',
        },
      },
      {
        id: 'crate-sec1-rack',
        x: 33,
        y: 23,
        initialX: 33,
        initialY: 23,
        sectorId: 'sector-1',
        name: 'Data Relay Server Rack',
        nameZh: '數據中繼伺服器機櫃',
        blockType: 'server_rack',
        revealed: false,
        secretSurprise: {
          type: 'energy',
          amount: 60,
          messageZh: '【發現後備電源】移開伺服器機櫃後，成功接入備用能源電池 (+60 EN)！',
          messageEn: '[BACKUP POWER] Tapped into backup power cells behind the server rack (+60 EN)!',
        },
      },
    ];
  }
  if (id === 'sector-2') {
    return [
      {
        id: 'crate-sec2-secret',
        x: 26,
        y: 5,
        initialX: 26,
        initialY: 5,
        sectorId: 'sector-2',
        name: 'Movable Industrial Wall Section',
        nameZh: '偽裝冷卻重裝牆',
        blockType: 'disguised_wall',
        secretDoor: { x: 27, y: 5, revealedTile: 4 },
        revealed: false,
      },
      {
        id: 'crate-sec2-rack',
        x: 18,
        y: 16,
        initialX: 18,
        initialY: 16,
        sectorId: 'sector-2',
        name: 'Overmind Sub-Core Server Rack',
        nameZh: '主腦子核心伺服機櫃',
        blockType: 'server_rack',
        revealed: false,
        secretSurprise: {
          type: 'item',
          item: {
            id: 'item-emp-disruptor-cache',
            name: 'EMP Disruptor',
            itemType: 'EMP_GRENADE',
            description: '高能量 EMP 干擾器',
            iconColor: '#00f0ff',
          } as unknown as GroundItem,
        },
      },
      {
        id: 'crate-sec2-crate',
        x: 16,
        y: 18,
        initialX: 16,
        initialY: 18,
        sectorId: 'sector-2',
        name: 'Heavy Fabrication Container',
        nameZh: '重型機件製造貨櫃',
        blockType: 'crate',
        revealed: false,
        secretSurprise: {
          type: 'credits',
          amount: 200,
          messageZh: '【發現走私晶片】推開製造貨櫃後，搜刮出價值 200 信用點的黑市物資！',
          messageEn: '[BLACK MARKET CACHE] Recovered 200 Credits worth of components!',
        },
      },
    ];
  }
  if (id === 'sub-sector-0') {
    return [
      {
        id: 'crate-sewer-secret',
        x: 29,
        y: 5,
        initialX: 29,
        initialY: 5,
        sectorId: 'sub-sector-0',
        name: 'Loose Drainage Brick Wall',
        nameZh: '鬆動的下水道石砌牆',
        blockType: 'disguised_wall',
        secretDoor: { x: 30, y: 5, revealedTile: 4 },
        revealed: false,
      },
      {
        id: 'crate-sewer-crate',
        x: 10,
        y: 10,
        initialX: 10,
        initialY: 10,
        sectorId: 'sub-sector-0',
        name: 'Reinforced Drainage Cargo Crate',
        nameZh: '加固下水道儲運箱',
        blockType: 'crate',
        revealed: false,
        secretSurprise: {
          type: 'item',
          item: {
            id: 'item-nanite-medkit-cache',
            name: 'Nanite Medkit',
            itemType: 'MEDKIT',
            description: '軍用奈米急救包',
            iconColor: '#00ff88',
          } as unknown as GroundItem,
        },
      },
    ];
  }
  if (id === 'sector-citadel') {
    return [
      {
        id: 'crate-citadel-rack',
        x: 12,
        y: 15,
        initialX: 12,
        initialY: 15,
        sectorId: 'sector-citadel',
        name: 'Citadel Mainframe Buffer Unit',
        nameZh: '堡壘主機緩衝機櫃',
        blockType: 'server_rack',
        revealed: false,
        secretSurprise: {
          type: 'energy',
          amount: 80,
          messageZh: '【戰術能量補給】抽取了 80 點高純度超導能量！',
          messageEn: '[TACTICAL RECHARGE] Siphoned 80 energy units from the mainframe buffer!',
        },
      },
    ];
  }
  return [];
}

