import type { Player, Robot } from './types';

function getTileKind(tile: any): string {
  if (typeof tile === 'string') return tile.toUpperCase();
  if (typeof tile === 'number') {
    switch (tile) {
      case 2: return 'WALL';
      case 3: return 'DOOR_CLOSED';
      case 4: return 'DOOR_OPEN';
      case 5: return 'FORCEFIELD';
      case 6: return 'TERMINAL';
      case 7: return 'REBEL_CACHE';
      case 8: return 'EXIT';
      case 9: return 'ELEVATOR';
      case 10: return 'CONVEYOR';
      case 11: return 'TURRET';
      case 12: return 'BIO_TREE';
      case 13: return 'PARK_WATER';
      case 14: return 'VENDOR_STALL';
      case 15: return 'SERVER_RACK';
      case 16: return 'STEAM_VENT';
      case 17: return 'REBEL_BARRICADE';
      case 1:
      default: return 'FLOOR';
    }
  }
  if (tile && typeof tile === 'object') {
    if (tile.type !== undefined) return getTileKind(tile.type);
    if (tile.id && String(tile.id).includes('TERMINAL')) return 'TERMINAL';
  }
  return 'FLOOR';
}

export function drawTileSprite(
  ctx: CanvasRenderingContext2D,
  tile: any,
  x: number,
  y: number,
  size: number,
  visible: boolean = true,
  time: number = 0
): void {
  const kind = getTileKind(tile);
  ctx.save();
  if (!visible) {
    ctx.globalAlpha = 0.35;
  }

  if (kind === 'WALL') {
    // 裝甲鋼板建築外牆 (Cyberpunk Industrial Wall)
    ctx.fillStyle = '#101722';
    ctx.fillRect(x, y, size, size);

    // 金屬倒角邊框高光與陰影
    ctx.fillStyle = '#223245';
    ctx.fillRect(x, y, size, 2);
    ctx.fillRect(x, y, 2, size);
    ctx.fillStyle = '#060a0f';
    ctx.fillRect(x, y + size - 2, size, 2);
    ctx.fillRect(x + size - 2, y, 2, size);

    // 牆面複合裝甲板橫向刻槽
    ctx.fillStyle = '#182433';
    ctx.fillRect(x + 4, y + 6, size - 8, 4);
    ctx.fillRect(x + 4, y + size / 2 - 2, size - 8, 4);
    ctx.fillRect(x + 4, y + size - 10, size - 8, 4);

    // 裝甲鉚釘
    ctx.fillStyle = '#3a4f68';
    ctx.fillRect(x + 5, y + 7, 2, 2);
    ctx.fillRect(x + size - 7, y + 7, 2, 2);
    ctx.fillRect(x + 5, y + size - 9, 2, 2);
    ctx.fillRect(x + size - 7, y + size - 9, 2, 2);

    // 高壓管線／導線管路 (Conduit line)
    ctx.fillStyle = '#0e2a38';
    ctx.fillRect(x, y + size / 2 - 1, size, 2);
    ctx.fillStyle = '#00ffee';
    ctx.shadowColor = '#00ffee';
    ctx.shadowBlur = 4;
    ctx.fillRect(x + 8, y + size / 2 - 1, 4, 2);
    ctx.fillRect(x + size - 12, y + size / 2 - 1, 4, 2);
    ctx.shadowBlur = 0;

    // 霓虹告示燈條 (Neon Wall Accent)
    const neonPulse = 0.7 + 0.3 * Math.sin(time * 0.003 + (x + y) * 0.1);
    ctx.fillStyle = `rgba(255, 0, 110, ${neonPulse})`;
    ctx.shadowColor = '#ff006e';
    ctx.shadowBlur = 6;
    ctx.fillRect(x + 8, y + 3, size - 16, 2);
    ctx.shadowBlur = 0;

    // 警示斜紋 (底部警戒帶)
    const stripeW = 4;
    for (let s = 0; s < size; s += stripeW * 2) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(x + s, y + size - 3, stripeW, 2);
      ctx.fillStyle = '#111';
      ctx.fillRect(x + s + stripeW, y + size - 3, stripeW, 2);
    }
  } else if (kind === 'FORCEFIELD') {
    // 高能電漿力場柵欄 (High-Energy Plasma Barrier)
    ctx.fillStyle = 'rgba(0, 15, 30, 0.4)';
    ctx.fillRect(x, y, size, size);

    // 上下金屬發射極基座
    ctx.fillStyle = '#222834';
    ctx.fillRect(x + 2, y, size - 4, 4);
    ctx.fillRect(x + 2, y + size - 4, size - 4, 4);
    ctx.fillStyle = '#00ffee';
    ctx.fillRect(x + size / 2 - 3, y + 2, 6, 2);
    ctx.fillRect(x + size / 2 - 3, y + size - 4, 6, 2);

    // 電漿半透明力場背景光暈
    const pAlpha = 0.25 + 0.15 * Math.sin(time * 0.008);
    ctx.fillStyle = `rgba(0, 230, 255, ${pAlpha})`;
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8);

    // 動態電漿電弧 (Multi-frequency plasma wave)
    const wave1 = Math.sin(time * 0.009 + y * 0.3) * (size * 0.2);
    const wave2 = Math.cos(time * 0.012 + y * 0.25) * (size * 0.15);

    ctx.strokeStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + size / 2 + wave1, y + 4);
    ctx.lineTo(x + size / 2 + wave2, y + size / 2);
    ctx.lineTo(x + size / 2 - wave1, y + size - 4);
    ctx.stroke();

    // 紫色次頻率閃電
    ctx.strokeStyle = 'rgba(190, 80, 255, 0.85)';
    ctx.shadowColor = '#be50ff';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + size / 2 - wave2, y + 4);
    ctx.lineTo(x + size / 2 + wave1 * 0.7, y + size * 0.7);
    ctx.lineTo(x + size / 2 + wave2, y + size - 4);
    ctx.stroke();
    ctx.shadowBlur = 0;
  } else if (kind === 'TERMINAL') {
    // 綠屏 CRT 終端機台 (Cyber Terminal Console)
    ctx.fillStyle = '#141c26';
    ctx.fillRect(x, y, size, size);

    // 外殼倒角金屬框
    ctx.fillStyle = '#263445';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // CRT 綠色螢光內螢幕
    ctx.fillStyle = '#02160a';
    ctx.fillRect(x + 5, y + 5, size - 10, size * 0.55);

    // CRT 螢幕光暈與掃描線
    ctx.fillStyle = '#00ff66';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 6;
    ctx.fillRect(x + 7, y + 8, size * 0.5, 2);
    ctx.fillRect(x + 7, y + 13, size * 0.65, 2);
    ctx.fillRect(x + 7, y + 18, size * 0.35, 2);

    if (Math.sin(time * 0.01) > 0) {
      ctx.fillRect(x + 7 + size * 0.38, y + 18, 3, 3);
    }
    ctx.shadowBlur = 0;

    // 操作鍵盤區台面
    ctx.fillStyle = '#0a1017';
    ctx.fillRect(x + 5, y + size * 0.65, size - 10, size * 0.28);

    // 按鍵燈號
    ctx.fillStyle = '#00ccff';
    ctx.fillRect(x + 7, y + size * 0.7, size - 14, 2);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(x + 7, y + size * 0.78, 4, 2);
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(x + 13, y + size * 0.78, 4, 2);
  } else if (kind === 'DOOR_CLOSED') {
    // 重裝氣密隔離門 (關閉)
    ctx.fillStyle = '#1c212a';
    ctx.fillRect(x, y, size, size);

    // 左右門框
    ctx.fillStyle = '#2d3744';
    ctx.fillRect(x, y, 4, size);
    ctx.fillRect(x + size - 4, y, 4, size);

    // 門板加強鋼板肋條
    ctx.fillStyle = '#262d38';
    ctx.fillRect(x + 5, y + 4, size - 10, size - 8);

    // 中縫隔離槽
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(x + size / 2 - 1, y + 4, 2, size - 8);

    // 紅色鎖定安全光標
    const lockGlow = 0.7 + 0.3 * Math.sin(time * 0.005);
    ctx.fillStyle = `rgba(255, 30, 50, ${lockGlow})`;
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 8;
    ctx.fillRect(x + size / 2 - 3, y + size / 2 - 3, 6, 6);
    ctx.shadowBlur = 0;

    // 警戒黃黑斜標
    ctx.fillStyle = '#e5a00d';
    ctx.fillRect(x + 6, y + 6, 4, 2);
    ctx.fillRect(x + size - 10, y + 6, 4, 2);
    ctx.fillRect(x + 6, y + size - 8, 4, 2);
    ctx.fillRect(x + size - 10, y + size - 8, 4, 2);
  } else if (kind === 'DOOR_OPEN') {
    // 重裝氣密隔離門 (開啟狀態)
    ctx.fillStyle = '#0a1017';
    ctx.fillRect(x, y, size, size);

    // 收攏在兩側的門板
    ctx.fillStyle = '#2b3644';
    ctx.fillRect(x, y + 2, 4, size - 4);
    ctx.fillRect(x + size - 4, y + 2, 4, size - 4);

    // 地面過道軌道
    ctx.fillStyle = '#131e29';
    ctx.fillRect(x + 5, y + size / 2 - 3, size - 10, 6);

    // 綠色通行指示光帶
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 5;
    ctx.fillRect(x + 1, y + 3, 2, size - 6);
    ctx.fillRect(x + size - 3, y + 3, 2, size - 6);
    ctx.shadowBlur = 0;
  } else if (kind === 'REBEL_CACHE') {
    // 反抗軍補給箱
    ctx.fillStyle = '#282015';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#3d301f';
    ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
    // 橘色反抗軍噴漆標誌
    ctx.fillStyle = '#ff7700';
    ctx.shadowColor = '#ff7700';
    ctx.shadowBlur = 5;
    ctx.fillRect(x + size / 2 - 4, y + size / 2 - 4, 8, 8);
    ctx.shadowBlur = 0;
  } else if (kind === 'EXIT') {
    // 出口／通風格柵
    ctx.fillStyle = '#101a14';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#00ff99';
    ctx.shadowColor = '#00ff99';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + 6);
    ctx.lineTo(x + size - 6, y + size / 2);
    ctx.lineTo(x + 6, y + size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (kind === 'ELEVATOR') {
    // 穿梭升降電梯 (Transit Elevator)
    ctx.fillStyle = '#08101a';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
    const pulse = 0.6 + 0.4 * Math.sin(time * 0.006);
    ctx.fillStyle = 'rgba(0, 240, 255, ' + pulse * 0.3 + ')';
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
    // 箭頭
    ctx.fillStyle = '#00f0ff';
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + 6);
    ctx.lineTo(x + size - 8, y + size / 2);
    ctx.lineTo(x + size / 2 + 3, y + size / 2);
    ctx.lineTo(x + size / 2 + 3, y + size - 6);
    ctx.lineTo(x + size / 2 - 3, y + size - 6);
    ctx.lineTo(x + size / 2 - 3, y + size / 2);
    ctx.lineTo(x + 8, y + size / 2);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'CONVEYOR') {
    // 工廠動態傳送帶 (Industrial Conveyor Belt)
    ctx.fillStyle = '#12161c';
    ctx.fillRect(x, y, size, size);

    // 雙色警示邊框 (黃黑斜紋)
    const borderW = 3;
    for (let s = 0; s < size; s += 6) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(x + s, y, 3, borderW);
      ctx.fillRect(x + s, y + size - borderW, 3, borderW);
      ctx.fillStyle = '#111';
      ctx.fillRect(x + s + 3, y, 3, borderW);
      ctx.fillRect(x + s + 3, y + size - borderW, 3, borderW);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(x, y + s, borderW, 3);
      ctx.fillRect(x + size - borderW, y + s, borderW, 3);
      ctx.fillStyle = '#111';
      ctx.fillRect(x, y + s + 3, borderW, 3);
      ctx.fillRect(x + size - borderW, y + s + 3, borderW, 3);
    }

    // 動態滾動黃黑齒軌
    const offset = Math.floor((time * 0.04) % 8);
    ctx.fillStyle = '#222d38';
    for (let tx = -8 + offset; tx < size; tx += 8) {
      ctx.fillRect(x + tx, y + 4, 4, size - 8);
    }

    // 動態滾動箭頭條紋
    const arrowOffset = Math.floor((time * 0.06) % 12);
    ctx.fillStyle = '#ffaa00';
    for (let ay = -12 + arrowOffset; ay < size; ay += 12) {
      ctx.beginPath();
      ctx.moveTo(x + size / 2 - 4, y + ay + 6);
      ctx.lineTo(x + size / 2 + 4, y + ay + 6);
      ctx.lineTo(x + size / 2, y + ay);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'TURRET') {
    // 自動防衛砲塔 (Automated Laser Turret)
    ctx.fillStyle = '#10141a';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#2d181e';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'BIO_TREE') {
    // 公園仿生樹 (Bio-Synthetic Tree)
    ctx.fillStyle = '#0b121a';
    ctx.fillRect(x, y, size, size);

    // 金屬樹幹
    ctx.fillStyle = '#3a4a5b';
    ctx.fillRect(x + size / 2 - 2, y + size * 0.4, 4, size * 0.5);
    ctx.fillStyle = '#5a738e';
    ctx.fillRect(x + size / 2 - 1, y + size * 0.4, 2, size * 0.5);

    // 發光青綠脈衝樹冠
    const treePulse = 0.6 + 0.4 * Math.sin(time * 0.004 + (x + y) * 0.05);
    ctx.fillStyle = `rgba(0, 255, 150, ${treePulse * 0.5})`;
    ctx.shadowColor = '#00ff96';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.3, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // 湖水藍內核
    ctx.fillStyle = `rgba(0, 180, 255, ${treePulse * 0.6})`;
    ctx.shadowColor = '#00b4ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.3, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 樹根金屬錨點
    ctx.fillStyle = '#2d3a48';
    ctx.fillRect(x + size * 0.3, y + size * 0.85, size * 0.4, 3);
  } else if (kind === 'PARK_WATER') {
    // 生態水池 (Eco Water Pool)
    ctx.fillStyle = '#0a1a2a';
    ctx.fillRect(x, y, size, size);

    // 深藍水面
    ctx.fillStyle = '#0d2840';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // 同心波紋隨 time 波動
    const ripplePhase = (time * 0.003) % 1;
    for (let r = 0; r < 3; r++) {
      const rippleR = ((ripplePhase + r / 3) % 1) * size * 0.45;
      const rippleAlpha = 0.5 * (1 - rippleR / (size * 0.45));
      ctx.strokeStyle = `rgba(0, 200, 255, ${rippleAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, rippleR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 水面高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.15, 2);
  } else if (kind === 'VENDOR_STALL') {
    // 商店街拉麵/晶片攤位 (Vendor Stall)
    ctx.fillStyle = '#1a1218';
    ctx.fillRect(x, y, size, size);

    // 紅紫霓虹遮陽棚
    const stallPulse = 0.7 + 0.3 * Math.sin(time * 0.005 + x * 0.1);
    ctx.fillStyle = `rgba(255, 0, 110, ${stallPulse * 0.6})`;
    ctx.shadowColor = '#ff006e';
    ctx.shadowBlur = 6;
    ctx.fillRect(x + 2, y + 2, size - 4, 6);
    ctx.fillStyle = `rgba(180, 50, 255, ${stallPulse * 0.6})`;
    ctx.shadowColor = '#b432ff';
    ctx.fillRect(x + 2, y + 8, size - 4, 4);
    ctx.shadowBlur = 0;

    // 發光店面工作檯
    ctx.fillStyle = '#2d1e18';
    ctx.fillRect(x + 4, y + size * 0.5, size - 8, size * 0.35);
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 4;
    ctx.fillRect(x + 6, y + size * 0.55, size - 12, 3);
    ctx.shadowBlur = 0;

    // 攤位支柱
    ctx.fillStyle = '#3a2a20';
    ctx.fillRect(x + 4, y + 12, 3, size * 0.38);
    ctx.fillRect(x + size - 7, y + 12, 3, size * 0.38);
  } else if (kind === 'SERVER_RACK') {
    // 機房伺服器機櫃 (Server Rack)
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(x, y, size, size);

    // 深色機殼
    ctx.fillStyle = '#1a2230';
    ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
    ctx.fillStyle = '#2d3a48';
    ctx.fillRect(x + 5, y + 5, size - 10, size - 10);

    // 多彩狀態矩陣 LED (隨 time 閃爍)
    const ledColors = ['#00ff66', '#00f0ff', '#ffaa00', '#ff1e32', '#b432ff'];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const ledIndex = (row * 3 + col + Math.floor(time * 0.002)) % ledColors.length;
        const ledBlink = Math.sin(time * 0.01 + row * 1.5 + col * 2.3) > -0.3;
        if (ledBlink) {
          ctx.fillStyle = ledColors[ledIndex];
          ctx.shadowColor = ledColors[ledIndex];
          ctx.shadowBlur = 3;
          ctx.fillRect(x + 8 + col * 8, y + 8 + row * 8, 4, 4);
          ctx.shadowBlur = 0;
        }
      }
    }

    // 機櫃通風孔
    ctx.fillStyle = '#0d1218';
    ctx.fillRect(x + 6, y + size - 12, size - 12, 3);
    ctx.fillRect(x + 6, y + size - 8, size - 12, 3);
  } else if (kind === 'STEAM_VENT') {
    // 暗巷蒸氣格柵 (Steam Vent Grate)
    ctx.fillStyle = '#0d1118';
    ctx.fillRect(x, y, size, size);

    // 地面鋼鐵孔網
    ctx.fillStyle = '#1a222c';
    ctx.fillRect(x + 4, y + 4, size - 8, size - 8);
    ctx.fillStyle = '#0a0e14';
    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        ctx.fillRect(x + 7 + gx * 7, y + 7 + gy * 7, 4, 4);
      }
    }

    // 隨 time 浮現向上淡化蒸氣白霧
    const steamPhase = (time * 0.002) % 1;
    for (let s = 0; s < 3; s++) {
      const steamY = y + size * 0.6 - ((steamPhase + s / 3) % 1) * size * 0.5;
      const steamAlpha = 0.3 * (1 - (y + size * 0.6 - steamY) / (size * 0.5));
      const steamX = x + size / 2 + Math.sin(time * 0.003 + s * 2) * size * 0.15;
      ctx.fillStyle = `rgba(200, 220, 240, ${steamAlpha})`;
      ctx.beginPath();
      ctx.arc(steamX, steamY, size * 0.12 + s * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'REBEL_BARRICADE') {
    // 反抗軍防禦掩體 (Rebel Barricade)
    ctx.fillStyle = '#1a1510';
    ctx.fillRect(x, y, size, size);

    // 加固合金防爆沙包
    ctx.fillStyle = '#3d301f';
    ctx.fillRect(x + 3, y + size * 0.3, size - 6, size * 0.5);
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(x + 5, y + size * 0.35, size - 10, size * 0.4);

    // 黃黑警示條紋
    for (let s = 0; s < size; s += 8) {
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(x + s, y + size * 0.3, 4, 4);
      ctx.fillStyle = '#111';
      ctx.fillRect(x + s + 4, y + size * 0.3, 4, 4);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(x + s, y + size * 0.76, 4, 4);
      ctx.fillStyle = '#111';
      ctx.fillRect(x + s + 4, y + size * 0.76, 4, 4);
    }

    // 合金鉚釘
    ctx.fillStyle = '#5a738e';
    ctx.fillRect(x + 6, y + size * 0.4, 3, 3);
    ctx.fillRect(x + size - 9, y + size * 0.4, 3, 3);
    ctx.fillRect(x + 6, y + size * 0.65, 3, 3);
    ctx.fillRect(x + size - 9, y + size * 0.65, 3, 3);
  } else {
    // FLOOR 賽博街景地磚 (Cyberpunk Street Pavement)
    ctx.fillStyle = '#0b121a';
    ctx.fillRect(x, y, size, size);

    // 地磚微邊縫
    ctx.strokeStyle = '#141f2b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);

    // 街道路面金屬水溝蓋／排水格柵紋理
    ctx.fillStyle = '#121d28';
    ctx.fillRect(x + size * 0.35, y + size * 0.35, size * 0.3, size * 0.3);
    ctx.fillStyle = '#1b2a3a';
    ctx.fillRect(x + size * 0.38, y + size * 0.42, size * 0.24, 2);
    ctx.fillRect(x + size * 0.38, y + size * 0.54, size * 0.24, 2);

    // 地底發光導光纖維管線微光
    ctx.fillStyle = 'rgba(0, 180, 255, 0.08)';
    ctx.fillRect(x, y + size - 1, size, 1);
  }

  ctx.restore();
}

export function drawPlayerSprite(
  ctx: CanvasRenderingContext2D,
  player: Player,
  x: number,
  y: number,
  size: number,
  time: number = 0
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const facing = String((player as any)?.facing ?? 'right').toLowerCase();
  ctx.save();

  // 1. 地面柔和陰影 (Ambient Occlusion Shadow)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.35, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // 2. 戰術軍靴 (Tactical Boots)
  ctx.fillStyle = '#0d131a';
  ctx.fillRect(cx - size * 0.2, cy + size * 0.22, size * 0.14, size * 0.16);
  ctx.fillRect(cx + size * 0.06, cy + size * 0.22, size * 0.14, size * 0.16);
  ctx.fillStyle = '#1c2836';
  ctx.fillRect(cx - size * 0.18, cy + size * 0.34, size * 0.12, 2);
  ctx.fillRect(cx + size * 0.08, cy + size * 0.34, size * 0.12, 2);

  // 3. Cyberpunk 長版風衣／下擺 (Trenchcoat Duster)
  ctx.fillStyle = '#182433';
  const coatOffset = facing === 'left' ? size * 0.06 : facing === 'right' ? -size * 0.06 : 0;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.22, cy - size * 0.05);
  ctx.lineTo(cx + size * 0.22, cy - size * 0.05);
  ctx.lineTo(cx + size * 0.26 + coatOffset, cy + size * 0.28);
  ctx.lineTo(cx - size * 0.26 + coatOffset, cy + size * 0.28);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#223447';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. 防彈裝甲胸甲與戰術背心 (Tactical Armor Vest)
  ctx.fillStyle = '#26374a';
  ctx.fillRect(cx - size * 0.18, cy - size * 0.12, size * 0.36, size * 0.24);

  ctx.fillStyle = '#344b63';
  ctx.fillRect(cx - size * 0.14, cy - size * 0.08, size * 0.28, size * 0.16);
  ctx.fillStyle = '#141d26';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.04, size * 0.32, 3);
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(cx - 2, cy + size * 0.04, 4, 3);

  // 胸前動力核心指示燈 (Power Reactor LED)
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 5;
  ctx.fillRect(cx - 2, cy - size * 0.03, 4, 4);
  ctx.shadowBlur = 0;

  // 5. 頭部與戰術連帽 (Head & Tactical Hood)
  ctx.fillStyle = '#141c26';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.24, size * 0.19, 0, Math.PI * 2);
  ctx.fill();

  // 頭部面部膚色
  ctx.fillStyle = '#c8997a';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 6. 賽博光學戰術目鏡 (Cyber Visor)
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  const visorW = size * 0.26;
  const visorH = size * 0.08;
  const visorX = facing === 'left' ? cx - size * 0.18 : facing === 'right' ? cx - size * 0.08 : cx - visorW / 2;
  const visorY = cy - size * 0.25;
  ctx.fillRect(visorX, visorY, visorW, visorH);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(visorX + 2, visorY + 1, visorW - 4, 1.5);
  ctx.shadowBlur = 0;

  // 7. 武器與雷射瞄準線 (Weapon & Targeting Laser)
  if (player?.isWeaponDrawn) {
    const isLeft = facing === 'left';
    const gunX = isLeft ? cx - size * 0.42 : cx + size * 0.2;
    const gunY = cy - size * 0.04;
    const gunW = size * 0.24;
    const gunH = size * 0.08;

    ctx.fillStyle = '#1a232c';
    ctx.fillRect(gunX, gunY, gunW, gunH);
    ctx.fillStyle = '#3a4a5b';
    ctx.fillRect(isLeft ? gunX : gunX + gunW - 4, gunY + 2, 4, gunH - 4);

    const muzzleX = isLeft ? gunX : gunX + gunW;
    const muzzleY = gunY + gunH / 2;

    ctx.strokeStyle = 'rgba(255, 30, 50, 0.75)';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(muzzleX, muzzleY);
    ctx.lineTo(isLeft ? muzzleX - size * 0.5 : muzzleX + size * 0.5, muzzleY);
    ctx.stroke();

    ctx.fillStyle = '#ff1e32';
    ctx.fillRect(muzzleX - 1, muzzleY - 1, 3, 3);
    ctx.shadowBlur = 0;
  }

  // 8. 全像偽裝光環 (Holographic Disguise Ring)
  if (player?.isDisguised) {
    const shimmer = 0.5 + 0.4 * Math.sin(time * 0.007);
    ctx.strokeStyle = `rgba(180, 50, 255, ${shimmer})`;
    ctx.shadowColor = '#b432ff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - size * 0.35, cy - size * 0.45, size * 0.7, size * 0.9);

    ctx.fillStyle = 'rgba(220, 130, 255, 0.4)';
    const glitchY = cy - size * 0.3 + ((time * 0.05) % (size * 0.6));
    ctx.fillRect(cx - size * 0.35, glitchY, size * 0.7, 2);
    ctx.shadowBlur = 0;
  }

  // 9. 個人能量護盾泡泡 (Personal Deflector Shield)
  if (player?.equippedShield) {
    const shieldWave = 0.3 + 0.15 * Math.sin(time * 0.006);
    ctx.strokeStyle = `rgba(0, 220, 255, ${shieldWave})`;
    ctx.fillStyle = `rgba(0, 220, 255, ${shieldWave * 0.3})`;
    ctx.shadowColor = '#00dcff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// 殘骸金屬堆渲染 (Wreckage Scrap for Destroyed Bots)
export function drawRobotWreckageSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.save();

  // 燃燒焦黑油漬
  ctx.fillStyle = 'rgba(15, 10, 8, 0.7)';
  ctx.beginPath();
  ctx.arc(cx, cy + 4, size * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 扭曲金屬外殼廢鐵
  ctx.fillStyle = '#22252c';
  ctx.fillRect(cx - size * 0.25, cy - size * 0.1, size * 0.5, size * 0.25);
  ctx.fillStyle = '#3a3e48';
  ctx.fillRect(cx - size * 0.15, cy - size * 0.2, size * 0.3, size * 0.15);

  // 冒煙火星與斷線 (Glowing Embers)
  ctx.fillStyle = '#ff4400';
  ctx.shadowColor = '#ff4400';
  ctx.shadowBlur = 4;
  ctx.fillRect(cx - size * 0.1, cy, 3, 3);
  ctx.fillRect(cx + size * 0.12, cy - 2, 2, 2);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// 掉落物渲染 (能量電池 / 信用點晶片)
export function drawItemDropSprite(
  ctx: CanvasRenderingContext2D,
  itemType: string,
  x: number,
  y: number,
  size: number,
  time: number = 0
): void {
  const cx = x + size / 2;
  const cy = y + size / 2 + Math.sin(time * 0.005) * 3;
  ctx.save();

  if (itemType === 'ENERGY' || itemType === 'GADGET') {
    // 藍色能量電池 (Energy Cell)
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - 5, cy - 8, 10, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 3, cy - 6, 6, 4);
  } else {
    // 金色信用點數金鑰 (Credit Keycard / Chip)
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 6;
    ctx.fillRect(cx - 7, cy - 5, 14, 10);
    ctx.fillStyle = '#ffea66';
    ctx.fillRect(cx - 5, cy - 3, 10, 2);
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawRobotSprite(
  ctx: CanvasRenderingContext2D,
  robot: Robot,
  x: number,
  y: number,
  size: number,
  visible: boolean = true,
  time: number = 0
): void {
  // 若已摧毀，渲染金屬殘骸
  if (robot.isAlive === false) {
    drawRobotWreckageSprite(ctx, x, y, size);
    return;
  }

  const cx = x + size / 2;
  const cy = y + size / 2;
  const type = String(robot?.robotType ?? 'SCOUT_DRONE').toUpperCase();
  ctx.save();
  if (!visible) {
    ctx.globalAlpha = 0.4;
  }

  // 地面陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.35, size * 0.26, 0, Math.PI * 2);
  ctx.fill();

  if (type.includes('EXTERMINATOR')) {
    // EXTERMINATOR: 重型紅黑裝甲巨型首領
    const bossPulse = 0.6 + 0.4 * Math.sin(time * 0.006);
    const shieldR = size * 0.52 + Math.sin(time * 0.004) * size * 0.04;

    // 動態紅色相位護盾光暈
    const shieldGrad = ctx.createRadialGradient(cx, cy, size * 0.18, cx, cy, shieldR);
    shieldGrad.addColorStop(0, `rgba(255, 30, 50, ${0.08 * bossPulse})`);
    shieldGrad.addColorStop(0.65, `rgba(255, 30, 50, ${0.18 * bossPulse})`);
    shieldGrad.addColorStop(1, 'rgba(255, 30, 50, 0)');
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, shieldR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 60, 80, ${0.3 + 0.4 * bossPulse})`;
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, shieldR, 0, Math.PI * 2);
    ctx.stroke();

    const shieldPhase = (time * 0.0015) % (Math.PI * 2);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const segStart = shieldPhase + i * ((Math.PI * 2) / 3);
      ctx.beginPath();
      ctx.arc(cx, cy, shieldR * 0.92, segStart, segStart + 0.9);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 履帶裝甲基座
    const treadY = cy + size * 0.2;
    const treadH = size * 0.2;
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(cx - size * 0.4, treadY, size * 0.8, treadH);
    ctx.fillStyle = '#1a1f28';
    ctx.fillRect(cx - size * 0.36, treadY + 3, size * 0.72, treadH - 6);
    const treadOffset = Math.floor((time * 0.05) % 10);
    ctx.fillStyle = '#3a1018';
    for (let tx = -10 + treadOffset; tx < size * 0.72; tx += 10) {
      ctx.fillRect(cx - size * 0.36 + tx, treadY + 4, 5, treadH - 8);
    }
    ctx.fillStyle = '#ff1e32';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 4;
    ctx.fillRect(cx - size * 0.36, treadY + treadH - 4, size * 0.72, 2);
    ctx.shadowBlur = 0;

    // 重裝紅黑軀幹
    ctx.fillStyle = '#150a0d';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.32, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.26, cy - size * 0.24);
    ctx.lineTo(cx + size * 0.26, cy - size * 0.24);
    ctx.lineTo(cx + size * 0.32, cy + size * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2a1016';
    ctx.fillRect(cx - size * 0.22, cy - size * 0.2, size * 0.44, size * 0.38);
    ctx.fillStyle = '#3a1018';
    ctx.fillRect(cx - size * 0.18, cy - size * 0.16, size * 0.36, size * 0.3);

    // 胸甲警示與核心
    ctx.fillStyle = '#ff1e32';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 6;
    ctx.fillRect(cx - size * 0.18, cy - size * 0.12, size * 0.36, 3);
    ctx.fillRect(cx - 2, cy - size * 0.08, 4, size * 0.22);
    ctx.shadowBlur = 0;

    // 雙聯肩部電漿砲
    const shoulderY = cy - size * 0.3;
    const shoulderH = size * 0.2;
    ctx.fillStyle = '#10141a';
    ctx.fillRect(cx - size * 0.5, shoulderY, size * 0.24, shoulderH);
    ctx.fillRect(cx + size * 0.26, shoulderY, size * 0.24, shoulderH);
    ctx.fillStyle = '#3a1018';
    ctx.fillRect(cx - size * 0.48, shoulderY + 3, size * 0.2, shoulderH - 6);
    ctx.fillRect(cx + size * 0.28, shoulderY + 3, size * 0.2, shoulderH - 6);

    // 雙聯砲管
    const barrelH = size * 0.18;
    ctx.fillStyle = '#05070a';
    ctx.fillRect(cx - size * 0.46, shoulderY + size * 0.04, 4, barrelH);
    ctx.fillRect(cx - size * 0.4, shoulderY + size * 0.04, 4, barrelH);
    ctx.fillRect(cx + size * 0.32, shoulderY + size * 0.04, 4, barrelH);
    ctx.fillRect(cx + size * 0.38, shoulderY + size * 0.04, 4, barrelH);

    // 電漿充能口
    const plasmaPulse = 0.5 + 0.5 * Math.sin(time * 0.012);
    ctx.fillStyle = `rgba(0, 240, 255, ${0.5 + plasmaPulse * 0.5})`;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(cx - size * 0.46, shoulderY + shoulderH - size * 0.06, 4, 4);
    ctx.fillRect(cx - size * 0.4, shoulderY + shoulderH - size * 0.06, 4, 4);
    ctx.fillRect(cx + size * 0.32, shoulderY + shoulderH - size * 0.06, 4, 4);
    ctx.fillRect(cx + size * 0.38, shoulderY + shoulderH - size * 0.06, 4, 4);
    ctx.shadowBlur = 0;

    // 頭部與三重複合感測眼
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(cx - size * 0.2, cy - size * 0.42, size * 0.4, size * 0.18);
    ctx.fillStyle = '#1a1014';
    ctx.fillRect(cx - size * 0.18, cy - size * 0.4, size * 0.36, size * 0.14);

    const eyePulse = 0.7 + 0.3 * Math.sin(time * 0.01);
    ctx.fillStyle = `rgba(255, 20, 50, ${eyePulse})`;
    ctx.shadowColor = '#ff1432';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.34, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - size * 0.12, cy - size * 0.32, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + size * 0.12, cy - size * 0.32, size * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - size * 0.35, 2, 2);
    ctx.shadowBlur = 0;
  } else if (type.includes('SHOCK') || type.includes('ENFORCER')) {
    // SHOCK ENFORCER: 重裝雙足/履帶執法機器人
    // 1. 重型雙腿/履帶基座
    ctx.fillStyle = '#1c1b18';
    ctx.fillRect(cx - size * 0.3, cy + size * 0.18, size * 0.18, size * 0.2);
    ctx.fillRect(cx + size * 0.12, cy + size * 0.18, size * 0.18, size * 0.2);
    ctx.fillStyle = '#3a3528';
    ctx.fillRect(cx - size * 0.32, cy + size * 0.34, size * 0.22, 3);
    ctx.fillRect(cx + size * 0.1, cy + size * 0.34, size * 0.22, 3);

    // 2. 厚重裝甲軀幹 (Heavy Torso Chassis)
    ctx.fillStyle = '#2b271d';
    ctx.fillRect(cx - size * 0.26, cy - size * 0.18, size * 0.52, size * 0.4);

    // 3. 重型肩裝甲與警戒斜紋 (Hazard Pauldrons)
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(cx - size * 0.34, cy - size * 0.24, size * 0.16, size * 0.2);
    ctx.fillRect(cx + size * 0.18, cy - size * 0.24, size * 0.16, size * 0.2);
    ctx.fillStyle = '#111';
    ctx.fillRect(cx - size * 0.3, cy - size * 0.2, 4, size * 0.14);
    ctx.fillRect(cx + size * 0.24, cy - size * 0.2, 4, size * 0.14);

    // 4. 電擊前臂與高壓電極叉 (Shock Electrodes)
    ctx.fillStyle = '#4a4332';
    ctx.fillRect(cx - size * 0.38, cy - size * 0.05, size * 0.1, size * 0.25);
    ctx.fillRect(cx + size * 0.28, cy - size * 0.05, size * 0.1, size * 0.25);

    // 高壓電弧火花
    const sparkAlpha = 0.5 + 0.5 * Math.sin(time * 0.02);
    ctx.strokeStyle = `rgba(0, 240, 255, ${sparkAlpha})`;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.34, cy + size * 0.2);
    ctx.lineTo(cx - size * 0.3, cy + size * 0.26);
    ctx.moveTo(cx + size * 0.32, cy + size * 0.2);
    ctx.lineTo(cx + size * 0.36, cy + size * 0.26);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. 機械頭盔與紅色掃描感測眼 (Red Scanning Visor)
    ctx.fillStyle = '#1a1915';
    ctx.fillRect(cx - size * 0.16, cy - size * 0.32, size * 0.32, size * 0.16);

    const scanSweep = Math.sin(time * 0.008) * (size * 0.08);
    ctx.fillStyle = '#ff1e32';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 7;
    ctx.fillRect(cx - 3 + scanSweep, cy - size * 0.26, 6, 4);
    ctx.shadowBlur = 0;

  } else if (type.includes('HUNTER') || type.includes('KILLER')) {
    // HUNTER KILLER: 銳利三角掠食攻擊型機器人
    ctx.fillStyle = '#261218';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.36);
    ctx.lineTo(cx + size * 0.36, cy + size * 0.24);
    ctx.lineTo(cx, cy + size * 0.12);
    ctx.lineTo(cx - size * 0.36, cy + size * 0.24);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4a1e27';
    ctx.fillRect(cx - size * 0.38, cy - size * 0.12, size * 0.1, size * 0.36);
    ctx.fillRect(cx + size * 0.28, cy - size * 0.12, size * 0.1, size * 0.36);

    ctx.fillStyle = '#ff1e32';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 6;
    ctx.fillRect(cx - size * 0.35, cy + size * 0.24, 4, 4);
    ctx.fillRect(cx + size * 0.31, cy + size * 0.24, 4, 4);

    ctx.fillStyle = '#ff0044';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.1, size * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  } else if (type.includes('SERVICE') || type.includes('BOT')) {
    // SERVICE BOT: 工業維修型服務機器人
    ctx.fillStyle = '#3a3320';
    ctx.fillRect(cx - size * 0.22, cy - size * 0.2, size * 0.44, size * 0.45);
    ctx.fillStyle = '#ff9900';
    ctx.shadowColor = '#ff9900';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.26, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  } else {
    // SCOUT DRONE: 懸浮偵察無人機 (Quad-rotor Hover Drone)
    // 1. 四角懸浮動力翼爪 (Thruster Pods)
    ctx.fillStyle = '#17222e';
    ctx.fillRect(cx - size * 0.36, cy - size * 0.28, size * 0.16, size * 0.12);
    ctx.fillRect(cx + size * 0.2, cy - size * 0.28, size * 0.16, size * 0.12);
    ctx.fillRect(cx - size * 0.36, cy + size * 0.16, size * 0.16, size * 0.12);
    ctx.fillRect(cx + size * 0.2, cy + size * 0.16, size * 0.16, size * 0.12);

    // 藍色離子噴射尾焰
    const flame = Math.sin(time * 0.015) * 3;
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 5;
    ctx.fillRect(cx - size * 0.32, cy - size * 0.16, 4, 3 + flame);
    ctx.fillRect(cx + size * 0.26, cy - size * 0.16, 4, 3 + flame);
    ctx.fillRect(cx - size * 0.32, cy + size * 0.28, 4, 3 + flame);
    ctx.fillRect(cx + size * 0.26, cy + size * 0.28, 4, 3 + flame);
    ctx.shadowBlur = 0;

    // 2. 中央空氣力學主機身
    ctx.fillStyle = '#223242';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#374f68';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. 雙通訊天線
    ctx.strokeStyle = '#5a738e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.1, cy - size * 0.2);
    ctx.lineTo(cx - size * 0.18, cy - size * 0.38);
    ctx.moveTo(cx + size * 0.1, cy - size * 0.2);
    ctx.lineTo(cx + size * 0.18, cy - size * 0.38);
    ctx.stroke();

    // 4. 動態旋轉／脈衝紅色全知感測眼
    const eyePulse = 0.7 + 0.3 * Math.sin(time * 0.01);
    ctx.fillStyle = `rgba(255, 20, 50, ${eyePulse})`;
    ctx.shadowColor = '#ff1432';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 2, 2, 2);
    ctx.shadowBlur = 0;
  }

  // 警報狀態標記 (Alert Status Icon: ! or ?)
  const aiState = String((robot as any)?.aiState ?? 'patrol');
  if (aiState === 'chase' || aiState === 'attack') {
    ctx.fillStyle = '#ff1e32';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 6;
    ctx.font = `bold ${Math.round(size * 0.3)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('!', cx, cy - size * 0.38);
    ctx.shadowBlur = 0;
  } else if (aiState === 'investigate') {
    ctx.fillStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 6;
    ctx.font = `bold ${Math.round(size * 0.28)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('?', cx, cy - size * 0.38);
    ctx.shadowBlur = 0;
  }

  // 機器人上方戰術生命值血條
  const hpRatio = Math.max(0, Math.min(1, (robot.hp ?? 50) / (robot.maxHp ?? 50)));
  const barW = size * 0.6;
  const barH = 3;
  const barX = cx - barW / 2;
  const barY = y - 4;

  ctx.fillStyle = 'rgba(10, 15, 20, 0.85)';
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
  ctx.fillStyle = '#441111';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = hpRatio > 0.5 ? '#00ff66' : hpRatio > 0.25 ? '#ffcc00' : '#ff2233';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  // EMP Stun 電磁麻痺特效
  if ((robot.stunnedTurns ?? 0) > 0) {
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (time * 0.01 + i * (Math.PI / 2)) % (Math.PI * 2);
      const rad = size * 0.32;
      const ex = cx + Math.cos(angle) * rad;
      const ey = cy + Math.sin(angle) * rad;
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // STUNNED 標籤
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡STUNNED⚡', cx, barY - 6);
  }

  ctx.restore();
}

