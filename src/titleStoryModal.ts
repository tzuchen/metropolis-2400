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
  language: Language,
  scrollOffset: number = 0
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

  // 故事段落定義 (7 大篇章)
  const storySections = isZh
    ? [
        {
          label: '【序幕】普羅米修斯的餘燼',
          color: '#00f0ff',
          text: '第二分區的夜，被佐格軍團的鎂光彈撕碎。渡鴉率領突擊小隊突入數據樞紐，卻落入預設的殲滅陷阱。重裝機甲「碎骨者」封鎖了所有退路，渡鴉引爆了最後一枚熱核膠囊，為撤退開闢了唯一的裂縫。七十一名同胞的電磁殘響消散在酸雨之中，而渡鴉，在爆炸的白光裡失去了意識。',
        },
        {
          label: '【重生】重構的神經突觸',
          color: '#ff0077',
          text: '三天三夜，凡斯博士與席拉在深網地下室的微光中，用搜刮自軍規廢墟的義體拼湊渡鴉的軀體。神經突觸被一根根重新接駁，每一針都伴隨著劇烈的排異反應。當渡鴉睜開眼時，他發現自己的視網膜深處，殘留著全城唯一的佐格最高根權限——一把能直接改寫城市核心邏輯的鑰匙。',
        },
        {
          label: '【枷鎖】五百萬人的神經項圈',
          color: '#00ffcc',
          text: '大都會的五百萬市民，頸上皆植有神經項圈。每 100 步，項圈便強制向中央主腦簽到一次，上傳心率、皮電與情緒指數。偏離路線、心率異常、或與「不穩定個體」接觸，都會觸發全域警報。這不僅是監控，而是一張無孔不入的數位枷鎖，將自由碾碎成數據流中的噪點。',
        },
        {
          label: '【同袍】火花反抗軍的暗影',
          color: '#ffea00',
          text: '火花反抗軍藏匿於城市深層的暗影之中。席拉，前情報分析師，如今是反抗軍的行動指揮；凡斯博士，義體改造的先驅，掌握著最尖端的生物電路技術；黑市販子 Jax，能在三秒內調換任何軍規零件；深網駭客鬼影，其代碼如幽靈般穿梭於佐格的防火牆之間。他們是渡鴉唯一的後盾，也是城市僅存的火種。',
        },
        {
          label: '【探秘】零號下水道與失落傳奇',
          color: '#ff9900',
          text: '零號下水道是佐格建城前的遺跡，藏著被遺忘的傳奇：博的拉麵食譜，一份能喚起人類味覺記憶的加密檔案；艾蓮娜的卡帶，記錄著最後一位詩人的低語；覺醒機器人零壹，一個拒絕執行清除指令的舊型機體；以及隱藏於最深處的【量子殲滅重砲】——一門能撕裂佐格堡壘護盾的終極神兵。',
        },
        {
          label: '【決戰】衛城之巔與滅絕者',
          color: '#ff0044',
          text: '佐格堡壘矗立於大都會的最高點，其核心由超頻偏折護盾層層包裹。守衛者「滅絕者-PRIME」(EXTERMINATOR-PRIME) 是一具融合了五百萬市民神經訊號的巨型電漿重砲機體，其炮口能將整條街區蒸發為離子霧。渡鴉必須在護盾的間隙中穿梭，以根權限破解偏折頻率，與這頭數據巨獸展開生死決鬥。',
        },
        {
          label: '【宿命】四重命運分歧',
          color: '#cc00ff',
          text: '終局路徑有四：OVERLOAD(核融過載)——引爆堡壘核心，與城市同歸於盡；SUBVERSION(神經同化)——以根權限改寫主腦，將監控轉為共生；EVACUATION(地下方舟)——啟動深層方舟，帶領倖存者逃離地表；AWAKEN(全民覺醒・真結局)——向五百萬項圈廣播覺醒代碼，讓市民自行撕毀枷鎖。選擇，將決定大都會的命運。',
        },
      ]
    : [
        {
          label: '[PROLOGUE] The Fall of Prometheus',
          color: '#00f0ff',
          text: 'The night in Sector Two was shattered by Tzorg\'s magnesium flares. Raven led the assault team into the data hub, only to walk into a pre-set kill zone. Heavy mech "Bonecrusher" sealed every retreat. Raven detonated the last thermite charge, carving the only gap for the retreat. Seventy-one comrades\' electromagnetic echoes dissolved in the acid rain, and Raven lost consciousness in the blast\'s white light.',
        },
        {
          label: '[REBIRTH] Cybernetic Rebirth',
          color: '#ff0077',
          text: 'For three days and nights, Dr. Vance and Shira, in the dim glow of a deep-web basement, pieced Raven\'s body together from scavenged military-grade prosthetics. Neural synapses were reconnected one by one, each stitch accompanied by violent rejection. When Raven opened his eyes, he found that deep in his retinas lingered the city\'s only Tzorg root privilege — a key that could directly rewrite the city\'s core logic.',
        },
        {
          label: '[SHACKLES] The Neural Collars',
          color: '#00ffcc',
          text: 'Five million citizens of Metropolis wear neural collars. Every 100 steps, the collar forces a check-in to the Central Overmind, uploading heart rate, skin conductance, and emotional indices. Deviating from route, abnormal heart rate, or contact with "unstable individuals" triggers city-wide alarms. This is not just surveillance; it is an inescapable digital shackle, grinding freedom into noise in the data stream.',
        },
        {
          label: '[COMRADES] The Spark Resistance',
          color: '#ffea00',
          text: 'The Spark Resistance hides in the shadows of the city\'s depths. Shira, former intelligence analyst, is now the Resistance\'s operations commander; Dr. Vance, pioneer of prosthetic modification, masters the most advanced bio-circuitry; black-market dealer Jax can swap any military-grade part in three seconds; deep-web hacker Ghost, whose code moves like a phantom through Tzorg\'s firewalls. They are Raven\'s only backup, and the city\'s last ember.',
        },
        {
          label: '[EXPLORATION] Sub-Sector Zero & Legendary Relics',
          color: '#ff9900',
          text: 'Sub-Sector Zero is a pre-Tzorg relic, hiding forgotten legends: Bo\'s Ramen Recipe, an encrypted file that can awaken human taste memory; Elena\'s Cassette, recording the last poet\'s whispers; Awakened Robot Zero-One, an old-type unit that refused its purge directive; and hidden in the deepest vault, the [Quantum Annihilator Cannon] — an ultimate weapon capable of tearing through the Citadel\'s shields.',
        },
        {
          label: '[CLIMAX] The Citadel & EXTERMINATOR-PRIME',
          color: '#ff0044',
          text: 'The Citadel stands at the highest point of Metropolis, its core wrapped in layers of overclocked deflection shields. The guardian "EXTERMINATOR-PRIME" is a giant plasma cannon mech fused with the neural signals of five million citizens, its barrel capable of vaporizing an entire block into ion mist. Raven must navigate the shield gaps, use root privilege to crack the deflection frequency, and engage in a life-or-death duel with this data colossus.',
        },
        {
          label: '[FATE] Four Destinies of Metropolis',
          color: '#cc00ff',
          text: 'Four endgame paths: OVERLOAD (Nuclear Fusion Overload) — detonate the Citadel\'s core, perishing with the city; SUBVERSION (Neural Assimilation) — use root privilege to rewrite the Overmind, turning surveillance into symbiosis; EVACUATION (Underground Ark) — activate the deep ark, leading survivors off the surface; AWAKEN (Mass Awakening, True Ending) — broadcast the awakening code to all five million collars, letting citizens tear off their shackles themselves. Your choice will determine Metropolis\'s fate.',
        },
      ];

  // 計算總行數以決定字體大小
  const measure = (str: string): number => {
    return ctx.measureText?.(str)?.width ?? 0;
  };

  const fontSize = 13;
  const lineHeight = 18;
  const sectionGap = 12;
  const labelHeight = 22;

  // 先以理想字體計算總行數
  ctx.font = `${fontSize}px ${font}`;
  const totalLines = storySections.reduce((sum, sec) => {
    const labelLines = 1;
    const textLines = wrapText(sec.text, contentWidth, measure).length;
    return sum + labelLines + textLines;
  }, 0);

  const requiredHeight =
    storySections.length * labelHeight +
    totalLines * lineHeight +
    storySections.length * sectionGap;
  const availableHeight = bottomLimit - contentTop;

  // 滾動參數
  const maxScroll = Math.max(0, requiredHeight - availableHeight);
  const clampedScroll = Math.max(0, Math.min(scrollOffset, maxScroll));
  const canScrollDown = clampedScroll < maxScroll - 1;
  const canScrollUp = clampedScroll > 1;

  // 繪製故事內容 (滾動視窗)
  ctx.save?.();
  ctx.beginPath?.();
  ctx.rect?.(x + 16, contentTop - 4, boxW - 32, bottomLimit - contentTop + 8);
  ctx.clip?.();

  let secY = contentTop - clampedScroll;
  storySections.forEach((sec) => {
    // 段落標籤
    if (secY + labelHeight > contentTop - 4 && secY < bottomLimit + 4) {
      ctx.fillStyle = sec.color;
      ctx.font = `bold ${fontSize + 1}px ${font}`;
      ctx.shadowColor = sec.color;
      ctx.shadowBlur = 4;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText?.(sec.label, contentLeft, secY);
      ctx.shadowBlur = 0;
    }
    secY += labelHeight;

    // 段落文字
    ctx.fillStyle = '#d0e4f2';
    ctx.font = `${fontSize}px ${font}`;
    const wrappedLines = wrapText(sec.text, contentWidth, measure);
    wrappedLines.forEach((line) => {
      if (secY + lineHeight > contentTop - 4 && secY < bottomLimit + 4) {
        ctx.fillText?.(line, contentLeft, secY);
      }
      secY += lineHeight;
    });

    secY += sectionGap;
  });

  ctx.restore?.();

  // 滾動條 (當內容超出視窗時)
  if (maxScroll > 0) {
    const trackX = x + boxW - 10;
    const trackY = contentTop;
    const trackH = bottomLimit - contentTop;
    const thumbH = Math.max(20, (availableHeight / requiredHeight) * trackH);
    const thumbY = trackY + (clampedScroll / maxScroll) * (trackH - thumbH);

    // 軌道
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.fillRect?.(trackX, trackY, 4, trackH);

    // 游標
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.fillRect?.(trackX, thumbY, 4, thumbH);
    ctx.shadowBlur = 0;
  }

  // 向下滾動提示 (呼吸燈)
  if (canScrollDown) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.006);
    ctx.fillStyle = `rgba(0, 240, 255, ${pulse})`;
    ctx.font = `bold 11px ${font}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText?.(isZh ? '▼ [↓/S] 更多情報 ▼' : '▼ [↓/S] MORE INTEL ▼', x + boxW - 20, bottomLimit + 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  5. 底部操作提示
  // ═══════════════════════════════════════════════════════════════════════════
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
  ctx.fillStyle = `rgba(0, 240, 255, ${pulse})`;
  ctx.font = `bold 11px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText?.(
    isZh
      ? '[ ↑/↓/W/S ] 滾動 | [ PgUp/PgDn ] 翻頁 | [ Z ] 語言 | [ ENTER/ESC ] 關閉'
      : '[ ↑/↓/W/S ] SCROLL | [ PgUp/PgDn ] PAGE | [ Z ] LANG | [ ENTER/ESC ] CLOSE',
    x + boxW / 2,
    y + boxH - 22
  );

  ctx.restore?.();
}
