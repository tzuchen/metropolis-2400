import type { Language } from './types';

export interface BreachReward {
  id: string;
  name: string;
  nameZh: string;
  sequence: string[];
  achieved: boolean;
  type: 'UNLOCK' | 'CREDITS' | 'EMP_SURGE';
}

export interface BreachSession {
  grid: string[][];
  size: number;
  buffer: string[];
  maxBuffer: number;
  cursorRow: number;
  cursorCol: number;
  activeAxis: 'ROW' | 'COL';
  activeAxisIndex: number;
  usedCells: Set<string>;
  rewards: BreachReward[];
  completed: boolean;
  success: boolean;
}

const HEX_POOL = ['1C', '55', 'BD', 'E9', '7A'];

export function createBreachSession(terminalId?: string): BreachSession {
  const size = 4;
  const grid: string[][] = [];
  for (let r = 0; r < size; r++) {
    const row: string[] = [];
    for (let c = 0; c < size; c++) {
      const idx = Math.floor(Math.random() * HEX_POOL.length);
      row.push(HEX_POOL[idx]);
    }
    grid.push(row);
  }

  // 確保題目一定有解：挑選前幾步生成合法的獎勵序列
  const target1 = [grid[0][1], grid[2][1]];
  const target2 = [grid[2][1], grid[2][3]];
  const target3 = [grid[0][0], grid[1][0], grid[1][2]];

  const rewards: BreachReward[] = [
    {
      id: 'rew-bypass',
      name: 'SECURITY OVERRIDE',
      nameZh: '安全權限解鎖',
      sequence: target1,
      achieved: false,
      type: 'UNLOCK',
    },
    {
      id: 'rew-siphon',
      name: 'CREDIT SIPHON (+80 CR)',
      nameZh: '搜刮信用點 (+80 CR)',
      sequence: target2,
      achieved: false,
      type: 'CREDITS',
    },
    {
      id: 'rew-emp',
      name: 'NETWORK OVERLOAD (EMP)',
      nameZh: '電網過載 (全區癱瘓 12 回合)',
      sequence: target3,
      achieved: false,
      type: 'EMP_SURGE',
    },
  ];

  return {
    grid,
    size,
    buffer: [],
    maxBuffer: 4,
    cursorRow: 0,
    cursorCol: 0,
    activeAxis: 'ROW',
    activeAxisIndex: 0,
    usedCells: new Set<string>(),
    rewards,
    completed: false,
    success: false,
  };
}

export function moveBreachCursor(session: BreachSession, dRow: number, dCol: number): void {
  if (session.completed) return;

  if (session.activeAxis === 'ROW') {
    // 當前只能在當前列中左右移動
    let newCol = session.cursorCol + dCol;
    if (newCol < 0) newCol = session.size - 1;
    if (newCol >= session.size) newCol = 0;
    session.cursorCol = newCol;
  } else {
    // 當前只能在當前行中上下移動
    let newRow = session.cursorRow + dRow;
    if (newRow < 0) newRow = session.size - 1;
    if (newRow >= session.size) newRow = 0;
    session.cursorRow = newRow;
  }
}

export function selectBreachCell(session: BreachSession): { completed: boolean; wonRewards: BreachReward[] } {
  if (session.completed) return { completed: true, wonRewards: [] };

  const key = `${session.cursorRow},${session.cursorCol}`;
  if (session.usedCells.has(key)) {
    return { completed: false, wonRewards: [] };
  }

  // 填入 Buffer
  const byte = session.grid[session.cursorRow][session.cursorCol];
  session.buffer.push(byte);
  session.usedCells.add(key);

  // 檢查是否達成獎勵序列
  const wonRewards: BreachReward[] = [];
  session.rewards.forEach((rew) => {
    if (!rew.achieved) {
      const seqStr = rew.sequence.join(',');
      const bufStr = session.buffer.join(',');
      if (bufStr.includes(seqStr)) {
        rew.achieved = true;
        wonRewards.push(rew);
      }
    }
  });

  // 切換橫縱軸
  if (session.activeAxis === 'ROW') {
    session.activeAxis = 'COL';
    session.activeAxisIndex = session.cursorCol;
  } else {
    session.activeAxis = 'ROW';
    session.activeAxisIndex = session.cursorRow;
  }

  // 若 Buffer 已滿或全達成
  const allAchieved = session.rewards.every((r) => r.achieved);
  if (session.buffer.length >= session.maxBuffer || allAchieved) {
    session.completed = true;
    session.success = session.rewards.some((r) => r.achieved);
    return { completed: true, wonRewards };
  }

  return { completed: false, wonRewards };
}

