import type { SectorMap, Player, Robot, NPC, GroundItem, Language } from './types';
import { drawGlobalAllSectorsMap } from './globalAtlas';
import { buildSector1Map, buildSector2Map } from './map';
import { buildSubSectorZeroMap } from './sewerMap';
import { buildCitadelMap } from './citadelMap';

function normalizeTileKind(tile: any): string {
  if (typeof tile === 'string') return tile.toUpperCase();
  if (typeof tile === 'number') {
    switch (tile) {
      case 2: return 'WALL';
      case 3: return 'DOOR_CLOSED';
      case 4: return 'DOOR_OPEN';
      case 5: return 'FORCEFIELD';
      case 6: return 'TERMINAL';
      case 9: return 'ELEVATOR';
      case 10: return 'CONVEYOR';
      case 12: return 'BIO_TREE';
      case 13: return 'PARK_WATER';
      case 15: return 'SERVER_RACK';
      default: return 'FLOOR';
    }
  }
  return 'FLOOR';
}

/**
 * Tactical Big Map Modal (全螢幕戰術大地圖)
 * Provides comprehensive sector satellite cartography, district POIs, entity scanning, and exploration intel.
 */
export function drawBigMapModal(
  width: number,
  height: number,
  map: SectorMap,
  player: Player,
  robots: Robot[],
  npcs: NPC[] | undefined,
  groundItems: GroundItem[] | undefined,
  visible: Set<string>,
  explored: Set<string>,
  ctx: any,
  now: number,
  isFullMap: boolean,
  language: Language,
  selectedSector: string = 'current'
): void {
  ctx.save?.();
  const isZh = language === 'zh';
  const fontStack = '"Noto Sans TC", "Microsoft JhengHei", monospace';

  const activeMap: SectorMap =
    selectedSector === 'sector-1' ? (buildSector1Map() as SectorMap) :
    selectedSector === 'sector-2' ? (buildSector2Map() as SectorMap) :
    selectedSector === 'sub-sector-0' ? (buildSubSectorZeroMap() as SectorMap) :
    selectedSector === 'sector-citadel' ? (buildCitadelMap() as SectorMap) :
    map;

  // 1. 大地圖外框尺寸
  const boxW = Math.min(width - 32, 880);
  const boxH = Math.min(height - 40, 540);
  const x = (width - boxW) / 2;
  const y = (height - boxH) / 2;

  // 半透明深色賽博終端基底
  ctx.fillStyle = 'rgba(2, 7, 14, 0.96)';
  ctx.fillRect?.(x, y, boxW, boxH);

  // 霓虹賽博外框
  ctx.strokeStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;
  ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);
  ctx.shadowBlur = 0;

  // 四個科技裝飾角標
  const cornerSize = 10;
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect?.(x, y, cornerSize, 3);
  ctx.fillRect?.(x, y, 3, cornerSize);
  ctx.fillRect?.(x + boxW - cornerSize, y, cornerSize, 3);
  ctx.fillRect?.(x + boxW - 3, y, 3, cornerSize);
  ctx.fillRect?.(x, y + boxH - 3, cornerSize, 3);
  ctx.fillRect?.(x, y + boxH - cornerSize, 3, cornerSize);
  ctx.fillRect?.(x + boxW - cornerSize, y + boxH - 3, cornerSize, 3);
  ctx.fillRect?.(x + boxW - 3, y + boxH - cornerSize, 3, cornerSize);

  // 2. 頂部標題與分區資訊
  const currentSectorId =
    selectedSector === 'all'
      ? 'all'
      : selectedSector !== 'current'
        ? selectedSector
        : ((player as any).currentSectorId || 'sector-1');
  let sectorTitleZh = '第 01 分區 // 佐格都市街道與反抗軍暗巷';
  let sectorTitleEn = 'SECTOR 01 // METROPOLIS STREETS & REBEL ALLEY';
  if (currentSectorId === 'sector-2') {
    sectorTitleZh = '第 02 分區 // 佐格自動化製造綜合廠';
    sectorTitleEn = 'SECTOR 02 // FAB-PLEX ROBOTICS ASSEMBLY';
  } else if (currentSectorId === 'sub-sector-0') {
    sectorTitleZh = '次分區 ZERO // 舊城地下水路與廢棄管網';
    sectorTitleEn = 'SUB-SECTOR ZERO // UNDERGROUND SEWER SYSTEM';
  } else if (currentSectorId === 'sector-citadel') {
    sectorTitleZh = '終局堡壘 // 佐格主腦中樞與至高王座';
    sectorTitleEn = 'TZORG CITADEL // OVERMIND APEX THRONE';
  } else if (currentSectorId === 'all') {
    sectorTitleZh = '全域總覽 // 三區宏觀衛星地圖';
    sectorTitleEn = 'GLOBAL OVERVIEW // ALL SECTORS SATELLITE MAP';
  }

  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText?.(isZh ? `// 戰術全域大地圖 : ${sectorTitleZh} //` : `// TACTICAL BIG MAP : ${sectorTitleEn} //`, x + 20, y + 14);

  // 頂部右側探查進度
  const mw = Number((activeMap as any).width) || 40;
  const mh = Number((activeMap as any).height) || 30;
  const totalTiles = mw * mh;
  const exploredCount = isFullMap ? totalTiles : (explored?.size || 0);
  const exploredPct = Math.min(100, Math.round((exploredCount / totalTiles) * 100));

  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = isFullMap ? '#ffea00' : '#00ff88';
  ctx.fillText?.(
    isZh ? `測繪覆蓋率: ${exploredPct}% (${exploredCount}/${totalTiles})` : `SURVEY: ${exploredPct}% (${exploredCount}/${totalTiles})`,
    x + boxW - 20,
    y + 16
  );

  // 裝飾分割橫線
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath?.();
  ctx.moveTo?.(x + 16, y + 36);
  ctx.lineTo?.(x + boxW - 16, y + 36);
  ctx.stroke?.();

  // 3. 地圖區域繪製
  if (selectedSector === 'all') {
    drawGlobalAllSectorsMap(ctx, x + 16, y + 42, boxW - 32, boxH - 76, player, language, now);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 13px ' + fontStack;
    const closePulse = 0.7 + 0.3 * Math.sin(now * 0.008);
    ctx.fillStyle = 'rgba(0, 240, 255, ' + closePulse + ')';
    const bottomHelp = isZh
      ? '按 [ S ] 切換分區檢視  |  [ G ] 全區宏觀總覽  |  [ 1-5 ] 設為 GPS 導航航點  |  [ 0 ] 清除  |  [ TAB / ESC ] 關閉'
      : 'PRESS [ S ] CYCLE SECTOR  |  [ G ] GLOBAL ATLAS  |  [ 1-5 ] SET GPS WAYPOINT  |  [ 0 ] CLEAR  |  [ TAB / ESC ] CLOSE';
    ctx.fillText?.(bottomHelp, x + boxW / 2, y + boxH - 16);
    ctx.restore?.();
    return;
  }
  const sidebarW = 250;
  const mapAreaW = boxW - sidebarW - 36;
  const mapAreaH = boxH - 76;
  const tileSize = Math.max(8, Math.min(Math.floor(mapAreaW / mw), Math.floor(mapAreaH / mh)));

  const mapRenderW = mw * tileSize;
  const mapRenderH = mh * tileSize;
  const mapStartX = x + 18 + Math.floor((mapAreaW - mapRenderW) / 2);
  const mapStartY = y + 42 + Math.floor((mapAreaH - mapRenderH) / 2);

  // 地圖底色與網格
  ctx.fillStyle = '#040b12';
  ctx.fillRect?.(mapStartX, mapStartY, mapRenderW, mapRenderH);
  ctx.strokeStyle = '#122c3e';
  ctx.lineWidth = 1;
  ctx.strokeRect?.(mapStartX - 0.5, mapStartY - 0.5, mapRenderW + 1, mapRenderH + 1);

  // 根據分區定義色彩體系
  const sectorColors = {
    'sector-1': {
      wallVis: '#265173',
      wallVisStroke: '#00f0ff',
      wallExplored: '#1b3b54',
      wallExploredStroke: '#2d658c',
      wallUnexplored: '#0f2231',
      wallUnexploredStroke: 'rgba(0, 180, 240, 0.4)',
      floorVis: '#081724',
      floorExplored: '#050f18',
      unexploredDot: 'rgba(0, 240, 255, 0.05)',
      doorClosed: '#00e5ff',
      doorOpen: 'rgba(0, 229, 255, 0.25)',
      conveyor: '#1e3830'
    },
    'sector-2': {
      wallVis: '#5a381c',
      wallVisStroke: '#ffaa00',
      wallExplored: '#3d2510',
      wallExploredStroke: '#8a5a20',
      wallUnexplored: '#241608',
      wallUnexploredStroke: 'rgba(255, 170, 0, 0.4)',
      floorVis: '#1c140d',
      floorExplored: '#120d08',
      unexploredDot: 'rgba(255, 170, 0, 0.05)',
      doorClosed: '#ffaa00',
      doorOpen: 'rgba(255, 170, 0, 0.25)',
      conveyor: '#2a1f15'
    },
    'sub-sector-0': {
      wallVis: '#1c4530',
      wallVisStroke: '#00ffaa',
      wallExplored: '#123020',
      wallExploredStroke: '#008855',
      wallUnexplored: '#0a1a12',
      wallUnexploredStroke: 'rgba(0, 255, 170, 0.4)',
      floorVis: '#0d1a14',
      floorExplored: '#08100c',
      unexploredDot: 'rgba(0, 255, 170, 0.05)',
      doorClosed: '#00ffaa',
      doorOpen: 'rgba(0, 255, 170, 0.25)',
      conveyor: '#15251d'
    },
    'sector-citadel': {
      wallVis: '#3a1020',
      wallVisStroke: '#ff0055',
      wallExplored: '#240a14',
      wallExploredStroke: '#880033',
      wallUnexplored: '#14050a',
      wallUnexploredStroke: 'rgba(255, 0, 85, 0.4)',
      floorVis: '#140d18',
      floorExplored: '#0c0810',
      unexploredDot: 'rgba(255, 0, 85, 0.05)',
      doorClosed: '#ff0055',
      doorOpen: 'rgba(255, 0, 85, 0.25)',
      conveyor: '#251520'
    }
  };

  const activeColors = (sectorColors as Record<string, any>)[currentSectorId] || sectorColors['sector-1'];

  const tiles = (activeMap as any).tiles;
  if (Array.isArray(tiles)) {
    for (let ty = 0; ty < mh; ty++) {
      const row = tiles[ty];
      if (!row) continue;
      for (let tx = 0; tx < mw; tx++) {
        const key = `${tx},${ty}`;
        const isExplored = isFullMap || explored?.has(key);
        const isVis = isFullMap || visible?.has(key);
        const cellX = mapStartX + tx * tileSize;
        const cellY = mapStartY + ty * tileSize;

        const kind = normalizeTileKind(row[tx]);

        if (kind === 'WALL') {
          if (isVis) {
            ctx.fillStyle = activeColors.wallVis;
            ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
            ctx.strokeStyle = activeColors.wallVisStroke;
            ctx.strokeRect?.(cellX + 0.5, cellY + 0.5, tileSize - 1, tileSize - 1);
          } else if (isExplored) {
            ctx.fillStyle = activeColors.wallExplored;
            ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
            ctx.strokeStyle = activeColors.wallExploredStroke;
            ctx.strokeRect?.(cellX + 0.5, cellY + 0.5, tileSize - 1, tileSize - 1);
          } else {
            ctx.fillStyle = activeColors.wallUnexplored;
            ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
            ctx.strokeStyle = activeColors.wallUnexploredStroke;
            ctx.strokeRect?.(cellX + 0.5, cellY + 0.5, tileSize - 1, tileSize - 1);
          }
          continue;
        }

        if (!isExplored) {
          // 未探索區域：深黑背景微弱點陣
          if ((tx + ty) % 4 === 0) {
            ctx.fillStyle = activeColors.unexploredDot;
            ctx.fillRect?.(cellX + tileSize / 2 - 1, cellY + tileSize / 2 - 1, 2, 2);
          }
          continue;
        }

        if (kind === 'FORCEFIELD') {
          const pulseAlpha = 0.6 + 0.4 * Math.sin(now * 0.01 + tx);
          ctx.fillStyle = `rgba(255, 40, 80, ${pulseAlpha})`;
          ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
        } else if (kind === 'DOOR_CLOSED') {
          ctx.fillStyle = activeColors.doorClosed;
          ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
        } else if (kind === 'DOOR_OPEN') {
          ctx.fillStyle = activeColors.doorOpen;
          ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
        } else if (kind === 'TERMINAL') {
          ctx.fillStyle = '#ffea00';
          ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
        } else if (kind === 'ELEVATOR') {
          ctx.fillStyle = '#00aaff';
          ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
        } else if (kind === 'CONVEYOR') {
          ctx.fillStyle = activeColors.conveyor;
          ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
        } else {
          // 一般地板
          ctx.fillStyle = isVis ? activeColors.floorVis : activeColors.floorExplored;
          ctx.fillRect?.(cellX, cellY, tileSize, tileSize);
        }
      }
    }
  }

  // 繪製地圖實體標記
  // A. 地面道具
  if (Array.isArray(groundItems)) {
    groundItems.forEach((it) => {
      const k = `${it.x},${it.y}`;
      if (isFullMap || visible?.has(k)) {
        const ix = mapStartX + it.x * tileSize + tileSize / 2;
        const iy = mapStartY + it.y * tileSize + tileSize / 2;
        ctx.fillStyle = '#ffbb00';
        ctx.beginPath?.();
        ctx.arc?.(ix, iy, Math.max(2, tileSize * 0.28), 0, Math.PI * 2);
        ctx.fill?.();
      }
    });
  }

  // B. 居民 NPC
  if (Array.isArray(npcs)) {
    npcs.forEach((npc) => {
      if (!npc.isAlive) return;
      const k = `${npc.x},${npc.y}`;
      if (isFullMap || visible?.has(k)) {
        const nx = mapStartX + npc.x * tileSize + tileSize / 2;
        const ny = mapStartY + npc.y * tileSize + tileSize / 2;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath?.();
        ctx.arc?.(nx, ny, Math.max(2.5, tileSize * 0.35), 0, Math.PI * 2);
        ctx.fill?.();
      }
    });
  }

  // C. 敵方機器人
  if (Array.isArray(robots)) {
    robots.forEach((rob) => {
      if (!rob.isAlive) return;
      const k = `${rob.x},${rob.y}`;
      if (isFullMap || visible?.has(k) || (player as any)?.augments?.OPTIC_HUD) {
        const rx = mapStartX + rob.x * tileSize + tileSize / 2;
        const ry = mapStartY + rob.y * tileSize + tileSize / 2;
        const isBoss = rob.robotType === 'EXTERMINATOR';
        ctx.fillStyle = isBoss ? '#ff0055' : '#ff3344';
        ctx.beginPath?.();
        const rSize = isBoss ? Math.max(3.5, tileSize * 0.48) : Math.max(2.5, tileSize * 0.35);
        ctx.arc?.(rx, ry, rSize, 0, Math.PI * 2);
        ctx.fill?.();
      }
    });
  }

  // D. 玩家位置（動態光環與信標）
  const px = mapStartX + player.x * tileSize + tileSize / 2;
  const py = mapStartY + player.y * tileSize + tileSize / 2;
  const pulseR = Math.max(4, tileSize * 0.5) + (Math.sin(now * 0.008) + 1) * 2;
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath?.();
  ctx.arc?.(px, py, pulseR, 0, Math.PI * 2);
  ctx.stroke?.();

  ctx.fillStyle = '#00ffff';
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 8;
  ctx.beginPath?.();
  ctx.arc?.(px, py, Math.max(3, tileSize * 0.35), 0, Math.PI * 2);
  ctx.fill?.();
  ctx.shadowBlur = 0;

  // 4. 右側情報側欄 (District Intelligence & Tactical Legend)
  const sideX = x + boxW - sidebarW - 16;
  const sideY = y + 42;
  ctx.fillStyle = 'rgba(4, 12, 20, 0.85)';
  ctx.fillRect?.(sideX, sideY, sidebarW, mapAreaH);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.strokeRect?.(sideX + 0.5, sideY + 0.5, sidebarW - 1, mapAreaH - 1);

  let sideCurY = sideY + 14;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // 當前特工狀態
  ctx.fillStyle = '#00f0ff';
  ctx.font = `bold 14px ${fontStack}`;
  ctx.fillText?.(isZh ? '【特工即時定位】' : '[OPERATIVE TELEMETRY]', sideX + 12, sideCurY);
  sideCurY += 18;

  ctx.fillStyle = '#c8e2f0';
  ctx.font = `13px ${fontStack}`;
  ctx.fillText?.(isZh ? `當前座標 : [ X: ${player.x}, Y: ${player.y} ]` : `COORDINATES : [ X: ${player.x}, Y: ${player.y} ]`, sideX + 12, sideCurY);
  sideCurY += 16;
  ctx.fillText?.(isZh ? `生命 / 能量 : ${player.hp} HP / ${player.energy} EN` : `HEALTH/NRG : ${player.hp} HP / ${player.energy} EN`, sideX + 12, sideCurY);
  sideCurY += 24;

  // 分區重要地標列表
  ctx.fillStyle = '#ffb700';
  ctx.font = `bold 14px ${fontStack}`;
  ctx.fillText?.(isZh ? '【重要分區地標】' : '[DISTRICT BLUEPRINT]', sideX + 12, sideCurY);
  sideCurY += 18;

  let pois: Array<{ nameZh: string; nameEn: string; coord: string; color: string }> = [];
  if (currentSectorId === 'sector-1') {
    pois = [
      { nameZh: '反抗軍安全屋', nameEn: 'Rebel Safehouse', coord: '[04, 24]', color: '#00ff88' },
      { nameZh: '生化綠能公園', nameEn: 'Cyber Park', coord: '[20, 12]', color: '#00e5ff' },
      { nameZh: '霓虹暗巷街市', nameEn: 'Neon Market', coord: '[12, 22]', color: '#ffb700' },
      { nameZh: '01 檢查哨力場', nameEn: 'Checkpoint 01', coord: '[28, 14]', color: '#ff3366' },
      { nameZh: '通往 Sec-02 電梯', nameEn: 'Transit Elevator', coord: '[36, 26]', color: '#00aaff' },
    ];
  } else if (currentSectorId === 'sector-2') {
    pois = [
      { nameZh: '主伺服機房核心', nameEn: 'Server Core', coord: '[18, 08]', color: '#00e5ff' },
      { nameZh: '高危險化學儲區', nameEn: 'Hazard Vault', coord: '[06, 16]', color: '#ffaa00' },
      { nameZh: '黑市地下軍火巷', nameEn: 'Black Market', coord: '[22, 24]', color: '#c77dff' },
      { nameZh: '佐格主腦終端室', nameEn: 'Overmind Apex', coord: '[34, 14]', color: '#ff0055' },
      { nameZh: '往返 Sec-01 電梯', nameEn: 'Transit Elevator', coord: '[02, 06]', color: '#00aaff' },
    ];
  } else if (currentSectorId === 'sector-citadel') {
    pois = [
      { nameZh: '頂層高速升降梯', nameEn: 'Express Elevator', coord: '[03, 15]', color: '#00aaff' },
      { nameZh: '前室安檢防衛終端', nameEn: 'Security Gate', coord: '[06, 13]', color: '#00ff88' },
      { nameZh: '終極殲滅者戰鬥台', nameEn: 'Boss Platform', coord: '[22, 15]', color: '#ff3366' },
      { nameZh: '佐格主腦中樞終端', nameEn: 'Overmind Central Core', coord: '[36, 15]', color: '#ffd700' },
    ];
  } else {
    pois = [
      { nameZh: '廢棄水道入水口', nameEn: 'Aqueduct Intake', coord: '[04, 05]', color: '#00e5ff' },
      { nameZh: '地下通訊終端機', nameEn: 'Underground Comm', coord: '[18, 14]', color: '#ffea00' },
      { nameZh: '下水管道維護軸', nameEn: 'Maintenance Shaft', coord: '[36, 22]', color: '#00ff88' },
    ];
  }

  pois.forEach((poi) => {
    ctx.font = `13px ${fontStack}`;
    ctx.fillStyle = poi.color;
    ctx.fillText?.(`• ${isZh ? poi.nameZh : poi.nameEn}`, sideX + 12, sideCurY);
    ctx.fillStyle = '#7a9eaf';
    ctx.textAlign = 'right';
    ctx.fillText?.(poi.coord, sideX + sidebarW - 12, sideCurY);
    ctx.textAlign = 'left';
    sideCurY += 17;
  });

  sideCurY += 12;

  // 戰術圖例 (Tactical Map Legend)
  ctx.fillStyle = '#00ffaa';
  ctx.font = `bold 14px ${fontStack}`;
  ctx.fillText?.(isZh ? '【戰術圖例說明】' : '[MAP LEGEND]', sideX + 12, sideCurY);
  sideCurY += 18;

  const legends = [
    { labelZh: '特工所在位置', labelEn: 'Operative (You)', color: '#00ffff', sym: '★' },
    { labelZh: '巡邏機器人 / 守衛', labelEn: 'Patrol Drone / Boss', color: '#ff3344', sym: '▲' },
    { labelZh: '操作終端機 / 入侵點', labelEn: 'Terminal / Hack', color: '#ffea00', sym: '■' },
    { labelZh: '友好居民 / 補給商', labelEn: 'NPC / Merchant', color: '#00ff88', sym: '●' },
    { labelZh: '分區傳送電梯 / 人孔', labelEn: 'Elevator / Transit', color: '#00aaff', sym: '🛗' },
    { labelZh: '補給品 / 數據晶片', labelEn: 'Loot / Data Slate', color: '#ffbb00', sym: '◆' },
    { labelZh: '安全雷射屏障', labelEn: 'Forcefield Barrier', color: '#ff3366', sym: '❚' },
  ];

  legends.forEach((leg) => {
    ctx.font = `bold 13px ${fontStack}`;
    ctx.fillStyle = leg.color;
    ctx.fillText?.(leg.sym, sideX + 14, sideCurY);
    ctx.font = `13px ${fontStack}`;
    ctx.fillStyle = '#a0c4d8';
    ctx.fillText?.(isZh ? leg.labelZh : leg.labelEn, sideX + 32, sideCurY);
    sideCurY += 16;
  });

  // 5. 底部快捷操作提示欄
  const bottomBarY = y + boxH - 28;
  ctx.fillStyle = 'rgba(3, 10, 18, 0.9)';
  ctx.fillRect?.(x + 16, bottomBarY, boxW - 32, 22);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.strokeRect?.(x + 16, bottomBarY, boxW - 32, 22);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 13px ${fontStack}`;
  const closePulse = 0.7 + 0.3 * Math.sin(now * 0.008);
  ctx.fillStyle = `rgba(0, 240, 255, ${closePulse})`;
  const bottomHelp = isZh
    ? '按 [ TAB ] 或 [ ESC ] 關閉大地圖  |  按 [ X ] 切換測繪藍圖  |  按 [ V ] 切換全知視野'
    : 'PRESS [ TAB ] OR [ ESC ] TO CLOSE MAP  |  [ X ] FULL BLUEPRINT  |  [ V ] OMNI-VISION';
  ctx.fillText?.(bottomHelp, x + boxW / 2, bottomBarY + 11);

  ctx.restore?.();
}
