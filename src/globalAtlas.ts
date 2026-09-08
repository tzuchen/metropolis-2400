import { buildSector1Map, buildSector2Map } from './map';
import { buildSubSectorZeroMap } from './sewerMap';
import { getFont, getTitleFont } from './uiFont';

const W = 40;
const H = 30;

function zh(language: string): boolean {
  return String(language || '').toLowerCase().startsWith('zh');
}

function tileColor(v: number): string {
  const p = ['#101418','#22303d','#34465a','#4d627a','#6b829b','#8ea6bd','#b6c9d8','#3a2f2a','#5a4632','#7a5c3a','#9a7b4f','#c0a06a','#2f4f3f','#4f7a5f','#7aa88a','#a8d4b8'];
  return p[Math.max(0, Math.min(15, Math.floor(v)))];
}

function sampleMap(map: any): number[][] {
  const tiles: any[][] = map?.tiles ?? map?.data ?? [];
  const w = map?.width ?? (tiles[0]?.length ?? W);
  const h = map?.height ?? tiles.length;
  const out: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row: number[] = [];
    for (let x = 0; x < W; x++) {
      const sx = Math.floor((x * w) / W);
      const sy = Math.floor((y * h) / H);
      const c = tiles[sy]?.[sx];
      let v = 0;
      if (typeof c === 'number') v = c;
      else if (c?.tileId != null) v = c.tileId;
      else if (c?.id != null) v = c.id;
      else if (c?.type != null) v = c.type;
      row.push(Number.isFinite(v) ? Math.floor(v) : 0);
    }
    out.push(row);
  }
  return out;
}

function fallbackTiles(seed: number): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row: number[] = [];
    for (let x = 0; x < W; x++) {
      const n = (x * 13 + y * 29 + seed * 11) % 16;
      row.push(Math.max(0, Math.min(15, n + ((x % 8 === 0 || y % 7 === 0) ? 4 : 0))));
    }
    out.push(row);
  }
  return out;
}

function drawMiniGrid(ctx: any, x: number, y: number, w: number, h: number, tiles: number[][]): void {
  const ts = Math.max(1, Math.min(8, Math.floor(Math.min(w / W, h / H))));
  const gw = ts * W, gh = ts * H;
  const ox = x + Math.floor((w - gw) / 2), oy = y + Math.floor((h - gh) / 2);
  ctx.fillStyle = '#0b0f13';
  ctx.fillRect(ox - 2, oy - 2, gw + 4, gh + 4);
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      ctx.fillStyle = tileColor(tiles[ty]?.[tx] ?? 0);
      ctx.fillRect(ox + tx * ts, oy + ty * ts, ts, ts);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 2, oy - 2, gw + 4, gh + 4);
}

function drawLandmarks(ctx: any, x: number, y: number, lines: string[], language: string): void {
  const isZh = zh(language);
  const lineH = isZh ? 20 : 16;
  ctx.font = getFont(11, isZh);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  lines.slice(0, 4).forEach((line, i) => {
    const ly = y + i * lineH;
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(x, ly + 4, 4, 4);
    ctx.fillStyle = '#d7e3ee';
    ctx.fillText(line, x + 10, ly);
  });
}

function drawChannelPanel(ctx: any, areaX: number, areaY: number, areaW: number, areaH: number, language: string): void {
  const h = 72, y = areaY + areaH - h - 6, x = areaX + 6, w = areaW - 12;
  ctx.fillStyle = 'rgba(10,14,18,0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(120,160,200,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.font = getTitleFont(11, zh(language));
  ctx.fillStyle = '#8fd0ff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(zh(language) ? '【跨區連通網絡 (TRANSIT CONDUITS)】' : 'Cross-Sector Routes', x + 8, y + 6);
  ctx.font = getFont(10, zh(language));
  const lines = ['ELEVATOR: S1 (36,26) ⇄ S2 (3,5)', 'DRAINAGE: S1 (4,21) ⇄ S0 (4,5)', 'CATWALK:  S0 (35,22) ⇄ S2 (3,25)'];
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? '#9be7ff' : i === 1 ? '#a8d4b8' : '#ffd54f';
    ctx.fillText(line, x + 8, y + 26 + i * 15);
  });
}