// 居民／反抗軍 NPC 角色繪製 (Resident / Rebel NPC Sprite)
export function drawNPCSprite(
  ctx: CanvasRenderingContext2D,
  npc: any,
  x: number,
  y: number,
  size: number,
  visible: boolean = true,
  time: number = 0
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const role = String(npc?.role || npc?.name || '').toUpperCase();
  const themeColor = String(npc?.avatarColor || (role.includes('MEDIC') ? '#00e5ff' : role.includes('LEADER') || role.includes('KIRA') ? '#ff6d00' : '#ffea00'));

  ctx.save();
  if (!visible) {
    ctx.globalAlpha = 0.4;
  }

  // 1. 地面柔和陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.35, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // 2. 雙腳與皮靴
  ctx.fillStyle = '#0f141a';
  ctx.fillRect(cx - size * 0.18, cy + size * 0.22, size * 0.12, size * 0.16);
  ctx.fillRect(cx + size * 0.06, cy + size * 0.22, size * 0.12, size * 0.16);

  // 3. 身體與上衣風衣
  if (role.includes('MEDIC') || role.includes('VANCE')) {
    // 醫官白藍戰術大褂
    ctx.fillStyle = '#1c2e35';
    ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.38);
    // 醫護十字標記
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.fillRect(cx - 1.5, cy - size * 0.05, 3, 9);
    ctx.fillRect(cx - 4.5, cy - size * 0.05 + 3, 9, 3);
    ctx.shadowBlur = 0;
  } else if (role.includes('LEADER') || role.includes('KIRA')) {
    // 反抗軍指揮官橘紅軍裝
    ctx.fillStyle = '#2d1e18';
    ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.38);
    // 亮橘色反抗軍肩帶
    ctx.fillStyle = '#ff6d00';
    ctx.shadowColor = '#ff6d00';
    ctx.shadowBlur = 4;
    ctx.fillRect(cx - size * 0.18, cy - size * 0.1, size * 0.36, 4);
    ctx.fillRect(cx + size * 0.08, cy - size * 0.06, 4, size * 0.25);
    ctx.shadowBlur = 0;
  } else {
    // 街頭情報商深色風衣
    ctx.fillStyle = '#222328';
    ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.38);
    ctx.fillStyle = '#443b2c';
    ctx.fillRect(cx - size * 0.14, cy - size * 0.06, size * 0.28, size * 0.2);
  }

  // 4. 頭部與髮型
  ctx.fillStyle = '#1e1612';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.24, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // 面部五官膚色
  ctx.fillStyle = '#dca27d';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // 5. 賽博光學目鏡或眼部特徵
  ctx.fillStyle = themeColor;
  ctx.shadowColor = themeColor;
  ctx.shadowBlur = 5;
  ctx.fillRect(cx - size * 0.08, cy - size * 0.24, size * 0.16, 3);
  ctx.shadowBlur = 0;

  // 6. 頭頂浮動交談提示 (TALK [T] Prompt)
  const bob = Math.sin(time * 0.005) * 2;
  const tagY = cy - size * 0.45 + bob;

  ctx.fillStyle = 'rgba(5, 15, 20, 0.85)';
  ctx.fillRect(cx - 24, tagY - 8, 48, 14);

  ctx.strokeStyle = themeColor;
  ctx.shadowColor = themeColor;
  ctx.shadowBlur = 4;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 24, tagY - 8, 48, 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TALK [T]', cx, tagY - 1);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// 戰術地面道具繪製 (Ground Item Sprite)
