import type { Language } from './types';

// ─────────────────────────────────────────────────────────────────────────────
//  內部工具：確定性偽隨機 (Deterministic PRNG)
//  確保每一幀繪製結果穩定，避免閃爍，同時讓場景看起來動態。
// ─────────────────────────────────────────────────────────────────────────────
function hash1(n: number): number {
  let h = Math.imul(n | 0, 2654435761);
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 2246822519);
  h = (h ^ (h >>> 16)) | 0;
  return (h >>> 0) / 4294967295;
}

// ─────────────────────────────────────────────────────────────────────────────
//  智慧換行：支援 CJK 與拉丁文字
// ─────────────────────────────────────────────────────────────────────────────
function wrapText(
  text: string,
  maxWidth: number,
  measure: (str: string) => number
): string[] {
  if (!text) return [];

  const lines: string[] = [];
  const hasCJK = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(text);

  if (!hasCJK) {
    const words = text.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      if (measure(testLine) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  } else {
    let currentLine = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const testLine = currentLine + char;
      if (measure(testLine) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

// ─────────────────────────────────────────────────────────────────────────────
//  主函式：標題故事彈窗渲染器
// ─────────────────────────────────────────────────────────────────────────────
export function drawTitleStoryModal(
  width: number,
  height: number,
  ctx: any,
  now: number,
  language: Language
): void {
  ctx.save?.();
  const isZh = language === 'zh';
  const fontStack = '"Noto Sans TC", "Microsoft JhengHei", monospace';
  const font = isZh ? fontStack : 'monospace';

  // 彈窗尺寸：適配 800x500 與 960x600
  const boxW = Math.min(width - 40, 720);
  const boxH = Math.min(height - 40, 460);
  const x = (width - boxW) / 2;
  const y = (height - boxH) / 2;

  // ═══════════════════════════════════════════════════════════════════════════
  //  1. 半透明深黑賽博底板
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.fillStyle = 'rgba(2, 8, 14, 0.96)';
  ctx.fillRect?.(x, y, boxW, boxH);

  // 玻璃微光漸層
  const glassGrad = ctx.createLinearGradient?.(x, y, x, y + boxH);
  if (glassGrad) {
    glassGrad.addColorStop?.(0, 'rgba(0, 240, 255, 0.04)');
    glassGrad.addColorStop?.(0.5, 'rgba(0, 0, 0, 0)');
    glassGrad.addColorStop?.(1, 'rgba(0, 240, 255, 0.03)');
  }
  ctx.fillStyle = glassGrad || 'rgba(0,0,0,0)';
  ctx.fillRect?.(x, y, boxW, boxH);

  // ═══════════════════════════════════════════════════════════════════════════
  //  2. 霓虹邊框與四角戰術準心
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.strokeStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;
  ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);
  ctx.shadowBlur = 0;

  // 四角準心
  const cornerSize = 12;
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  // 左上
  ctx.beginPath?.();
  ctx.moveTo?.(x, y + cornerSize);
  ctx.lineTo?.(x, y);
  ctx.lineTo?.(x + cornerSize, y);
  ctx.stroke?.();
  // 右上
  ctx.beginPath?.();
  ctx.moveTo?.(x + boxW - cornerSize, y);
  ctx.lineTo?.(x + boxW, y);
  ctx.lineTo?.(x + boxW, y + cornerSize);
  ctx.stroke?.();
  // 左下
  ctx.beginPath?.();
  ctx.moveTo?.(x, y + boxH - cornerSize);
  ctx.lineTo?.(x, y + boxH);
  ctx.lineTo?.(x + cornerSize, y + boxH);
  ctx.stroke?.();
  // 右下
  ctx.beginPath?.();
  ctx.moveTo?.(x + boxW - cornerSize, y + boxH);
  ctx.lineTo?.(x + boxW, y + boxH);
  ctx.lineTo?.(x + boxW, y + boxH - cornerSize);
  ctx.stroke?.();

  // ═══════════════════════════════════════════════════════════════════════════
  //  3. 標題
  // ═══════════════════════════════════════════════════════════════════════════
  const titleY = y + 24;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 16px ${font}`;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#00f0ff';
  const title = isZh
    ? '// 普羅米修斯行動 // 任務簡報 // OPERATION PROMETHEUS BRIEFING //'
    : '// OPERATION PROMETHEUS // MISSION BRIEFING //';
  ctx.fillText?.(title, x + boxW / 2, titleY);
  ctx.shadowBlur = 0;

  // 標題下分隔線
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath?.();
  ctx.moveTo?.(x + 20, y + 40);
  ctx.lineTo?.(x + boxW - 20, y + 40);
  ctx.stroke?.();

  // ═══════════════════════════════════════════════════════════════════════════
  //  4. 故事內容區塊
  // ═══════════════════════════════════════════════════════════════════════════
  const contentLeft = x + 28;
  const contentRight = x + boxW - 28;
  const contentWidth = contentRight - contentLeft;
  const contentTop = y + 52;
  const bottomLimit = y + boxH - 44;

  // 故事段落定義
  const storySections = isZh
    ? [
        {
          label: '【背景】',
          color: '#00f0ff',
          text: '2400 年，大都會 (Metropolis) 已淪為佐格 (Tzorg) 自動化監控政權的鐵幕之下。每具市民頸上皆植有神經項圈，持續上傳生物訊號至中央主腦。任何偏離行為將觸發全域警報與機器人圍剿。',
        },
        {
          label: '【反抗軍】',
          color: '#ff0077',
          text: '佐格反抗軍僅存一條加密地下網絡，藏匿於城市深層。他們以終端機為節點，以數據為武器，持續瓦解監控基礎設施。',
        },
        {
          label: '【特工】',
          color: '#00ffcc',
          text: '你是「渡鴉」(Operative Raven)，前佐格核心工程師。你的神經介面剛被反抗軍修復，重新接入城市數據流。你的記憶碎片指向一個真相：佐格主腦正在準備最終清洗協議。',
        },
        {
          label: '【任務】',
          color: '#ffea00',
          text: '潛入佐格堡壘 (The Citadel)，奪取核心數據，關閉神經項圈廣播，解放大都會。三條終局路徑：過載自毀、病毒改寫、或軌道撤離。選擇將決定城市的命運。',
        },
      ]
    : [
        {
          label: '[BACKGROUND]',
          color: '#00f0ff',
          text: 'Year 2400. Metropolis has fallen under Tzorg\'s automated surveillance regime. Every citizen wears a neural collar, streaming biometric data to the Central Overmind. Any deviation triggers city-wide alarms and robotic assault.',
        },
        {
          label: '[RESISTANCE]',
          color: '#ff0077',
          text: 'The Tzorg Resistance maintains a single encrypted underground network, hidden in the city\'s depths. They use terminals as nodes and data as weapons, steadily dismantling the surveillance infrastructure.',
        },
        {
          label: '[OPERATIVE]',
          color: '#00ffcc',
          text: 'You are Operative Raven, a former Tzorg core engineer. Your neural link has just been restored by the Resistance, reconnecting you to the city\'s data stream. Fragments of your memory point to a truth: the Overmind is preparing its final purge protocol.',
        },
        {
          label: '[MISSION]',
          color: '#ffea00',
          text: 'Infiltrate the Citadel, recover the core data, shut down the neural collar broadcast, and free Metropolis. Three endgame paths await: Overload, Subversion, or Evacuation. Your choice will determine the city\'s fate.',
        },
      ];

  // 計算總行數以決定字體大小
  const measure = (str: string): number => {
    return ctx.measureText?.(str)?.width ?? 0;
  };

  const idealFontSize = 13;
  const idealLineHeight = 18;
  const sectionGap = 10;
  const labelHeight = 20;

  // 先以理想字體計算總行數
  ctx.font = `${idealFontSize}px ${font}`;
  const totalLines = storySections.reduce((sum, sec) => {
    const labelLines = 1;
    const textLines = wrapText(sec.text, contentWidth, measure).length;
    return sum + labelLines + textLines;
  }, 0);

  const requiredHeight =
    storySections.length * labelHeight +
    totalLines * idealLineHeight +
    storySections.length * sectionGap;
  const availableHeight = bottomLimit - contentTop;

  let fontSize = idealFontSize;
  let lineHeight = idealLineHeight;

  if (requiredHeight > availableHeight) {
    const scale = availableHeight / requiredHeight;
    fontSize = Math.max(8, Math.floor(idealFontSize * scale));
    lineHeight = Math.max(10, Math.floor(idealLineHeight * scale));
  }

  // 繪製故事內容
  ctx.save?.();
  ctx.beginPath?.();
  ctx.rect?.(x + 16, contentTop - 4, boxW - 32, bottomLimit - contentTop + 8);
  ctx.clip?.();

  let secY = contentTop;
  storySections.forEach((sec) => {
    // 段落標籤
    ctx.fillStyle = sec.color;
    ctx.font = `bold ${fontSize + 1}px ${font}`;
    ctx.shadowColor = sec.color;
    ctx.shadowBlur = 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText?.(sec.label, contentLeft, secY);
    ctx.shadowBlur = 0;
    secY += labelHeight;

    // 段落文字
    ctx.fillStyle = '#d0e4f2';
    ctx.font = `${fontSize}px ${font}`;
    const wrappedLines = wrapText(sec.text, contentWidth, measure);
    wrappedLines.forEach((line) => {
      ctx.fillText?.(line, contentLeft, secY);
      secY += lineHeight;
    });

    secY += sectionGap;
  });

  ctx.restore?.();

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. 底部關閉提示
  // ═══════════════════════════════════════════════════════════════════════════
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
  ctx.fillStyle = `rgba(0, 240, 255, ${pulse})`;
  ctx.font = `bold 13px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText?.(
    isZh
      ? '按 [ ENTER ] 或 [ ESC ] 關閉任務簡報'
      : 'PRESS [ ENTER ] OR [ ESC ] TO CLOSE BRIEFING',
    x + boxW / 2,
    y + boxH - 22
  );

  ctx.restore?.();
}