export function drawBreachModal(
  session: BreachSession,
  width: number,
  height: number,
  ctx: any,
  now: number,
  language: Language
): void {
  ctx.save?.();
  const isZh = language === 'zh';

  const boxW = Math.min(width - 40, 720);
  const boxH = Math.min(height - 60, 460);
  const x = (width - boxW) / 2;
  const y = (height - boxH) / 2;

  // 賽博空間黑綠矩陣風格
  ctx.fillStyle = 'rgba(2, 10, 8, 0.97)';
  ctx.fillRect?.(x, y, boxW, boxH);

  ctx.strokeStyle = '#00ff66';
  ctx.shadowColor = '#00ff66';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 2;
  ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

  // 頂部標題
  ctx.fillStyle = '#00ff66';
  ctx.font = 'bold 15px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const title = isZh
    ? '// 神經連線入侵協定 // BREACH PROTOCOL MATRIX //'
    : '// NEURAL BREACH PROTOCOL // CYBERSPACE MATRIX //';
  ctx.fillText?.(title, x + 20, y + 16);

  ctx.strokeStyle = 'rgba(0, 255, 102, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath?.();
  ctx.moveTo?.(x + 20, y + 38);
  ctx.lineTo?.(x + boxW - 20, y + 38);
  ctx.stroke?.();

  // 左側：4x4 代碼矩陣 (Code Matrix)
  const matrixX = x + 30;
  const matrixY = y + 60;
  const cellSize = 54;

  ctx.fillStyle = '#8aa095';
  ctx.font = '11px monospace';
  ctx.fillText?.(
    isZh
      ? `當前可選：【${session.activeAxis === 'ROW' ? `第 ${session.activeAxisIndex + 1} 列 (橫向)` : `第 ${session.activeAxisIndex + 1} 行 (縱向)`}】`
      : `ACTIVE AXIS: [ ${session.activeAxis === 'ROW' ? `ROW ${session.activeAxisIndex + 1}` : `COL ${session.activeAxisIndex + 1}`} ]`,
    matrixX,
    matrixY
  );

  for (let r = 0; r < session.size; r++) {
    for (let c = 0; c < session.size; c++) {
      const cx = matrixX + c * cellSize;
      const cy = matrixY + 24 + r * cellSize;
      const key = `${r},${c}`;
      const isUsed = session.usedCells.has(key);
      const isCursor = r === session.cursorRow && c === session.cursorCol;
      const isActiveAxis =
        session.activeAxis === 'ROW' ? r === session.activeAxisIndex : c === session.activeAxisIndex;

      // 格子背景
      if (isCursor) {
        ctx.fillStyle = 'rgba(0, 255, 102, 0.35)';
      } else if (isActiveAxis && !isUsed) {
        ctx.fillStyle = 'rgba(0, 255, 102, 0.12)';
      } else {
        ctx.fillStyle = 'rgba(10, 25, 18, 0.6)';
      }
      ctx.fillRect?.(cx, cy, cellSize - 6, cellSize - 6);

      // 格子邊框
      ctx.strokeStyle = isCursor ? '#00ff66' : isActiveAxis ? 'rgba(0, 255, 102, 0.4)' : '#1a3325';
      ctx.lineWidth = isCursor ? 2 : 1;
      ctx.strokeRect?.(cx, cy, cellSize - 6, cellSize - 6);

      // 十六進位字元
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isUsed) {
        ctx.fillStyle = '#2d5a3e';
        ctx.fillText?.('[--]', cx + (cellSize - 6) / 2, cy + (cellSize - 6) / 2);
      } else {
        ctx.fillStyle = isCursor ? '#ffffff' : isActiveAxis ? '#00ffaa' : '#5a8f72';
        ctx.fillText?.(session.grid[r][c], cx + (cellSize - 6) / 2, cy + (cellSize - 6) / 2);
      }
    }
  }

  // 右側：Buffer 緩衝區與目標序列
  const rightX = matrixX + session.size * cellSize + 40;
  const rightY = matrixY;

  // 1. Buffer 緩衝槽
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#00ffaa';
  ctx.font = 'bold 12px monospace';
  ctx.fillText?.(
    isZh ? `上傳緩衝槽 (${session.buffer.length}/${session.maxBuffer})` : `BUFFER QUEUE (${session.buffer.length}/${session.maxBuffer})`,
    rightX,
    rightY
  );

  const slotW = 44;
  for (let b = 0; b < session.maxBuffer; b++) {
    const bx = rightX + b * (slotW + 6);
    const by = rightY + 24;
    ctx.fillStyle = b < session.buffer.length ? 'rgba(0, 255, 102, 0.25)' : 'rgba(10, 30, 20, 0.6)';
    ctx.fillRect?.(bx, by, slotW, 36);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1;
    ctx.strokeRect?.(bx, by, slotW, 36);

    if (b < session.buffer.length) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText?.(session.buffer[b], bx + slotW / 2, by + 18);
    }
  }

  // 2. 目標序列列表 (Target Sequences)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffaa00';
  ctx.font = 'bold 12px monospace';
  ctx.fillText?.(isZh ? '待解碼目標序列 (TARGET DAEMONS)：' : 'TARGET DAEMON SEQUENCES:', rightX, rightY + 80);

  session.rewards.forEach((rew, idx) => {
    const ry = rightY + 104 + idx * 56;
    ctx.fillStyle = rew.achieved ? 'rgba(0, 255, 102, 0.15)' : 'rgba(20, 35, 25, 0.7)';
    ctx.fillRect?.(rightX, ry, boxW - rightX + x - 25, 46);

    ctx.strokeStyle = rew.achieved ? '#00ff88' : '#335544';
    ctx.lineWidth = 1;
    ctx.strokeRect?.(rightX, ry, boxW - rightX + x - 25, 46);

    ctx.fillStyle = rew.achieved ? '#00ff88' : '#e0f0e6';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    const rewTitle = isZh ? rew.nameZh : rew.name;
    ctx.fillText?.(rewTitle + (rew.achieved ? (isZh ? ' [已解鎖]' : ' [SOLVED]') : ''), rightX + 12, ry + 8);

    // 序列條
    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 13px monospace';
    ctx.fillText?.(rew.sequence.join('  '), rightX + 12, ry + 26);
  });

  // 底部按鍵提示與結果通知
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (session.completed) {
    ctx.fillStyle = session.success ? '#00ff88' : '#ff3344';
    ctx.font = 'bold 14px monospace';
    const statusText = session.success
      ? (isZh ? '入侵協定執行完畢！按 [ 空格 / ENTER ] 套用獎勵' : 'BREACH PROTOCOL SUCCESSFUL! PRESS [ ENTER ] TO APPLY')
      : (isZh ? '緩衝區溢位，入侵失敗！按 [ ESC / ENTER ] 退出' : 'BUFFER OVERFLOW! BREACH FAILED. PRESS [ ENTER ] TO EXIT');
    ctx.fillText?.(statusText, x + boxW / 2, y + boxH - 24);
  } else {
    ctx.fillStyle = `rgba(0, 255, 170, ${pulse})`;
    ctx.font = 'bold 11px monospace';
    ctx.fillText?.(
      isZh
        ? '[ 方向鍵 / WASD ] 移動光標    [ 空格 / ENTER ] 上傳代碼    [ ESC ] 中止入侵'
        : '[ ARROW / WASD ] NAVIGATE    [ SPACE / ENTER ] UPLOAD CODE    [ ESC ] ABORT',
      x + boxW / 2,
      y + boxH - 20
    );
  }

  ctx.restore?.();
}