export function drawItemSprite(
  ctx: CanvasRenderingContext2D,
  item: any,
  x: number,
  y: number,
  size: number,
  visible: boolean = true,
  time: number = 0
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const type = String(item?.itemType || '').toUpperCase();
  const color = item?.iconColor || '#00ff88';

  ctx.save();
  if (!visible) {
    ctx.globalAlpha = 0.5;
  }

  // 1. 地面發光光暈
  const pulse = 0.6 + 0.4 * Math.sin(time * 0.006 + (item.x || 0));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.28, size * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = color;
  ctx.shadowBlur = 8 * pulse;

  if (type === 'MEDKIT') {
    // 奈米醫療包：軍規綠色外箱 + 白/綠十字
    ctx.fillStyle = '#0e2e1a';
    ctx.fillRect(cx - size * 0.22, cy - size * 0.16, size * 0.44, size * 0.34);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - size * 0.22, cy - size * 0.16, size * 0.44, size * 0.34);

    ctx.fillStyle = '#00ff66';
    ctx.fillRect(cx - 2, cy - size * 0.1, 4, size * 0.22);
    ctx.fillRect(cx - size * 0.11, cy - 2, size * 0.22, 4);
  } else if (type === 'BATTERY') {
    // 能量電芯：青色高能圓柱電池
    ctx.fillStyle = '#082530';
    ctx.fillRect(cx - size * 0.16, cy - size * 0.2, size * 0.32, size * 0.4);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - size * 0.16, cy - size * 0.2, size * 0.32, size * 0.4);

    // 電芯能量格
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx - size * 0.1, cy - size * 0.12, size * 0.2, 3);
    ctx.fillRect(cx - size * 0.1, cy - 1, size * 0.2, 3);
    ctx.fillRect(cx - size * 0.1, cy + size * 0.1, size * 0.2, 3);
  } else if (type === 'EMP_GRENADE') {
    // EMP 電磁脈衝手榴彈：紫藍色核心與環狀發光電弧
    ctx.fillStyle = '#22083a';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c77dff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#7b2cbf';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e0aaff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'DATA_SLATE') {
    // 故事數據晶片盤：全息青/金光澤的數據板
    ctx.fillStyle = '#081824';
    ctx.fillRect(cx - size * 0.22, cy - size * 0.16, size * 0.44, size * 0.32);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - size * 0.22, cy - size * 0.16, size * 0.44, size * 0.32);

    // 數據紋路
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(cx - size * 0.16, cy - size * 0.1, size * 0.32, 2);
    ctx.fillRect(cx - size * 0.16, cy - 2, size * 0.22, 2);
    ctx.fillRect(cx - size * 0.16, cy + size * 0.06, size * 0.28, 2);

    // 全息閃爍光點
    const holoPulse = 0.5 + 0.5 * Math.sin(time * 0.01);
    ctx.fillStyle = 'rgba(255, 234, 0, ' + holoPulse + ')';
    ctx.beginPath();
    ctx.arc(cx + size * 0.12, cy - size * 0.06, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 晶片／金鑰通行卡
    ctx.fillStyle = '#282005';
    ctx.fillRect(cx - size * 0.2, cy - size * 0.14, size * 0.4, size * 0.28);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - size * 0.2, cy - size * 0.14, size * 0.4, size * 0.28);

    ctx.fillStyle = color;
    ctx.fillRect(cx - size * 0.12, cy - size * 0.06, size * 0.12, size * 0.12);
  }

  // 浮動微光物品標籤
  const bob = Math.sin(time * 0.005 + (item.x || 0)) * 2;
  ctx.fillStyle = 'rgba(5, 10, 15, 0.75)';
  ctx.fillRect(cx - 20, cy - size * 0.38 + bob, 40, 12);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(cx - 20, cy - size * 0.38 + bob, 40, 12);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.name || 'ITEM', cx, cy - size * 0.38 + bob + 6);

  ctx.shadowBlur = 0;
  ctx.restore();
}