export function drawGlobalAllSectorsMap(ctx: any, areaX: number, areaY: number, areaW: number, areaH: number, player: any, language: string, now: number): void {
  const gap = 12, topPad = 6, titleH = 24, channelH = 74, landmarkH = 84;
  const colW = Math.max(48, Math.floor((areaW - 12 - 2 * gap) / 3));
  const gridH = Math.max(48, Math.min(areaH - topPad - titleH - channelH - landmarkH - 24, Math.floor((colW * H) / W)));
  const titleY = areaY + topPad;
  const gridY = titleY + titleH;
  const panelY = areaY + areaH - channelH - 6;
  const landmarkY = gridY + gridH + 8;

  const isZh = zh(language);
  const sectorNames = isZh ? ['【第 01 分區】上城街區', '【第 02 分區】製造工廠', '【次分區 ZERO】地下水路'] : ['Sector 1', 'Sector 2', 'Sub-Sector 0'];
  const landmarkSets: string[][] = [
    isZh ? ['• 升降電梯 (36,26)', '• 排水豎井 (4,21)', '• 反抗軍安全屋 (4,24)', '• 霓虹黑市 (12,22)'] : ['Elevator (36,26)', 'Drainage (4,21)', 'Central Plaza'],
    isZh ? ['• 升降電梯 (3,5)', '• 維修天橋 (3,25)', '• 自動裝配流水線', '• 伺服器核心 & Boss (32,18)'] : ['Elevator (3,5)', 'Catwalk (3,25)', 'Market'],
    isZh ? ['• 排水豎井 (4,5)', '• 維修天橋 (35,22)', '• 毒素污水暗流', '• 秘密拉麵據點'] : ['Drainage (4,5)', 'Catwalk (35,22)', 'Pump Room'],
  ];
  let currentSector = -1;
  const rawSector = player?.sector ?? player?.sectorId ?? player?.zone ?? -1;
  if (typeof rawSector === 'string') {
    const s = rawSector.toLowerCase();
    if (s === 'sector-1' || s === '1') currentSector = 1;
    else if (s === 'sector-2' || s === '2') currentSector = 2;
    else if (s === 'sub-sector-0' || s === '0') currentSector = 0;
  } else {
    currentSector = Number(rawSector);
  }
  const pulse = 0.5 + 0.5 * Math.sin(Number(now || 0) / 500);
  const builders: any[] = [buildSector1Map, buildSector2Map, buildSubSectorZeroMap];

  for (let i = 0; i < 3; i++) {
    const x = areaX + 6 + i * (colW + gap);
    let tiles = fallbackTiles(i + 1);
    try {
      const map = builders[i]();
      if (map && typeof (map as any).then !== 'function') {
        const sampled = sampleMap(map);
        const hasData = sampled.some((row) => row.some((v) => v !== 0));
        if (sampled.length === H && sampled[0]?.length === W && hasData) {
          tiles = sampled;
        }
      }
    } catch (err) {
      void err;
    }

    ctx.fillStyle = 'rgba(12,18,24,0.72)';
    ctx.fillRect(x, gridY - 4, colW, gridH + 8);
    ctx.strokeStyle = currentSector === i + 1 ? `rgba(143,208,255,${0.35 + 0.45 * pulse})` : 'rgba(120,160,200,0.28)';
    ctx.lineWidth = currentSector === i + 1 ? 2 : 1;
    ctx.strokeRect(x, gridY - 4, colW, gridH + 8);

    ctx.font = getTitleFont(12, zh(language));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = currentSector === i + 1 ? '#8fd0ff' : '#d7e3ee';
    ctx.fillText(sectorNames[i], x + 4, titleY + 2);
    if (currentSector === i + 1) {
      const labelW = ctx.measureText(sectorNames[i]).width;
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(isZh ? ' · 當前' : ' · Current', x + 4 + labelW + 4, titleY + 3);
    }

    drawMiniGrid(ctx, x, gridY, colW, gridH, tiles);
    drawLandmarks(ctx, x + 4, landmarkY, landmarkSets[i], language);
  }

  drawChannelPanel(ctx, areaX, areaY, areaW, areaH, language);
}
