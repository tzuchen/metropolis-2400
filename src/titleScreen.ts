import type { Language } from './types';

export function drawTitleScreen(
  width: number,
  height: number,
  ctx: any,
  now: number,
  hasSaveData: boolean,
  language: Language
): void {
  ctx.save?.();
  const isZh = language === 'zh';

  // 1. 深黑色賽博網格背景
  ctx.fillStyle = '#020509';
  ctx.fillRect?.(0, 0, width, height);

  // 2. 賽博空間電路網格線
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath?.();
    ctx.moveTo?.(x, 0);
    ctx.lineTo?.(x, height);
    ctx.stroke?.();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath?.();
    ctx.moveTo?.(0, y);
    ctx.lineTo?.(width, y);
    ctx.stroke?.();
  }

  // 動態掃描光束 (Scanline)
  const scanY = (now * 0.06) % height;
  ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
  ctx.fillRect?.(0, scanY, width, 3);

  // 3. 遊戲主標題
  const titleGlow = 0.8 + 0.2 * Math.sin(now * 0.004);
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 16 * titleGlow;
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText?.('METROPOLIS 2400', width / 2, height * 0.22);

  // 副標題
  ctx.fillStyle = '#ff0077';
  ctx.shadowColor = '#ff0077';
  ctx.shadowBlur = 8;
  ctx.font = 'bold 15px monospace';
  const subTitle = isZh ? '// 佐格反抗軍終端協定 //' : '// TZORG RESISTANCE PROTOCOL //';
  ctx.fillText?.(subTitle, width / 2, height * 0.22 + 42);

  ctx.shadowBlur = 0;

  // 4. 中央控制選單框
  const menuW = Math.min(width - 40, 580);
  const menuH = 220;
  const mx = (width - menuW) / 2;
  const my = height * 0.40;

  ctx.fillStyle = 'rgba(4, 12, 22, 0.90)';
  ctx.fillRect?.(mx, my, menuW, menuH);

  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 10;
  ctx.strokeRect?.(mx, my, menuW, menuH);
  ctx.shadowBlur = 0;

  // 選單內部裝飾角標
  const cornerSize = 8;
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect?.(mx, my, cornerSize, 2);
  ctx.fillRect?.(mx, my, 2, cornerSize);
  ctx.fillRect?.(mx + menuW - cornerSize, my, cornerSize, 2);
  ctx.fillRect?.(mx + menuW - 2, my, 2, cornerSize);
  ctx.fillRect?.(mx, my + menuH - 2, cornerSize, 2);
  ctx.fillRect?.(mx, my + menuH - cornerSize, 2, cornerSize);
  ctx.fillRect?.(mx + menuW - cornerSize, my + menuH - 2, cornerSize, 2);
  ctx.fillRect?.(mx + menuW - 2, my + menuH - cornerSize, 2, cornerSize);

  // 選單項目列表
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
  const items = [
    {
      key: '[ N / SPACE / ENTER ]',
      label: isZh ? '開始新任務 (NEW MISSION)' : 'START NEW MISSION',
      color: `rgba(0, 255, 170, ${pulse})`,
    },
    {
      key: '[ L ]',
      label: isZh
        ? (hasSaveData ? '讀取存檔進度 (LOAD GAME)' : '讀取存檔 (未發現存檔資料)')
        : (hasSaveData ? 'CONTINUE / LOAD GAME' : 'LOAD GAME (NO SAVE FOUND)'),
      color: hasSaveData ? '#00f0ff' : '#4a5b6c',
    },
    {
      key: '[ Z ]',
      label: isZh ? '切換語言 : [ 繁體中文 ] (TOGGLE LANGUAGE)' : 'TOGGLE LANGUAGE : [ ENGLISH ]',
      color: '#ffea00',
    },
    {
      key: '[ 8 / 9 ]',
      label: isZh ? '戰術快速存讀 : [8] 存檔 / [9] 讀檔' : 'TACTICAL SAVE [8] / LOAD [9]',
      color: '#b388ff',
    },
  ];

  items.forEach((item, idx) => {
    const iy = my + 34 + idx * 44;
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = item.color;
    ctx.fillText?.(item.key, mx + 24, iy);

    ctx.textAlign = 'right';
    ctx.font = '13px monospace';
    ctx.fillStyle = item.color;
    ctx.fillText?.(item.label, mx + menuW - 24, iy);
  });

  // 5. 底部系統狀態列
  ctx.fillStyle = '#4a607a';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText?.(
    isZh
      ? 'METROPOLIS 2400 v0.2.0-CYBER | 神經介面連線中 | 支援本機儲存與雙語切換'
      : 'METROPOLIS 2400 v0.2.0-CYBER | NEURAL INTERFACE ONLINE | LOCAL STORAGE ENABLED',
    width / 2,
    height - 24
  );

  ctx.restore?.();
}
