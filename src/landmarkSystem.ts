import type { SectorMap, PushableBlock } from './types';
import { getTile } from './map';

// ---------------------------------------------------------------------------
// 1. getLandmarkKey
// ---------------------------------------------------------------------------

export function getLandmarkKey(sectorId: string, px: number, py: number): string {
  if (sectorId === 'sector-1') {
    if (px >= 3 && px <= 8 && py >= 3 && py <= 8) return 'safehouse';
    if (px >= 18 && px <= 22 && py >= 10 && py <= 14) return 'cyber-park';
    if (px >= 26 && px <= 30 && py >= 4 && py <= 8) return 'checkpoint';
    if (px >= 34 && px <= 38 && py >= 23 && py <= 27) return 'elevator';
  } else if (sectorId === 'sector-2') {
    if (px >= 2 && px <= 6 && py >= 3 && py <= 7) return 'fab-entrance';
    if (px >= 28 && px <= 36 && py >= 16 && py <= 24) return 'overmind-core';
  } else if (sectorId === 'sub-sector-0') {
    if (px >= 2 && px <= 6 && py >= 3 && py <= 7) return 'sewer-entrance';
    if (px >= 30 && px <= 36 && py >= 20 && py <= 26) return 'sewer-exit';
  }
  return 'none';
}

// ---------------------------------------------------------------------------
// 2. LANDMARK_OBSERVATIONS
// ---------------------------------------------------------------------------

export interface LandmarkObservation {
  en: string;
  zh: string;
}

export const LANDMARK_OBSERVATIONS: Record<string, LandmarkObservation> = {
  safehouse: {
    en: 'Rebel Safehouse: Hand-drawn maps and tactical markers cover the walls. The air smells of coffee and machine oil.',
    zh: '反抗軍安全屋：牆壁上貼滿手繪地圖與戰術標記。空氣中瀰漫著咖啡與機油混合的氣味。',
  },
  'cyber-park': {
    en: 'Cyber Park: Holographic ads flicker through the mist, bionic flowers bloom under artificial sun. Everything looks so perfect, so false.',
    zh: '賽博公園：全息廣告在霧氣中閃爍，仿生花朵在人工陽光下綻放。一切看起來如此完美，如此虛假。',
  },
  checkpoint: {
    en: 'Checkpoint: Tzorg patrols stand guard ahead. Searchlights sweep the streets, each beam carrying the weight of intent.',
    zh: '檢查站：佐格巡邏隊在前方警戒。探照燈掃過街道，每一道光都帶著殺意。',
  },
  elevator: {
    en: 'Elevator: The metal doors hum softly, awaiting your command. The passage to the Fab-Plex lies before you.',
    zh: '升降機：金屬門微微震動，等待著你的指令。通往製造複合體的通道就在眼前。',
  },
  'fab-entrance': {
    en: 'Fab-Plex Entrance: The rhythmic motion of mechanical arms forms a hypnotic melody in the distance. The air reeks of welding and metal.',
    zh: '製造複合體入口：機械臂的節奏性運動在遠處形成一種催眠的旋律。空氣中瀰漫著焊接與金屬的氣味。',
  },
  'overmind-core': {
    en: "Central Overmind Core: The massive quantum processor pulses in the darkness, blue light beating in a steady rhythm. This is Tzorg's control nexus.",
    zh: '中央超心智核心：巨大的量子處理器在黑暗中脈動，藍色的光線如心跳般規律。這裡是佐格的控制中樞。',
  },
  'sewer-entrance': {
    en: 'Sewer Entrance: Corrosive liquid trickles at your feet, hissing softly. The darkness ahead opens its arms.',
    zh: '下水道入口：腐蝕性液體在腳下潺潺流動，發出微弱的嘶嘶聲。黑暗在前方張開雙臂。',
  },
  'sewer-exit': {
    en: 'Sewer Exit: Fresh air rushes in from the distance, carrying a hint of freedom. The exit lies ahead.',
    zh: '下水道出口：新鮮的空氣從遠處湧來，帶著一絲自由的味道。出口就在前方。',
  },
  conveyor: {
    en: 'Gear teeth mesh with a low hum. The metal surface vibrates beneath your boots as the belt carries you forward.',
    zh: '履帶齒輪咬合，金屬表面微微振動。你被機械之手輕輕推向下一站。',
  },
  'plasma-barrier': {
    en: 'The high-energy plasma barrier pulses ahead, blue-white arcs crackling through the air. The ozone stings your nostrils.',
    zh: '高能量電漿屏障在前方脈動，藍白色的弧光在空氣中嘶嘶作響。空氣中瀰漫著臭氧的刺鼻氣味。',
  },
  'bionic-canopy': {
    en: 'Glowing bionic vines drape from the ceiling, secreting faint acidic spores. A mild sting prickles your skin.',
    zh: '發光的仿生藤蔓從天花板垂下，分泌著微弱的酸性孢子。你的皮膚感到一陣輕微的刺痛。',
  },
};

// ---------------------------------------------------------------------------
// 3. checkEnvironmentalLandmarks
// ---------------------------------------------------------------------------

export interface EnvironmentalLandmarkResult {
  key: string;
  message?: string;
  floatingText?: { text: string; color: string };
}

