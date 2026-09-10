import type { Language } from './types';

// ─────────────────────────────────────────────────────────────────────────────
//  內部工具：確定性偽隨機 (Deterministic PRNG)
//  確保每一幀繪製結果穩定，避免閃爍，同時讓場景看起來動態。
// ─────────────────────────────────────────────────────────────────────────────
function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h = (h ^ (h >> 16)) | 0;
  return (h >>> 0) / 4294967295;
}

function hash1(n: number): number {
  let h = Math.imul(n | 0, 2654435761);
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 2246822519);
  h = (h ^ (h >>> 16)) | 0;
  return (h >>> 0) / 4294967295;
}

// ─────────────────────────────────────────────────────────────────────────────
//  城市天際線：預先計算的樓層資料 (依 width 產生，但用固定 seed 讓結果穩定)
// ─────────────────────────────────────────────────────────────────────────────
interface Building {
  x: number;
  w: number;
  h: number;
  layer: number; // 0 = 遠層, 1 = 近層
}

function buildSkyline(width: number, height: number): { far: Building[]; near: Building[] } {
  const far: Building[] = [];
  const near: Building[] = [];

  // 遠層：較矮、較密、較暗
  let fx = -20;
  let seed = 1337;
  while (fx < width + 40) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = 24 + (seed % 40);
    const h = height * 0.18 + (seed % 80);
    far.push({ x: fx, w, h, layer: 0 });
    fx += w + 2 + (seed % 8);
  }

  // 近層：較高、較疏、較亮
  let nx = -30;
  seed = 4242;
  while (nx < width + 60) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const w = 40 + (seed % 60);
    const h = height * 0.28 + (seed % 120);
    near.push({ x: nx, w, h, layer: 1 });
    nx += w + 6 + (seed % 14);
  }

  return { far, near };
}