// 高科技電漿防爆氣閥鋼瓶 (Plasma Canister Hazard)
export function drawHazardSprite(
  ctx: CanvasRenderingContext2D,
  hazard: any,
  x: number,
  y: number,
  size: number,
  time: number = 0
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.save();

  // 地面柔和陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.34, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 鋼瓶底座
  ctx.fillStyle = '#1a222c';
  ctx.fillRect(cx - size * 0.28, cy + size * 0.22, size * 0.56, size * 0.12);
  ctx.fillStyle = '#2d3a48';
  ctx.fillRect(cx - size * 0.24, cy + size * 0.24, size * 0.48, 2);
  ctx.fillStyle = '#0d1218';
  ctx.fillRect(cx - size * 0.28, cy + size * 0.32, size * 0.56, 2);

  // 側邊閥門管線
  ctx.fillStyle = '#3a4a5b';
  ctx.fillRect(cx + size * 0.18, cy + size * 0.05, size * 0.12, size * 0.18);
  ctx.fillStyle = '#5a738e';
  ctx.fillRect(cx + size * 0.2, cy + size * 0.08, size * 0.08, 2);
  ctx.fillRect(cx + size * 0.2, cy + size * 0.16, size * 0.08, 2);

  // 鋼瓶瓶身
  const bodyW = size * 0.44;
  const bodyH = size * 0.56;
  const bodyX = cx - bodyW / 2;
  const bodyY = cy - bodyH / 2 + size * 0.02;
  const r = size * 0.12;

  ctx.fillStyle = '#243140';
  ctx.beginPath();
  ctx.moveTo(bodyX + r, bodyY);
  ctx.lineTo(bodyX + bodyW - r, bodyY);
  ctx.arcTo(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + r, r);
  ctx.lineTo(bodyX + bodyW, bodyY + bodyH - r);
  ctx.arcTo(bodyX + bodyW, bodyY + bodyH, bodyX + bodyW - r, bodyY + bodyH, r);
  ctx.lineTo(bodyX + r, bodyY + bodyH);
  ctx.arcTo(bodyX, bodyY + bodyH, bodyX, bodyY + bodyH - r, r);
  ctx.lineTo(bodyX, bodyY + r);
  ctx.arcTo(bodyX, bodyY, bodyX + r, bodyY, r);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#3d5268';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 瓶身警示斜紋 (Hazard stripes)
  ctx.save();
  ctx.clip();
  const stripeW = 6;
  for (let s = -bodyH; s < bodyW + bodyH; s += stripeW * 2) {
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(bodyX + s, bodyY);
    ctx.lineTo(bodyX + s + stripeW, bodyY);
    ctx.lineTo(bodyX + s + stripeW - bodyH, bodyY + bodyH);
    ctx.lineTo(bodyX + s - bodyH, bodyY + bodyH);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#111820';
    ctx.beginPath();
    ctx.moveTo(bodyX + s + stripeW, bodyY);
    ctx.lineTo(bodyX + s + stripeW * 2, bodyY);
    ctx.lineTo(bodyX + s + stripeW * 2 - bodyH, bodyY + bodyH);
    ctx.lineTo(bodyX + s + stripeW - bodyH, bodyY + bodyH);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 中央脈動電漿微光核心
  const pulse = 0.55 + 0.45 * Math.sin(time * 0.008 + (hazard?.x || 0) * 0.1);
  const coreR = size * 0.12 + pulse * size * 0.04;

  ctx.fillStyle = `rgba(0, 240, 255, ${0.25 + pulse * 0.35})`;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 10 * pulse;
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.02, coreR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.5})`;
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.02, coreR * 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 電漿微電弧
  ctx.strokeStyle = `rgba(0, 240, 255, ${0.5 + pulse * 0.4})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const arcOffset = Math.sin(time * 0.02) * size * 0.05;
  ctx.moveTo(cx - coreR, cy + size * 0.02 + arcOffset);
  ctx.lineTo(cx - coreR * 0.4, cy + size * 0.02 - arcOffset);
  ctx.lineTo(cx + coreR * 0.4, cy + size * 0.02 + arcOffset);
  ctx.lineTo(cx + coreR, cy + size * 0.02 - arcOffset);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 頂部減壓閥
  const valveY = bodyY - size * 0.1;
  ctx.fillStyle = '#3a4a5b';
  ctx.fillRect(cx - size * 0.08, valveY, size * 0.16, size * 0.12);
  ctx.fillStyle = '#5a738e';
  ctx.fillRect(cx - size * 0.05, valveY - size * 0.04, size * 0.1, size * 0.06);
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(cx - size * 0.02, valveY + size * 0.02, size * 0.04, size * 0.04);

  // 高壓警告標示
  ctx.fillStyle = `rgba(255, 30, 50, ${0.55 + 0.45 * Math.sin(time * 0.012)})`;
  ctx.shadowColor = '#ff1e32';
  ctx.shadowBlur = 6;
  ctx.font = `bold ${Math.max(8, Math.round(size * 0.16))}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', cx, valveY - size * 0.08);
  ctx.shadowBlur = 0;

  // 瓶身金屬高光
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(bodyX + 3, bodyY + 4, 3, bodyH - 8);

  ctx.restore();
}