export function checkEnvironmentalLandmarks(
  sectorId: string,
  px: number,
  py: number,
  isZh: boolean,
  isConveyor: boolean,
): EnvironmentalLandmarkResult | null {
  // Conveyor belt observation
  if (isConveyor) {
    return {
      key: 'conveyor',
      message: isZh
        ? '履帶齒輪咬合，金屬表面微微振動。你被機械之手輕輕推向下一站。'
        : 'Gear teeth mesh with a low hum. The metal surface vibrates beneath your boots as the belt carries you forward.',
      floatingText: {
        text: isZh ? '⚙ 輸送帶啟動 ⚙' : '⚙ CONVEYOR ACTIVE ⚙',
        color: '#00f0ff',
      },
    };
  }

  // Plasma barrier proximity
  if (sectorId === 'sector-1' && px >= 24 && px <= 28 && py >= 5 && py <= 9) {
    return {
      key: 'plasma-barrier',
      message: isZh
        ? '高能量電漿屏障在前方脈動，藍白色的弧光在空氣中嘶嘶作響。空氣中瀰漫著臭氧的刺鼻氣味。'
        : 'The high-energy plasma barrier pulses ahead, blue-white arcs crackling through the air. The ozone stings your nostrils.',
      floatingText: {
        text: isZh ? '⚡ 電漿屏障 ⚡' : '⚡ PLASMA BARRIER ⚡',
        color: '#ff2a4b',
      },
    };
  }

  // Bionic canopy proximity (sewer sector)
  if (sectorId === 'sub-sector-0' && px >= 10 && px <= 30 && py >= 8 && py <= 18) {
    return {
      key: 'bionic-canopy',
      message: isZh
        ? '發光的仿生藤蔓從天花板垂下，分泌著微弱的酸性孢子。你的皮膚感到一陣輕微的刺痛。'
        : 'Glowing bionic vines drape from the ceiling, secreting faint acidic spores. A mild sting prickles your skin.',
      floatingText: {
        text: isZh ? '🌿 仿生生態林冠 🌿' : '🌿 BIONIC CANOPY 🌿',
        color: '#00ff88',
      },
    };
  }

  // Landmark entry observation
  const landmark = getLandmarkKey(sectorId, px, py);
  if (landmark !== 'none') {
    const obs = LANDMARK_OBSERVATIONS[landmark];
    if (obs) {
      return {
        key: landmark,
        message: isZh ? obs.zh : obs.en,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// 4. checkAdjacentPassageHints
// ---------------------------------------------------------------------------

export interface AdjacentPassageHint {
  playerKey: string;
  message: string;
}

export function checkAdjacentPassageHints(
  map: SectorMap,
  px: number,
  py: number,
  facing: string,
  pushableBlocks: PushableBlock[],
  isZh: boolean,
): AdjacentPassageHint | null {
  // Directions in priority order: facing direction first, then the rest
  const allDirs: Array<{ dx: number; dy: number; label: string; labelEn: string }> = [
    { dx: 0, dy: -1, label: '上方', labelEn: 'above' },
    { dx: 0, dy: 1, label: '下方', labelEn: 'below' },
    { dx: -1, dy: 0, label: '左方', labelEn: 'to the left' },
    { dx: 1, dy: 0, label: '右方', labelEn: 'to the right' },
  ];
  const facingDir =
    facing === 'up' ? 0 : facing === 'down' ? 1 : facing === 'left' ? 2 : 3;
  const ordered = [allDirs[facingDir], ...allDirs.filter((_, i) => i !== facingDir)];

  let foundKey = '';
  let foundMsg = '';

  for (const dir of ordered) {
    const nx = px + dir.dx;
    const ny = py + dir.dy;
    const tile = getTile(map, { x: nx, y: ny });
    let kind: string | null = null;
    if (tile !== undefined) {
      const num = Number(tile);
      if (num === 3) kind = 'door_closed';
      else if (num === 4) kind = 'door_open';
      else if (num === 9) kind = 'elevator';
    }
    if (!kind) {
      const block = pushableBlocks.find((b) => b.x === nx && b.y === ny && b.secretDoor);
      if (block) kind = 'secret_door';
    }
    if (kind) {
      foundKey = `${kind}-${nx},${ny}`;
      if (kind === 'door_closed') {
        foundMsg = isZh
          ? `${dir.label}似乎有一扇門。`
          : `There seems to be a door ${dir.labelEn}.`;
      } else if (kind === 'door_open') {
        foundMsg = isZh
          ? `${dir.label}有一扇敞開的門。`
          : `There is an open door ${dir.labelEn}.`;
      } else if (kind === 'elevator') {
        foundMsg = isZh
          ? `${dir.label}似乎有一處升降機通道。`
          : `There seems to be an elevator passage ${dir.labelEn}.`;
      } else {
        foundMsg = isZh
          ? `${dir.label}似乎有一處隱密通道。`
          : `There seems to be a hidden passage ${dir.labelEn}.`;
      }
      break;
    }
  }

  if (foundKey) {
    const playerKey = `${foundKey}-${px},${py}`;
    return { playerKey, message: foundMsg };
  }

  return null;
}
