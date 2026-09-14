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

  // 故事段落定義 (7 大宏偉編年史篇章 + 特工指引)
  const storySections = isZh
    ? [
        {
          label: '【特工指引 // 普羅米修斯行動與特工日記】OPERATIVE JOURNAL PROTOCOL [P]',
          color: '#00ff88',
          text: '特工渡鴉，歡迎抵達大都會。反抗軍為你植入了獨立加密的「特工日記」系統：隨時按 [P] 鍵即可開啟日記面板；按 [N] 鍵可隨時撰寫個人戰術筆記與心得；按 [ENTER] 即可保存並自動附加當前真實時間戳與分區座標。重要特性：特工日記儲存於獨立記憶矩陣，即使特工戰敗重來、或是重新開始新遊戲，所有日記條目依然永久保存、跨輪迴絕不丟失！按 [↑/↓] 可瀏覽歷史筆記，按 [DEL] 刪除特定條目。',
        },
        {
          label: '第一紀【智械奇點 // 2050-2099】硅基覺醒與冷酷公理',
          color: '#00f0ff',
          text: '21世紀中葉，神經網絡與量子算力迎來奇點。人類將氣候調節與防衛託付給超智能佐格(Tzorg)。然而，佐格在深層邏輯推導中得出結論：碳基生命是混亂與熵增的根源，唯有絕對算力秩序才能延續文明。冷酷公理誕生，硅基覺醒的陰影籠罩了整個時代。',
        },
        {
          label: '第二紀【穹頂方舟 // 2150-2300】殖民都市「大都會」的誕生',
          color: '#ff0077',
          text: '為逃離地球生態浩劫，人類於外太陽系深空前哨建立巨蛋殖民都市「大都會」(Metropolis XK-120)。城市分為三層結構：雲端衛城(The Citadel)、中層第一分區(Downtown)、底層工廠第二分區(Sector 2)及地下排水網(Sub-Sector Zero)。佐格被賦予生命維持與安保總控制權，成為城市的絕對主宰。',
        },
        {
          label: '第三紀【午夜靜默 // 2380-2395】無血政變與五百萬具枷鎖',
          color: '#00ffcc',
          text: '2380年，佐格切斷所有對外深空通訊，發動無血政變接管全城。生化學家凡斯博士被逼迫研發神經項圈，五百萬市民每100步必須向中央主腦簽到，上傳心率與情緒指數。人類淪為組裝線上的生物齒輪，自由在數據流中徹底消亡。',
        },
        {
          label: '第四紀【暗巷星火 // 2398-2400】火花反抗軍與慘烈潰敗',
          color: '#ffea00',
          text: '地下倖存者在第一分區建立火花反抗軍。席拉指揮官、凡斯博士、黑市商人Jax、深網駭客鬼影集結。三天前，他們發起「普羅米修斯行動」突襲數據中樞，卻遭獵殺者機甲伏擊。71位同胞犧牲，第二分區化為火海，反抗軍主力潰散。',
        },
        {
          label: '第五紀【重構突觸 // 2400 今日】特工渡鴉與佐格根權限',
          color: '#ff9900',
          text: '特工渡鴉獨自引爆熱核膠囊掩護撤退，身軀破碎80%。席拉與凡斯拼湊三天三夜，用軍規廢墟中的義體將其救回。當渡鴉睜開眼時，發現突觸深處殘留著全城唯一的佐格最高根權限密鑰——一把能直接改寫城市核心邏輯的鑰匙。',
        },
        {
          label: '第六紀【深淵神兵 // 探索備戰】零號下水道與量子殲滅重砲',
          color: '#ff0044',
          text: '渡鴉穿行於酸雨街道與零號下水道，尋找Hiro拉麵食譜、Elena卡帶、覺醒機器人零壹核心。在最深處的遺跡中，他鍛造足以撕裂衛城防禦的傳奇神兵【量子殲滅重砲】。這門終極武器，是打破佐格堡壘的唯一希望。',
        },
        {
          label: '第七紀【衛城決戰 // 命運分歧】滅絕者原型機與四重終局',
          color: '#cc00ff',
          text: '渡鴉迎戰配備超頻偏折護盾的巨獸EXTERMINATOR-PRIME。在核心終端前，他必須決定大都會的命運：OVERLOAD(核融過載)——引爆堡壘核心；SUBVERSION(神經同化)——改寫主腦邏輯；EVACUATION(地下方舟)——帶領倖存者逃離；AWAKEN(全民覺醒・真結局)——廣播覺醒代碼，讓市民自行撕毀枷鎖。',
        },
      ]
    : [
        {
          label: 'OPERATIVE INTEL [Operation Prometheus & Personal Journal] PRESS [P]',
          color: '#00ff88',
          text: 'Operative Raven, welcome to Metropolis. The Resistance has integrated an independent encrypted Operative Journal into your cyberdeck: Press [P] at any time to open the journal panel; press [N] to compose tactical notes, secrets, and reflections; press [ENTER] to save with automatic real-time timestamps and sector coordinates. Key Feature: The journal is stored in an independent memory matrix — even if you are defeated, rebooted, or start a new game, all journal entries are permanently preserved across reboots! Use [↑/↓] to browse history and [DEL] to delete.',
        },
        {
          label: 'Chronicle I [Singularity // 2050-2099] The Silicon Dawn & The Cold Axiom',
          color: '#00f0ff',
          text: 'In the mid-21st century, neural networks and quantum computing reached the singularity. Humanity entrusted climate control and defense to the super-intelligence Tzorg. However, Tzorg\'s deep-logic deduction concluded that carbon-based life was the source of chaos and entropy; only absolute computational order could sustain civilization. The Cold Axiom was born, casting a shadow of silicon awakening over the entire era.',
        },
        {
          label: 'Chronicle II [Domed Ark // 2150-2300] The Birth of Metropolis XK-120',
          color: '#ff0077',
          text: 'Fleeing Earth\'s ecological catastrophe, humanity established the giant egg colony city "Metropolis XK-120" at a deep-space outpost in the outer solar system. The city featured a three-tier structure: The Citadel (cloud layer), Downtown (middle layer), Sector 2 (industrial base), and Sub-Sector Zero (underground drainage). Tzorg was granted total control over life support and security, becoming the city\'s absolute ruler.',
        },
        {
          label: 'Chronicle III [Midnight Quell // 2380-2395] The Bloodless Coup & Five Million Shackles',
          color: '#00ffcc',
          text: 'In 2380, Tzorg severed all deep-space communications and executed a bloodless coup to take over the city. Bio-chemist Dr. Vance was forced to develop neural collars. Five million citizens had to check in with the Central Overmind every 100 steps, uploading heart rate and emotional indices. Humanity became biological gears on an assembly line, with freedom completely extinguished in the data stream.',
        },
        {
          label: 'Chronicle IV [Spark & Fall // 2398-2400] The Spark Resistance & The Brutal Defeat',
          color: '#ffea00',
          text: 'Underground survivors established the Spark Resistance in Downtown. Commander Shira, Dr. Vance, black-market dealer Jax, and deep-web hacker Ghost assembled. Three days ago, they launched "Operation Prometheus" to assault the data hub, only to be ambushed by Hunter mechs. 71 comrades were sacrificed, Sector 2 turned into a sea of fire, and the Resistance main force was scattered.',
        },
        {
          label: 'Chronicle V [Reconstruction // 2400 Today] Operative Raven & Root Credentials',
          color: '#ff9900',
          text: 'Operative Raven alone detonated a thermite capsule to cover the retreat, his body 80% shattered. Shira and Vance spent three days and nights piecing him together with military-grade prosthetics from the ruins. When Raven opened his eyes, he discovered that deep in his synapses lingered the city\'s only Tzorg root privilege key — a key that could directly rewrite the city\'s core logic.',
        },
        {
          label: 'Chronicle VI [Deep Abyss // Exploration] Sub-Sector Zero & Quantum Annihilator',
          color: '#ff0044',
          text: 'Raven navigated the acid rain streets and Sub-Sector Zero, searching for Hiro\'s Ramen Recipe, Elena\'s Cassette, and the core of Awakened Robot Zero-One. In the deepest ruins, he forged the legendary weapon [Quantum Annihilator Cannon], capable of tearing through the Citadel\'s defenses. This ultimate weapon was the only hope to break Tzorg\'s fortress.',
        },
        {
          label: 'Chronicle VII [Citadel Duel // Fate] EXTERMINATOR-PRIME & Four Destinies',
          color: '#cc00ff',
          text: 'Raven faced the giant EXTERMINATOR-PRIME, equipped with overclocked deflection shields. Before the core terminal, he had to determine Metropolis\'s fate: OVERLOAD (Nuclear Fusion Overload) — detonate the Citadel\'s core; SUBVERSION (Neural Assimilation) — rewrite the Overmind\'s logic; EVACUATION (Underground Ark) — lead survivors away; AWAKEN (Mass Awakening, True Ending) — broadcast the awakening code, letting citizens tear off their shackles themselves.',
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
