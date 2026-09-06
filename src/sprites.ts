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

export function drawRobotSprite(
  ctx: CanvasRenderingContext2D,
  robot: Robot,
  x: number,
  y: number,
  size: number,
  visible: boolean = true,
  time: number = 0
): void {
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

  if (type.includes('SHOCK') || type.includes('ENFORCER')) {
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

  ctx.restore();
}
