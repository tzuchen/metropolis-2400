import type { Player, Robot } from './types';

export function drawTileSprite(
  ctx: CanvasRenderingContext2D,
  tile: any,
  x: number,
  y: number,
  size: number,
  visible: boolean = true,
  time: number = 0
): void {
  const t = Number(tile?.type ?? tile ?? 1);
  ctx.save();
  if (!visible) ctx.globalAlpha = 0.35;

  if (t === 2) { // WALL 裝甲鋼板牆面
    ctx.fillStyle = '#111e2e';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#223850';
    ctx.fillRect(x, y, size, 2);
    ctx.fillRect(x, y, 2, size);
    ctx.fillStyle = '#0a121c';
    ctx.fillRect(x, y + size - 2, size, 2);
    ctx.fillRect(x + size - 2, y, 2, size);
    ctx.fillStyle = '#192b3d';
    ctx.fillRect(x + 4, y + 6, size - 8, 3);
    ctx.fillRect(x + 4, y + 12, size - 8, 3);
  } else if (t === 5) { // FORCEFIELD 電漿力場
    const wave = Math.sin(time * 0.006 + y * 0.3);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = 'rgba(160, 250, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + size / 2 + wave * 4, y);
    ctx.lineTo(x + size / 2 - wave * 4, y + size);
    ctx.stroke();
  } else if (t === 6) { // TERMINAL 綠屏終端機
    ctx.fillStyle = '#16202c';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#003311';
    ctx.fillRect(x + 3, y + 3, size - 6, size - 10);
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(x + 5, y + 5, size - 10, 2);
    ctx.fillRect(x + 5, y + 9, size - 14, 2);
    ctx.fillStyle = '#00ccff';
    ctx.fillRect(x + 4, y + size - 5, size - 8, 2);
  } else if (t === 3) { // DOOR_CLOSED
    ctx.fillStyle = '#2b261f';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#ff2233';
    ctx.fillRect(x + size / 2 - 2, y + size / 2 - 2, 4, 4);
  } else if (t === 4) { // DOOR_OPEN
    ctx.fillStyle = '#0a1520';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(x + 1, y + size / 2 - 2, 2, 4);
  } else { // FLOOR 賽博地磚
    ctx.fillStyle = '#0c141d';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#142230';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
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
  ctx.save();

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.35, size * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#13283b';
  ctx.fillRect(cx - size * 0.22, cy - size * 0.1, size * 0.44, size * 0.45);
  ctx.fillStyle = '#1c3d5a';
  ctx.fillRect(cx - size * 0.16, cy - size * 0.05, size * 0.32, size * 0.3);

  ctx.fillStyle = '#223344';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(cx - size * 0.14, cy - size * 0.24, size * 0.28, size * 0.08);
  ctx.shadowBlur = 0;

  if (player?.isWeaponDrawn) {
    ctx.fillStyle = '#2a3b4c';
    ctx.fillRect(cx + size * 0.2, cy - size * 0.08, size * 0.22, size * 0.09);
    ctx.fillStyle = '#ff2233';
    ctx.shadowColor = '#ff2233';
    ctx.shadowBlur = 4;
    ctx.fillRect(cx + size * 0.42, cy - size * 0.06, 3, 3);
    ctx.shadowBlur = 0;
  }

  if (player?.isDisguised) {
    const shimmer = 0.5 + 0.3 * Math.sin(time * 0.006);
    ctx.strokeStyle = 'rgba(180, 50, 255, ' + shimmer + ')';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - size * 0.35, cy - size * 0.45, size * 0.7, size * 0.9);
  }

  if (player?.equippedShield) {
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
    ctx.stroke();
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
  const type = String(robot?.robotType ?? 'SCOUT_DRONE');
  ctx.save();
  if (!visible) ctx.globalAlpha = 0.4;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.35, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  if (type.includes('SHOCK')) {
    ctx.fillStyle = '#3a2e1d';
    ctx.fillRect(cx - size * 0.28, cy - size * 0.25, size * 0.56, size * 0.55);
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(cx - size * 0.32, cy - size * 0.35, size * 0.12, size * 0.2);
    ctx.fillRect(cx + size * 0.2, cy - size * 0.35, size * 0.12, size * 0.2);
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(cx - size * 0.15, cy - size * 0.1, size * 0.3, size * 0.08);
  } else if (type.includes('HUNTER')) {
    ctx.fillStyle = '#2e141a';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.35);
    ctx.lineTo(cx + size * 0.32, cy + size * 0.25);
    ctx.lineTo(cx - size * 0.32, cy + size * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(cx - size * 0.25, cy - size * 0.2, size * 0.08, size * 0.35);
    ctx.fillRect(cx + size * 0.17, cy - size * 0.2, size * 0.08, size * 0.35);
  } else {
    ctx.fillStyle = '#1c2834';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.3);
    ctx.lineTo(cx + size * 0.28, cy);
    ctx.lineTo(cx, cy + size * 0.3);
    ctx.lineTo(cx - size * 0.28, cy);
    ctx.closePath();
    ctx.fill();

    const thrust = Math.sin(time * 0.01) * 2;
    ctx.fillStyle = '#00aaff';
    ctx.fillRect(cx - size * 0.1, cy + size * 0.25, size * 0.2, 3 + thrust);

    const eyeBlink = 0.6 + 0.4 * Math.sin(time * 0.008);
    ctx.fillStyle = 'rgba(255, 30, 60, ' + eyeBlink + ')';
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.02, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  const hpRatio = Math.max(0, Math.min(1, (robot.hp ?? 50) / (robot.maxHp ?? 50)));
  ctx.fillStyle = '#330000';
  ctx.fillRect(cx - size * 0.3, y - 2, size * 0.6, 3);
  ctx.fillStyle = hpRatio > 0.5 ? '#00ff66' : '#ffcc00';
  ctx.fillRect(cx - size * 0.3, y - 2, size * 0.6 * hpRatio, 3);

  ctx.restore();
}
