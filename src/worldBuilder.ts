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
      author: 'Tzorg Syndicate',
      timestamp: '2400-03-15T08:00:00Z',
      read: false,
      content: ['CLASSIFIED: Subject Raven has breached perimeter. All units engage on sight. Deploy Hunter-Killers to Central Data Core. The Five Million must remain dormant. Failure to comply will result in neural termination.'],
    });
  }

  if (!existingIds.has('slate-ghost')) {
    extraLogs.push({
      id: 'slate-ghost',
      title: 'Awakening the Five Million',
      author: 'Ghost',
      timestamp: '2400-03-14T22:30:00Z',
      read: false,
      content: ['Intercepted quantum transmission: The neural collars can be reversed. If the Central Overmind core is breached, the signal can be broadcast to all five million subjects. Freedom is not a privilege. It is a right. — Ghost'],
    });
  }

  if (!existingIds.has('slate-checkpoint-relay')) {
    extraLogs.push({
      id: 'slate-checkpoint-relay',
      title: 'Citadel Transport Windows',
      titleZh: '堡壘運輸窗口',
      author: 'Checkpoint Relay Annex',
      timestamp: '2400-03-15T02:00:00Z',
      read: false,
      content: [
        'Intercepted Citadel uplink relay log: Transport windows open every 125 steps. During each window, the neural collar broadcast can be reversed for all subjects in the sector. The relay annex is sealed behind the checkpoint forcefield. Unauthorized access will trigger immediate lockdown.',
      ],
      contentZh: [
        '截獲堡壘上行鏈路中繼日誌：運輸窗口每 125 步開啟一次。在每個窗口期間，可逆轉該區域所有受試者的神經項圈廣播。中繼附屬區被封閉在檢查哨力場後方。未經授權進入將立即觸發封鎖。',
      ],
    });
  }

  if (!existingIds.has('slate-underground-manifest')) {
    extraLogs.push({
      id: 'slate-underground-manifest',
      title: 'Underground Logistics Manifest',
      titleZh: '地下物流清單',
      author: 'Checkpoint Relay Annex',
      timestamp: '2400-03-15T04:30:00Z',
      read: false,
      content: [
        'Subterranean supply route manifest: The Citadel maintains hidden transport corridors beneath the relay annex. Each corridor is gated by a pressure-locked bulkhead and monitored by autonomous patrol drones. Securing these routes will allow the resistance to intercept collar broadcast reversals before they reach the Five Million.',
      ],
      contentZh: [
        '地下補給路線清單：堡壘在中繼附屬區下方維持隱密運輸通道。每條通道由壓力密封艙門把守，並由自動巡邏無人機監控。確保這些路線將使反抗軍得以在神經項圈廣播逆轉抵達五百萬受試者之前進行攔截。',
      ],
    });
  }

  if (!existingIds.has('slate-crashed-transport')) {
    extraLogs.push({
      id: 'slate-crashed-transport',
      title: 'Crashed Transport Log',
      titleZh: '失事運輸艇維修日誌',
      author: 'Sub-Sector 0 Maintenance',
      timestamp: '2400-03-15T05:00:00Z',
      read: false,
      content: [
        'Maintenance Log: Sub-Sector 0 freight transport crashed into drainage gate. The impact locked down the Sector 2 manufacturing plant access conduit. Authorization requires overriding the sewer pump terminal or retrieving the emergency maintenance bypass slate.',
      ],
      contentZh: [
        '維護日誌：Sub-Sector 0 貨運艇撞毀於排水閘門。衝擊導致通往第二區製造廠的管道全面封鎖。需透過排污主控終端機覆寫或取回緊急維護備用憑證以取得授權。',
      ],
    });
  }

  if (!existingIds.has('slate-maintenance-override')) {
    extraLogs.push({
      id: 'slate-maintenance-override',
      title: 'Maintenance Bypass Credential',
      titleZh: '維護備用憑證',
      author: 'Sub-Sector 0 Maintenance',
      timestamp: '2400-03-15T05:30:00Z',
      read: false,
      content: [
        'Citadel Engineering Override: Emergency maintenance credential. Grants direct clearance to bypass the sewer barrier and access Sector 2 Manufacturing Plant.',
      ],
      contentZh: [
        '堡壘工程覆寫授權：緊急維護憑證。授權直接通過下水道屏障並進入第二區製造廠。',
      ],
    });
  }

  if (!existingIds.has('slate-factory-worker')) {
    extraLogs.push({
      id: 'slate-factory-worker',
      title: 'Factory Worker Testimony',
      titleZh: '工廠工人證詞',
      author: 'Anonymous Sector 2 Worker',
      timestamp: '2400-03-15T06:00:00Z',
      read: false,
      content: [
        'I\'ve been on the assembly line for three years. Every 125 steps, the neural collar firmware syncs with the Overmind sub-core. The synchronization cycle is controlled by TERMINAL_SYNCHRONIZER in the central assembly hall. If you can disrupt that terminal during the sync window, the broadcast reverses for all subjects in the sector.',
      ],
      contentZh: [
        '我在裝配線工作了三年。每 125 步，神經項圈韌體就會與主腦副核心同步。同步週期由中央裝配大廳的 TERMINAL_SYNCHRONIZER 控制。如果你能在同步窗口期間破壞該終端機，廣播將對該區域所有受試者逆轉。',
      ],
    });
  }

  if (!existingIds.has('slate-rebel-payload')) {
    extraLogs.push({
      id: 'slate-rebel-payload',
      title: 'Rebel Interference Payload',
      titleZh: '反抗軍干擾載荷',
      author: 'Ghost',
      timestamp: '2400-03-15T06:30:00Z',
      read: false,
      content: [
        'Interference payload compiled. Inject this reversal code into TERMINAL_SYNCHRONIZER during the sync pulse. The payload overwrites the collar broadcast firmware and reverses the neural lock for all Five Million subjects. Execute within 3 turns of the sync pulse.',
      ],
      contentZh: [
        '干擾載荷編譯完成。在同步脈衝期間將此逆轉代碼注入 TERMINAL_SYNCHRONIZER。載荷將覆寫項圈廣播韌體，逆轉所有五百萬受試者的神經鎖定。在同步脈衝後 3 回合內執行。',
      ],
    });
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
    {
      id: 'item-forged-checkin-credential',
      name: 'Forged Check-in Credential',
      itemType: 'KEYCARD',
      x: 29,
      y: 7,
      description: 'Forged neural collar check-in credential granting a 125-step check-in window at the Checkpoint Relay Annex terminal.',
      amount: 1,
      iconColor: '#ffea00',
    },
    {
      id: 'slate-item-checkpoint-relay',
      name: 'Data Slate 05',
      itemType: 'DATA_SLATE',
      x: 30,
      y: 5,
      description: 'Intercepted Citadel transport window schedule and collar broadcast reversal protocol.',
      iconColor: '#00e5ff',
      storyLogId: 'slate-checkpoint-relay',
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
    {
      id: 'slate-item-factory-worker',
      name: 'Data Slate 06',
      itemType: 'DATA_SLATE',
      x: 19,
      y: 5,
      description: 'Factory worker testimony: synchronizer cycle and reversal window.',
      iconColor: '#ff7700',
      storyLogId: 'slate-factory-worker',
    },
    {
      id: 'slate-item-rebel-payload',
      name: 'Data Slate 07',
      itemType: 'DATA_SLATE',
      x: 20,
      y: 5,
      description: 'Rebel interference payload for TERMINAL_SYNCHRONIZER.',
      iconColor: '#9d4edd',
      storyLogId: 'slate-rebel-payload',
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
      isSideQuest: false,
      discovered: true,
    },
    {
      id: 'obj-scavenge',
      title: 'Tactical Stockpile',
      titleZh: '搜集戰術物資',
      description: 'Scavenge field supplies (Nanite Medkit, Battery, or EMP Grenade).',
      descriptionZh: '搜刮野外補給物資（奈米急救包、電漿電池或 EMP 脈衝手榴彈）。',
      completed: false,
      isSideQuest: false,
      discovered: true,
    },
    {
      id: 'obj-forcefield',
      title: 'Deactivate Checkpoint 01',
      titleZh: '解除 01 號檢查哨能量屏障',
      description: 'Access terminal CHECKPOINT_FF to lower the high-energy plasma barrier and open the sealed relay annex.',
      descriptionZh: '操作終端機 CHECKPOINT_FF 解除高能電漿力場屏障，開啟封閉的中繼附屬區。',
      completed: false,
      isSideQuest: false,
      discovered: true,
    },
    {
      id: 'obj-checkpoint-relay',
      title: 'Infiltrate Checkpoint Relay Annex',
      titleZh: '滲透檢查哨中繼附屬區',
      description: 'Enter the sealed relay annex behind the checkpoint forcefield and locate the Citadel uplink relay node.',
      descriptionZh: '進入檢查哨力場後方封閉的中繼附屬區，尋找堡壘上行鏈路中繼節點。',
      completed: false,
      isSideQuest: false,
      discovered: false,
    },
    {
      id: 'obj-underground-logistics',
      title: 'Underground Logistics',
      titleZh: '地下物流',
      description: 'Trace the subterranean supply routes to secure the Citadel\'s hidden transport corridors.',
      descriptionZh: '追蹤地下補給路線，確保堡壘的隱密運輸通道。',
      completed: false,
      isSideQuest: false,
      discovered: false,
    },
    {
      id: 'obj-vault',
      title: 'Infiltrate Central Data Core',
      titleZh: '潛入中央數據核心',
      description: 'Bypass Hunter-Killer defense grid and reach Sector 1 Extraction Nexus.',
      descriptionZh: '繞過獵殺者防禦網，抵達第一區撤離中繼點。',
      completed: false,
      isSideQuest: false,
      discovered: true,
    },
    {
      id: 'obj-superweapon',
      title: 'Project Singularity: Quantum Annihilator',
      titleZh: '奇點計畫：量子殲滅砲',
      description: 'Collect Quantum Core from Sylvia and Matrix Chip from Sewers, then forge weapon with Zero-One in Sector 2.',
      descriptionZh: '向希維亞取得量子核心並在下水道找到矩陣晶片，交由第二區的零壹 (Zero-One) 鍛造終極神兵。',
      completed: false,
      isSideQuest: false,
      discovered: true,
    },
    {
      id: 'side-hiro',
      title: "Hiro's Secret Recipe",
      titleZh: '拉麵大師：失傳的秘傳食譜',
      description: 'Find the lost Ramen Recipe in the sewers and return it to Hiro in Sector 1.',
      descriptionZh: '在下水道深處找回失傳的家傳拉麵食譜，送回給第一區的拉麵店主 Hiro。',
      completed: false,
      isSideQuest: true,
      discovered: false,
    },
    {
      id: 'side-elena',
      title: "Elena's Analog Synth-Tape",
      titleZh: '霓虹之聲：類比合成波母帶',
      description: 'Locate the 1984 Analog Master Tape in the sewers and bring it to Elena in Sector 1.',
      descriptionZh: '在下水道找回失落的 1984 類比合成波母帶，交給第一區的音樂人 Elena。',
      completed: false,
      isSideQuest: true,
      discovered: false,
    },
    {
      id: 'side-vesper',
      title: "Vesper's Chromatic Rebellion",
      titleZh: '反叛色彩：超光譜量子色劑',
      description: 'Retrieve the Chromatic Aerosol from Sector 2 Fab-Plex and deliver it to street artist Vesper in Sector 1.',
      descriptionZh: '從第二區製造複合體取得超光譜量子色劑，交給第一區的街頭藝術家 Vesper 完成自由壁畫。',
      completed: false,
      isSideQuest: true,
      discovered: false,
    },
    {
      id: 'side-archie',
      title: "Archie's Lost Poetry Folio",
      titleZh: '失落詩篇：未焚毀的古籍殘頁',
      description: 'Salvage the Unburnt Poetry Folio from Sub-Sector Zero and bring it to Archie in Sector 1.',
      descriptionZh: '從零號次分區下水道打撈未焚毀的古籍殘頁，交給第一區的學者 Archie 延長項圈時間。',
      completed: false,
      isSideQuest: true,
      discovered: false,
    },
    {
      id: 'obj-maintenance-clearance',
      title: 'Maintenance Clearance',
      titleZh: '維修許可',
      description: 'Obtain maintenance clearance to access restricted areas.',
      descriptionZh: '取得維修許可以進入限制區域。',
      completed: false,
      isSideQuest: false,
      discovered: false,
    },
    {
      id: 'obj-disrupt-synchronizer',
      title: 'Disrupt Factory Synchronizer',
      titleZh: '破壞製造廠同步器',
      description: 'Infiltrate Sector 2 Manufacturing Plant and disrupt the sub-core synchronizer.',
      descriptionZh: '潛入第二區製造廠並破壞副核心同步器。',
      completed: false,
      isSideQuest: false,
      discovered: false,
    },
    {
      id: 'obj-reversal-keys',
      title: 'Acquire Overmind Reversal Keys',
      titleZh: '取得主腦逆轉金鑰',
      description: 'Obtain the Overmind reversal keys to permanently disable the neural collar broadcast.',
      descriptionZh: '取得主腦逆轉金鑰，以永久停用神經項圈廣播。',
      completed: false,
      isSideQuest: false,
      discovered: false,
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
  const id = sectorId || 'sector-1';
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

