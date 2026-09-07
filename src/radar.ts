import type { SectorMap, Player, Robot, NPC, GroundItem, Language } from './types';

/**
 * Tactical Mini Radar and Orbital Full-Map Cartography renderer
 */
export function drawMiniRadar(
  width: number,
  map: SectorMap,
  player: Player,
  robots: Robot[],
  npcs: NPC[] | undefined,
  groundItems: GroundItem[] | undefined,
  visible: Set<string>,
  ctx: any,
  now: number,
  isFull: boolean = false,
  language: Language = 'zh'
): void {
  ctx.save?.();
  const radarW = isFull ? 120 : 100;
  const radarH = isFull ? 90 : 75;
  const rx = width - radarW - 12;
  const ry = 46;

  ctx.fillStyle = isFull ? 'rgba(3, 10, 18, 0.94)' : 'rgba(5, 12, 18, 0.85)';
  ctx.fillRect?.(rx, ry, radarW, radarH);

  ctx.strokeStyle = isFull ? '#00f0ff' : 'rgba(0, 229, 255, 0.4)';
  ctx.lineWidth = isFull ? 1.5 : 1;
  ctx.strokeRect?.(rx + 0.5, ry + 0.5, radarW - 1, radarH - 1);

  ctx.fillStyle = isFull ? '#ffea00' : '#00e5ff';
  ctx.font = 'bold 8px monospace';
  const titleText = isFull
    ? (language === 'zh' ? '全域測繪 // 完整小地圖' : 'ORBITAL RADAR // FULL')
    : (language === 'zh' ? '戰術雷達 // 即時探測' : 'RADAR // SEC-01');
  ctx.fillText?.(titleText, rx + 4, ry + 9);

  const mw = Number((map as any).width) || 40;
  const mh = Number((map as any).height) || 30;
  const scaleX = (radarW - 8) / mw;
  const scaleY = (radarH - 16) / mh;
  const ox = rx + 4;
  const oy = ry + 12;

  // 繪製地圖建築藍圖結構 (當全域小地圖開啟時繪製牆面、出入口梯子、力場、終端機)
  if (isFull && Array.isArray((map as any).tiles)) {
    const tiles = (map as any).tiles;
    for (let y = 0; y < mh; y++) {
      const row = tiles[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < mw; x++) {
        const t = row[x];
        // 牆壁 WALL (TileType.WALL = 2)
        if (t === 2 || String(t) === 'WALL') {
          ctx.fillStyle = 'rgba(0, 180, 255, 0.35)';
          ctx.fillRect?.(ox + x * scaleX, oy + y * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
        } else if (t === 9 || String(t) === 'ELEVATOR') {
          // 升降機 / 下水道梯子 (ELEVATOR = 9)
          ctx.fillStyle = '#00ff88';
          ctx.fillRect?.(ox + x * scaleX - 0.5, oy + y * scaleY - 0.5, Math.max(2, scaleX + 1), Math.max(2, scaleY + 1));
        } else if (t === 5 || String(t) === 'FORCEFIELD') {
          // 電漿力場 (FORCEFIELD = 5)
          ctx.fillStyle = 'rgba(255, 56, 85, 0.7)';
          ctx.fillRect?.(ox + x * scaleX, oy + y * scaleY, Math.max(1, scaleX), Math.max(1, scaleY));
        } else if (t === 6 || String(t) === 'TERMINAL') {
          // 終端機 (TERMINAL = 6)
          ctx.fillStyle = '#00e5ff';
          ctx.fillRect?.(ox + x * scaleX, oy + y * scaleY, Math.max(2, scaleX), Math.max(2, scaleY));
        }
      }
    }
  }

  // 地面物資黃點 (開啟全圖時即使不在視野也標示)
  if (Array.isArray(groundItems)) {
    groundItems.forEach((it) => {
      if (!it) return;
      const key = `${it.x},${it.y}`;
      if (!isFull && !visible.has(key)) return;
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect?.(ox + it.x * scaleX - 1, oy + it.y * scaleY - 1, 2, 2);
    });
  }

  // 居民反抗軍綠點
  if (Array.isArray(npcs)) {
    npcs.forEach((n) => {
      if (!n || !n.isAlive) return;
      const key = `${n.x},${n.y}`;
      if (!isFull && !visible.has(key)) return;
      ctx.fillStyle = '#00ffaa';
      ctx.fillRect?.(ox + n.x * scaleX - 1, oy + n.y * scaleY - 1, 2, 2);
    });
  }

  // 機器人紅點 (若被 EMP 癱瘓則顯示青色)
  if (Array.isArray(robots)) {
    robots.forEach((r) => {
      if (!r || !r.isAlive) return;
      const key = `${r.x},${r.y}`;
      if (!isFull && !visible.has(key)) return;
      const isStunned = (r.stunnedTurns ?? 0) > 0;
      ctx.fillStyle = isStunned ? '#00f0ff' : '#ff1744';
      ctx.fillRect?.(ox + r.x * scaleX - 1, oy + r.y * scaleY - 1, 2, 2);
    });
  }

  // 玩家青色閃爍點
  const pPulse = 0.5 + 0.5 * Math.sin(now * 0.01);
  ctx.fillStyle = 'rgba(0, 240, 255, ' + pPulse + ')';
  ctx.fillRect?.(ox + player.x * scaleX - 1.5, oy + player.y * scaleY - 1.5, 3, 3);

  ctx.restore?.();
}
