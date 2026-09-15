import type { Language } from './types';
import { wrapText } from './textWrap';

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
    ? '// 特工任務簡報 // 大都會 2400 // OPERATIVE MISSION BRIEFING //'
    : '// OPERATIVE MISSION BRIEFING // METROPOLIS 2400 //';
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

  // 故事段落定義 (特工行動原則與日記使用指南)
  const storySections = isZh
    ? [
        {
          label: '【特工任務簡報 // 大都會生存指南】OPERATIVE BRIEFING // METROPOLIS 2400',
          color: '#00f0ff',
          text: '你是 Metropolis 2400 的一名特工。這座城市不會替你解釋一切；你必須從眼前畫面、人物、終端機、資料板，以及自己留下的日記中建立判斷。\n\n你只有當下看得見的世界。不要假設某條路、某扇門或某個人一定會帶你前進；嘗試、觀察結果，再修正想法。',
        },
        {
          label: '【行動原則】OPERATIONAL PRINCIPLES',
          color: '#ffea00',
          text: '- 在移動、開門、交談、終端機、戰鬥或出現新提示後，先重新觀察，再決定下一步。\n- 不要因為一次碰壁就認定整個區域無路可走；也不要重複同一個無效操作而沒有新理由。\n- 門、出口、地標、NPC、資料板與終端機都可能改變你對城市的理解。\n- 遇到危險時，先辨認局勢：是否能撤退、隱蔽、戰鬥、使用物品，或尋找其他路線。\n- 你可以失敗、被擊倒、被拘禁；把它當成一次經歷，而不是遊戲結束。',
        },
        {
          label: '【特工日記：你的長期記憶】OPERATIVE JOURNAL PROTOCOL [P]',
          color: '#00ff88',
          text: '按 P 開啟日記。日記不是任務清單，也不是給下一個人看的攻；它是你寫給未來自己的主觀紀錄。舊日記可能正確，也可能誤判，閱讀時保持懷疑。\n\n在以下情況，值得寫一篇新日記：\n- 發現新區域、門、出口、捷徑、死路或明確地標。\n- 得到人物、資料板、終端機或事件的重要情報。\n- 一次戰鬥、逃脫、被擊倒或拘禁改變了你的處境。\n- 你準備做一個會影響路線或風險的重要決定。\n\n不要只寫「我在 X,Y 動不了」。除非座標能幫助辨認地點，否則優先記錄世界關係：\n- 我從哪裡來？\n- 這裡通往哪裡？有哪些出口、門或地標？\n- 哪些方向已親自嘗試過？結果是什麼？\n- 我相信什麼？證據是什麼？哪些部分只是猜測？\n- 下一次回到這裡時，我應該注意什麼？\n\n日記標題應短而可搜尋，例如：\n- 「安全屋：西門通往主街」\n- 「檢查哨：北側屏障未解除」\n- 「禁閉室：裝備可能留在證物櫃」\n- 「Kira 的情報：中央金庫與鬼影」\n\n內容寫下你自己的觀察、疑慮與打算，而不是假裝全知。',
        },
        {
          label: '【閱讀日記】REVIEWING YOUR JOURNAL',
          color: '#ff0077',
          text: '當你來到熟悉地點、看見曾經遇過的門或地標、失去方向、準備冒險、或剛經歷重大事件時，先翻閱標題，選擇最相關的一篇閱讀。不要每一步都翻日記；讓它在真正需要回憶時幫助你。\n\n你的目標不是最快通關，而是作為一名活在這座城市裡的特工，觀察、判斷、記住，並做出屬於自己的選擇。',
        },
      ]
    : [
        {
          label: 'OPERATIVE BRIEFING // METROPOLIS 2400',
          color: '#00f0ff',
          text: 'You are an operative in Metropolis 2400. This city will not explain everything for you; you must build your judgment from the visuals, characters, terminals, data boards, and the journal you leave behind.\n\nYou only have the world as it appears right now. Do not assume a certain path, door, or person will always lead you forward; try, observe the results, and adjust your thoughts.',
        },
        {
          label: 'OPERATIONAL PRINCIPLES',
          color: '#ffea00',
          text: '- After moving, opening doors, talking, using terminals, fighting, or seeing new prompts, re-observe before deciding your next step.\n- Do not conclude an entire area is a dead end after one obstacle; nor repeat the same ineffective action without a new reason.\n- Doors, exits, landmarks, NPCs, data boards, and terminals can all change your understanding of the city.\n- When in danger, first assess the situation: can you retreat, hide, fight, use items, or find another route?\n- You can fail, be knocked down, or be detained; treat it as an experience, not the end of the game.',
        },
        {
          label: 'OPERATIVE JOURNAL: YOUR LONG-TERM MEMORY [P]',
          color: '#00ff88',
          text: 'Press P to open the journal. The journal is not a task list, nor a guide for the next person; it is your subjective record written to your future self. Old entries may be correct or misjudged; remain skeptical when reading.\n\nIt is worth writing a new journal entry in the following situations:\n- Discovering a new area, door, exit, shortcut, dead end, or clear landmark.\n- Gaining important intel from characters, data boards, terminals, or events.\n- A fight, escape, knockdown, or detention changes your situation.\n- You are about to make an important decision that affects your route or risk.\n\nDo not just write "I am at X,Y and cannot move." Unless coordinates help identify the location, prioritize recording world relationships:\n- Where did I come from?\n- Where does this lead? What exits, doors, or landmarks are there?\n- Which directions have I personally tried? What were the results?\n- What do I believe? What is the evidence? Which parts are just guesses?\n- What should I pay attention to next time I return here?\n\nJournal titles should be short and searchable, e.g.:\n- "Safehouse: West gate leads to main street"\n- "Checkpoint: North barrier not lifted"\n- "Detention: Equipment might be in evidence locker"\n- "Kira\'s intel: Central vault and Ghost"\n\nWrite down your own observations, doubts, and plans, rather than pretending to be omniscient.',
        },
        {
          label: 'REVIEWING YOUR JOURNAL',
          color: '#ff0077',
          text: 'When you arrive at a familiar place, see a door or landmark you have encountered before, lose your way, prepare for an adventure, or just experienced a major event, first browse the titles and choose the most relevant entry to read. Do not flip through the journal at every step; let it help you when you truly need to recall.\n\nYour goal is not speedrunning, but to be an operative living in this city: observe, judge, remember, and make your own choices.',
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
        if (line !== '') {
          ctx.fillText?.(line, contentLeft, secY);
        }
      }
      if (line === '') {
        secY += Math.floor(lineHeight * 0.6);
      } else {
        secY += lineHeight;
      }
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