// ─────────────────────────────────────────────────────────────────────────────
//  主函式
// ─────────────────────────────────────────────────────────────────────────────
export function drawTitleScreen(
  width: number,
  height: number,
  ctx: any,
  now: number,
  hasSaveData: boolean,
  language: Language,
  selectedMenuIndex: number
): void {
  ctx.save?.();
  const isZh = language === 'zh';
  const fontStack = '"Noto Sans TC", "Microsoft JhengHei", monospace';

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. 動態背景城市天際線 (Parallax Cyber Cityscape & Weather)
  // ═══════════════════════════════════════════════════════════════════════════

  // 1a. 深邃夜空漸層
  const skyGrad = ctx.createLinearGradient?.(0, 0, 0, height);
  if (skyGrad) {
    skyGrad.addColorStop?.(0, '#010409');
    skyGrad.addColorStop?.(0.45, '#020810');
    skyGrad.addColorStop?.(0.75, '#040c18');
    skyGrad.addColorStop?.(1, '#06121f');
  }
  ctx.fillStyle = skyGrad || '#010409';
  ctx.fillRect?.(0, 0, width, height);

  // 1b. 微弱星點
  for (let i = 0; i < 60; i++) {
    const sx = hash1(i * 7 + 1) * width;
    const sy = hash1(i * 13 + 2) * height * 0.4;
    const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(now * 0.001 + i * 1.7));
    ctx.fillStyle = `rgba(180, 220, 255, ${0.15 * twinkle})`;
    ctx.fillRect?.(sx, sy, 1, 1);
  }

  // 1c. 多層摩天巨構天際線剪影
  const skyline = buildSkyline(width, height);
  const horizonY = height * 0.62;

  // 遠層
  ctx.fillStyle = '#06121f';
  for (const b of skyline.far) {
    const topY = horizonY - b.h * 0.7;
    ctx.fillRect?.(b.x, topY, b.w, b.h * 0.7 + 20);
  }

  // 近層
  ctx.fillStyle = '#0a1c2e';
  for (const b of skyline.near) {
    const topY = horizonY - b.h;
    ctx.fillRect?.(b.x, topY, b.w, b.h + 20);

    // 矩陣微型發光窗戶
    const winCols = Math.floor(b.w / 8);
    const winRows = Math.floor(b.h / 12);
    for (let wy = 0; wy < winRows; wy++) {
      for (let wx = 0; wx < winCols; wx++) {
        const r = hash2(b.x + wx * 8, wy * 12 + b.h);
        if (r > 0.55) {
          const wx2 = b.x + 3 + wx * 8;
          const wy2 = topY + 6 + wy * 12;
          const flicker = 0.6 + 0.4 * Math.sin(now * 0.002 + r * 20);
          let color: string;
          if (r > 0.85) color = `rgba(255, 170, 0, ${0.5 * flicker})`;
          else if (r > 0.7) color = `rgba(0, 240, 255, ${0.45 * flicker})`;
          else color = `rgba(255, 0, 119, ${0.35 * flicker})`;
          ctx.fillStyle = color;
          ctx.fillRect?.(wx2, wy2, 3, 4);
        }
      }
    }

    // 樓頂緩慢閃爍的紅色通訊塔警示燈
    if (b.w > 50) {
      const beaconX = b.x + b.w / 2;
      const beaconY = topY - 4;
      const blink = Math.sin(now * 0.003 + b.x * 0.1) > 0.3 ? 1 : 0.15;
      ctx.fillStyle = `rgba(255, 40, 40, ${0.9 * blink})`;
      ctx.beginPath?.();
      ctx.arc?.(beaconX, beaconY, 2.5, 0, Math.PI * 2);
      ctx.fill?.();
      // 光暈
      ctx.fillStyle = `rgba(255, 40, 40, ${0.15 * blink})`;
      ctx.beginPath?.();
      ctx.arc?.(beaconX, beaconY, 7, 0, Math.PI * 2);
      ctx.fill?.();
    }
  }

  // 1d. 動態飄落的細微賽博雨絲/光點
  const rainCount = 80;
  for (let i = 0; i < rainCount; i++) {
    const seedR = hash1(i * 31 + 7);
    const speed = 0.15 + seedR * 0.25;
    const rx = ((seedR * width * 3 + now * speed * 0.3) % (width + 40)) - 20;
    const ry = ((seedR * height * 5 + now * speed) % (height + 60)) - 30;
    const len = 6 + seedR * 10;
    const alpha = 0.08 + seedR * 0.12;
    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(rx, ry);
    ctx.lineTo?.(rx - 1.5, ry + len);
    ctx.stroke?.();
  }

  // 1e. 半透明探照燈光束 (Searchlight) 在天際線緩緩擺動掃過
  const searchAngle = Math.sin(now * 0.0008) * 0.6 - 0.3;
  const searchOriginX = width * 0.7;
  const searchOriginY = horizonY - 10;
  const searchLen = height * 0.9;
  const searchSpread = 0.06;

  ctx.save?.();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath?.();
  ctx.moveTo?.(searchOriginX, searchOriginY);
  ctx.lineTo?.(
    searchOriginX + Math.cos(searchAngle - searchSpread) * searchLen,
    searchOriginY + Math.sin(searchAngle - searchSpread) * searchLen
  );
  ctx.lineTo?.(
    searchOriginX + Math.cos(searchAngle + searchSpread) * searchLen,
    searchOriginY + Math.sin(searchAngle + searchSpread) * searchLen
  );
  ctx.closePath?.();
  ctx.fill?.();
  ctx.restore?.();

  // 第二道探照燈 (對側)
  const searchAngle2 = Math.sin(now * 0.0006 + 2.5) * 0.5 + 0.4;
  const searchOriginX2 = width * 0.2;
  ctx.save?.();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ff0077';
  ctx.beginPath?.();
  ctx.moveTo?.(searchOriginX2, searchOriginY);
  ctx.lineTo?.(
    searchOriginX2 + Math.cos(searchAngle2 - searchSpread) * searchLen,
    searchOriginY + Math.sin(searchAngle2 - searchSpread) * searchLen
  );
  ctx.lineTo?.(
    searchOriginX2 + Math.cos(searchAngle2 + searchSpread) * searchLen,
    searchOriginY + Math.sin(searchAngle2 + searchSpread) * searchLen
  );
  ctx.closePath?.();
  ctx.fill?.();
  ctx.restore?.();

  // 1f. 底部透視向量網格地板 (Perspective Grid)
  const gridTop = horizonY;
  const gridBottom = height;
  const gridH = gridBottom - gridTop;
  const vanishX = width / 2;
  const vanishY = gridTop;

  // 水平線 (由近到遠漸密)
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 18; i++) {
    const t = i / 18;
    const y = gridTop + gridH * Math.pow(t, 1.6);
    const alpha = 0.04 + t * 0.12;
    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
    ctx.beginPath?.();
    ctx.moveTo?.(0, y);
    ctx.lineTo?.(width, y);
    ctx.stroke?.();
  }

  // 放射線 (從消失點向外)
  const numRadial = 24;
  for (let i = 0; i <= numRadial; i++) {
    const t = i / numRadial;
    const xBottom = t * width * 1.4 - width * 0.2;
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.03 + 0.06 * Math.abs(t - 0.5) * 2})`;
    ctx.beginPath?.();
    ctx.moveTo?.(vanishX, vanishY);
    ctx.lineTo?.(xBottom, gridBottom);
    ctx.stroke?.();
  }

  // 動態掃描光束 (Scanline)
  const scanY = (now * 0.06) % height;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.10)';
  ctx.fillRect?.(0, scanY, width, 2);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
  ctx.fillRect?.(0, scanY - 8, width, 16);

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. 反抗軍徽章與立體主標題 (Resistance Crest & 3D Glitch Typography)
  // ═══════════════════════════════════════════════════════════════════════════

  const crestCX = width / 2;
  const crestCY = height * 0.10;
  const crestR = 28;
  const crestPulse = 0.7 + 0.3 * Math.sin(now * 0.003);

  // 2a. 普羅米修斯計畫幾何反抗軍霓虹光翼徽章 (Prometheus Resistance Crest)
  ctx.save?.();
  ctx.translate?.(crestCX, crestCY);

  // 外環
  ctx.strokeStyle = `rgba(0, 240, 255, ${0.6 * crestPulse})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath?.();
  ctx.arc?.(0, 0, crestR, 0, Math.PI * 2);
  ctx.stroke?.();

  // 內環
  ctx.strokeStyle = `rgba(255, 0, 119, ${0.4 * crestPulse})`;
  ctx.lineWidth = 1;
  ctx.beginPath?.();
  ctx.arc?.(0, 0, crestR * 0.65, 0, Math.PI * 2);
  ctx.stroke?.();

  // 光翼 (Prometheus wings - 幾何三角形)
  const wingPulse = 0.5 + 0.5 * Math.sin(now * 0.004);
  ctx.fillStyle = `rgba(0, 240, 255, ${0.3 * wingPulse})`;
  // 左翼
  ctx.beginPath?.();
  ctx.moveTo?.(-crestR * 0.3, -crestR * 0.2);
  ctx.lineTo?.(-crestR * 1.1, -crestR * 0.7);
  ctx.lineTo?.(-crestR * 0.8, 0);
  ctx.lineTo?.(-crestR * 0.3, crestR * 0.1);
  ctx.closePath?.();
  ctx.fill?.();
  // 右翼
  ctx.beginPath?.();
  ctx.moveTo?.(crestR * 0.3, -crestR * 0.2);
  ctx.lineTo?.(crestR * 1.1, -crestR * 0.7);
  ctx.lineTo?.(crestR * 0.8, 0);
  ctx.lineTo?.(crestR * 0.3, crestR * 0.1);
  ctx.closePath?.();
  ctx.fill?.();

  // 中心火焰/核心 (Prometheus fire)
  const firePulse = 0.6 + 0.4 * Math.sin(now * 0.006);
  ctx.fillStyle = `rgba(255, 170, 0, ${0.8 * firePulse})`;
  ctx.beginPath?.();
  ctx.moveTo?.(0, -crestR * 0.45);
  ctx.lineTo?.(crestR * 0.2, crestR * 0.15);
  ctx.lineTo?.(0, crestR * 0.35);
  ctx.lineTo?.(-crestR * 0.2, crestR * 0.15);
  ctx.closePath?.();
  ctx.fill?.();

  // 核心光暈
  ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * firePulse})`;
  ctx.beginPath?.();
  ctx.arc?.(0, -crestR * 0.1, 3, 0, Math.PI * 2);
  ctx.fill?.();

  // 旋轉刻度線
  const rotAngle = now * 0.001;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + rotAngle;
    const innerR = crestR * 0.75;
    const outerR = crestR * 0.9;
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 * crestPulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(Math.cos(a) * innerR, Math.sin(a) * innerR);
    ctx.lineTo?.(Math.cos(a) * outerR, Math.sin(a) * outerR);
    ctx.stroke?.();
  }

  ctx.restore?.();

  // 2b. 「METROPOLIS 2400」主標題：立體多層光暈 + 數位故障色差
  const titleY = height * 0.22;
  const titleGlow = 0.8 + 0.2 * Math.sin(now * 0.004);
  const glitchOffset = Math.sin(now * 0.007) * 1.5;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 42px monospace';

  // 深底投影 (Shadow layer)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillText?.('METROPOLIS 2400', width / 2 + 2, titleY + 3);

  // 數位故障色差 - 青 (Cyan) 偏移
  ctx.fillStyle = `rgba(0, 240, 255, ${0.35 * titleGlow})`;
  ctx.fillText?.('METROPOLIS 2400', width / 2 - glitchOffset, titleY);

  // 數位故障色差 - 洋紅 (Magenta) 偏移
  ctx.fillStyle = `rgba(255, 0, 119, ${0.35 * titleGlow})`;
  ctx.fillText?.('METROPOLIS 2400', width / 2 + glitchOffset, titleY);

  // 白青核心 (Core)
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18 * titleGlow;
  ctx.fillStyle = '#e0ffff';
  ctx.fillText?.('METROPOLIS 2400', width / 2, titleY);

  // 霓虹青發光外層
  ctx.shadowBlur = 30 * titleGlow;
  ctx.fillStyle = `rgba(0, 240, 255, ${0.5 * titleGlow})`;
  ctx.fillText?.('METROPOLIS 2400', width / 2, titleY);

  ctx.shadowBlur = 0;

  // 2c. 副標題 (桃紅霓虹)
  const subTitleY = titleY + 42;
  ctx.font = isZh ? `bold 17px ${fontStack}` : 'bold 17px monospace';
  ctx.shadowColor = '#ff0077';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ff0077';
  const subTitle = isZh ? '// 佐格反抗軍終端協定 //' : '// TZORG RESISTANCE PROTOCOL //';
  ctx.fillText?.(subTitle, width / 2, subTitleY);
  ctx.shadowBlur = 0;

  // 狀態情報標籤
  const statusY = subTitleY + 24;
  ctx.font = isZh ? `11px ${fontStack}` : '11px monospace';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
  const statusLabel = isZh
    ? `[ 神經介面: 已連線 ]  [ 加密通道: 安全 ]  [ 反抗軍頻率: 2400.0 MHz ]`
    : '[ NEURAL LINK: CONNECTED ]  [ ENCRYPTED CHANNEL: SECURE ]  [ RESISTANCE FREQ: 2400.0 MHz ]';
  ctx.fillText?.(statusLabel, width / 2, statusY);

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. 戰術終端風選單控制台 (Tactical HUD Glassmorphism Console)
  // ═══════════════════════════════════════════════════════════════════════════

  const menuW = Math.min(width - 40, 620);
  const menuH = 310;
  const mx = (width - menuW) / 2;
  const my = height * 0.38;

  // 3a. 半透明深黑賽博玻璃底板
  ctx.fillStyle = 'rgba(3, 8, 16, 0.92)';
  ctx.fillRect?.(mx, my, menuW, menuH);

  // 玻璃微光漸層
  const glassGrad = ctx.createLinearGradient?.(mx, my, mx, my + menuH);
  if (glassGrad) {
    glassGrad.addColorStop?.(0, 'rgba(0, 240, 255, 0.03)');
    glassGrad.addColorStop?.(0.5, 'rgba(0, 0, 0, 0)');
    glassGrad.addColorStop?.(1, 'rgba(0, 240, 255, 0.02)');
  }
  ctx.fillStyle = glassGrad || 'rgba(0,0,0,0)';
  ctx.fillRect?.(mx, my, menuW, menuH);

  // 3b. 細緻的青藍發光框線
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.strokeRect?.(mx, my, menuW, menuH);
  ctx.shadowBlur = 0;

  // 3c. 高科技四角戰術準心標註
  const cornerSize = 14;
  const cornerLen = 4;
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  // 左上
  ctx.beginPath?.();
  ctx.moveTo?.(mx, my + cornerSize);
  ctx.lineTo?.(mx, my);
  ctx.lineTo?.(mx + cornerSize, my);
  ctx.stroke?.();
  // 右上
  ctx.beginPath?.();
  ctx.moveTo?.(mx + menuW - cornerSize, my);
  ctx.lineTo?.(mx + menuW, my);
  ctx.lineTo?.(mx + menuW, my + cornerSize);
  ctx.stroke?.();
  // 左下
  ctx.beginPath?.();
  ctx.moveTo?.(mx, my + menuH - cornerSize);
  ctx.lineTo?.(mx, my + menuH);
  ctx.lineTo?.(mx + cornerSize, my + menuH);
  ctx.stroke?.();
  // 右下
  ctx.beginPath?.();
  ctx.moveTo?.(mx + menuW - cornerSize, my + menuH);
  ctx.lineTo?.(mx + menuW, my + menuH);
  ctx.lineTo?.(mx + menuW, my + menuH - cornerSize);
  ctx.stroke?.();

  // 準心小圓點
  ctx.fillStyle = '#00f0ff';
  ctx.beginPath?.();
  ctx.arc?.(mx, my, 2, 0, Math.PI * 2);
  ctx.fill?.();
  ctx.beginPath?.();
  ctx.arc?.(mx + menuW, my, 2, 0, Math.PI * 2);
  ctx.fill?.();
  ctx.beginPath?.();
  ctx.arc?.(mx, my + menuH, 2, 0, Math.PI * 2);
  ctx.fill?.();
  ctx.beginPath?.();
  ctx.arc?.(mx + menuW, my + menuH, 2, 0, Math.PI * 2);
  ctx.fill?.();

  // 3d. 頂部控制台標題列
  const headerY = my + 22;
  ctx.textBaseline = 'middle';

  // 左側：⬢ TAC-SIM // NEURAL LINK ONLINE
  ctx.textAlign = 'left';
  ctx.font = isZh ? `bold 12px ${fontStack}` : 'bold 12px monospace';
  ctx.fillStyle = '#00f0ff';
  const headerLeft = isZh ? '⬢ TAC-SIM // 神經介面連線中' : '⬢ TAC-SIM // NEURAL LINK ONLINE';
  ctx.fillText?.(headerLeft, mx + 16, headerY);

  // 右側：動態呼吸綠色連線指示燈 ● LINK STABLE
  const linkPulse = 0.5 + 0.5 * Math.sin(now * 0.005);
  ctx.textAlign = 'right';
  ctx.fillStyle = `rgba(0, 255, 100, ${0.5 + 0.5 * linkPulse})`;
  const dotX = mx + menuW - 16 - ctx.measureText?.(isZh ? '● 連線穩定' : '● LINK STABLE')?.width - 8;
  ctx.beginPath?.();
  ctx.arc?.(dotX, headerY, 4, 0, Math.PI * 2);
  ctx.fill?.();
  // 光暈
  ctx.fillStyle = `rgba(0, 255, 100, ${0.2 * linkPulse})`;
  ctx.beginPath?.();
  ctx.arc?.(dotX, headerY, 8, 0, Math.PI * 2);
  ctx.fill?.();

  ctx.fillStyle = `rgba(0, 255, 100, ${0.7 + 0.3 * linkPulse})`;
  ctx.fillText?.(isZh ? '連線穩定' : 'LINK STABLE', mx + menuW - 16, headerY);

  // 標題列下分隔線
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath?.();
  ctx.moveTo?.(mx + 12, my + 36);
  ctx.lineTo?.(mx + menuW - 12, my + 36);
  ctx.stroke?.();

  // 3e. 選單項目列表
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
  const items = [
    {
      key: '[ N / SPACE / ENTER ]',
      label: isZh ? '開始新任務 (NEW MISSION)' : 'START NEW MISSION',
      color: `rgba(0, 255, 170, ${pulse})`,
      highlight: selectedMenuIndex === 0,
    },
    {
      key: '[ L ]',
      label: isZh
        ? (hasSaveData ? '讀取存檔進度 (LOAD GAME)' : '讀取存檔 (未發現存檔資料)')
        : (hasSaveData ? 'CONTINUE / LOAD GAME' : 'LOAD GAME (NO SAVE FOUND)'),
      color: hasSaveData ? '#00f0ff' : '#4a5b6c',
      highlight: selectedMenuIndex === 1,
    },
    {
      key: '[ Z ]',
      label: isZh ? '切換語言 : [ 繁體中文 ] (TOGGLE LANGUAGE)' : 'TOGGLE LANGUAGE : [ ENGLISH ]',
      color: '#ffea00',
      highlight: selectedMenuIndex === 2,
    },
    {
      key: '[ H ]',
      label: isZh ? '特工行動手冊 (AGENT FIELD MANUAL)' : 'TACTICAL MANUAL & CONTROLS',
      color: '#00f0ff',
      highlight: selectedMenuIndex === 3,
    },
    {
      key: '[ 8 / 9 ]',
      label: isZh ? '戰術快速存讀 : [8] 存檔 / [9] 讀檔' : 'TACTICAL SAVE [8] / LOAD [9]',
      color: '#b388ff',
      highlight: selectedMenuIndex === 4,
    },
    {
      key: '[ 0 / F10 ]',
      label: isZh ? '切換畫面解析度 (CYCLE RESOLUTION)' : 'CYCLE RESOLUTION (960x600/1200x750/800x500)',
      color: '#00f0ff',
      highlight: selectedMenuIndex === 5,
    },
  ];

  const itemStartY = my + 52;
  const itemSpacing = height < 560 ? 38 : 42;

  items.forEach((item, idx) => {
    const iy = itemStartY + idx * itemSpacing;

    // 高亮戰術光帶襯底 (僅第一項)
    if (item.highlight) {
      const bandPulse = 0.45 + 0.2 * Math.sin(now * 0.006);
      ctx.fillStyle = `rgba(0, 255, 170, ${bandPulse})`;
      ctx.fillRect?.(mx + 10, iy - 14, menuW - 20, 30);

      // 動態游標 ▶
      const cursorBlink = Math.sin(now * 0.008) > -0.3 ? 1 : 0.2;
      ctx.fillStyle = `rgba(0, 255, 170, ${cursorBlink})`;
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText?.('▶ SELECTED', mx + 18, iy);
    }

    // 左側按鍵標籤
    ctx.textAlign = 'left';
    ctx.font = isZh ? `bold 14px ${fontStack}` : 'bold 14px monospace';
    ctx.fillStyle = item.color;
    const keyX = item.highlight ? mx + 36 : mx + 24;
    ctx.fillText?.(item.key, keyX, iy);

    // 右側標籤
    ctx.textAlign = 'right';
    ctx.font = isZh ? `14px ${fontStack}` : '14px monospace';
    ctx.fillStyle = item.color;
    ctx.fillText?.(item.label, mx + menuW - 24, iy);

    // 項目間精細的虛線科技感分隔線
    if (idx < items.length - 1) {
      const sepY = iy + itemSpacing / 2;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.setLineDash?.([4, 4]);
      ctx.beginPath?.();
      ctx.moveTo?.(mx + 20, sepY);
      ctx.lineTo?.(mx + menuW - 20, sepY);
      ctx.stroke?.();
      ctx.setLineDash?.([]);
    }
  });

  // Compact onboarding is embedded in the menu header so it remains visible at 800x500.
  const briefing = isZh
    ? '火花特工 // 目標：終端機打卡、避開巡邏 // [T] 互動  [F/C] 武器/偽裝'
    : 'SPARK OPERATIVE // Reach terminal, check in, avoid patrols // [T] interact [F/C] stealth';
  ctx.textAlign = 'center';
  ctx.font = isZh ? `9px ${fontStack}` : '9px monospace';
  ctx.fillStyle = 'rgba(0, 255, 170, 0.9)';
  ctx.fillText?.(briefing, width / 2, my + 32);

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. 底部情報跑馬燈 (Resistance Telemetry Ticker)
  // ═══════════════════════════════════════════════════════════════════════════

  const tickerY = height - 28;
  const tickerH = 22;

  // 跑馬燈背景
  ctx.fillStyle = 'rgba(2, 6, 12, 0.85)';
  ctx.fillRect?.(0, tickerY - tickerH / 2, width, tickerH);

  // 頂部細線
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath?.();
  ctx.moveTo?.(0, tickerY - tickerH / 2);
  ctx.lineTo?.(width, tickerY - tickerH / 2);
  ctx.stroke?.();

  // 跑馬燈文字內容
  const tickerText = isZh
    ? '  METROPOLIS 2400 v0.2.0-CYBER  |  神經介面連線中  |  支援本機儲存與雙語切換  |  反抗軍廣播：佐格城市地下網絡運作正常  |  所有特工請保持加密頻道  |  '
    : '  METROPOLIS 2400 v0.2.0-CYBER  |  NEURAL INTERFACE ONLINE  |  LOCAL STORAGE ENABLED  |  RESISTANCE BROADCAST: TZORG UNDERGROUND NETWORK OPERATIONAL  |  ALL AGENTS MAINTAIN ENCRYPTED CHANNEL  |  ';

  ctx.font = isZh ? `12px ${fontStack}` : '12px monospace';
  const textWidth = ctx.measureText?.(tickerText)?.width || 800;
  const scrollSpeed = 0.02;
  const scrollOffset = (now * scrollSpeed) % (textWidth + width);

  ctx.save?.();
  ctx.beginPath?.();
  ctx.rect?.(0, tickerY - tickerH / 2, width, tickerH);
  ctx.clip?.();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';

  // 繪製兩份文字實現無縫循環
  const startX = width - scrollOffset;
  ctx.fillText?.(tickerText, startX, tickerY);
  ctx.fillText?.(tickerText, startX + textWidth, tickerY);

  ctx.restore?.();

  // 跑馬燈左側標籤
  ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.font = isZh ? `bold 10px ${fontStack}` : 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText?.('▸ TELEMETRY', 8, tickerY - tickerH / 2 - 6);

  ctx.restore?.();
}
