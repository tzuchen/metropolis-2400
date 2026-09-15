import type { Language } from './types';
import type { JournalEntry } from './journalSystem';
import { wrapText } from './textWrap';

// Colors
const bg = 'rgba(2, 8, 14, 0.96)';
const neonCyan = '#00f0ff';
const neonGreen = '#00ff88';
const neonGold = '#ffd700';
const textPrimary = '#e0f7fa';
const textSecondary = '#80deea';
const textDim = '#4db6ac';
const borderHighlight = '#ffd700';

export function drawJournalModal(
  width: number,
  height: number,
  ctx: any,
  now: number,
  language: Language,
  entries: JournalEntry[],
  selectedIndex: number,
  mode: 'view' | 'compose',
  inputBuffer: string,
  currentSector: string,
  playerPos?: { x: number; y: number },
  titleInputBuffer: string = '',
  composeField: 'title' | 'content' = 'title'
): void {
  const isZh = language === 'zh';

  // Layout
  const padding = 16;
  const titleHeight = 48;
  const footerHeight = 36;
  const contentTop = padding + titleHeight;
  const contentBottom = height - padding - footerHeight;
  const contentHeight = contentBottom - contentTop;

  const gap = 12;
  const leftX = padding;
  const leftWidth = Math.floor((width - padding * 2 - gap) * 0.38);
  const rightX = leftX + leftWidth + gap;
  const rightWidth = width - padding - rightX;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Outer border with glow
  ctx.save();
  ctx.shadowColor = neonCyan;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = neonCyan;
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.restore();

  // Title
  const title = isZh
    ? '// 特工加密日記 // OPERATIVE PERSONAL JOURNAL //'
    : '// OPERATIVE PERSONAL JOURNAL // CLASSIFIED LOGS //';

  ctx.save();
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = neonCyan;
  ctx.shadowColor = neonCyan;
  ctx.shadowBlur = 6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, padding + 16);
  ctx.restore();

  // Subtitle: total entries + permanent storage label
  const totalLabel = isZh
    ? `總篇數: ${entries.length} | 永久存儲: ACTIVE`
    : `TOTAL: ${entries.length} | PERMANENT STORAGE: ACTIVE`;

  ctx.save();
  ctx.font = '11px monospace';
  ctx.fillStyle = textDim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(totalLabel, width / 2, padding + 34);
  ctx.restore();

  // Divider line under title
  ctx.save();
  ctx.strokeStyle = neonCyan;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(padding, contentTop - 4);
  ctx.lineTo(width - padding, contentTop - 4);
  ctx.stroke();
  ctx.restore();

  // Left panel: Journal list
  drawLeftPanel(ctx, leftX, contentTop, leftWidth, contentHeight, entries, selectedIndex, isZh, now);

  // Right panel: Content / Compose
  drawRightPanel(
    ctx,
    rightX,
    contentTop,
    rightWidth,
    contentHeight,
    mode,
    entries,
    selectedIndex,
    inputBuffer,
    currentSector,
    isZh,
    now,
    playerPos,
    titleInputBuffer,
    composeField
  );

  // Footer: shortcut hints
  const footerY = height - padding - footerHeight / 2;
  const footerText = isZh
    ? '[ ↑/↓ ] 選擇 | [ ENTER ] 進入/儲存 | [ N ] 新增 | [ DEL ] 刪除 | [ P / ESC ] 關閉'
    : '[ ↑/↓ ] SELECT | [ ENTER ] CONFIRM/SAVE | [ N ] NEW | [ DEL ] DELETE | [ P / ESC ] CLOSE';

  ctx.save();
  ctx.font = '11px monospace';
  ctx.fillStyle = textDim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(footerText, width / 2, footerY);
  ctx.restore();
}

function drawLeftPanel(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  entries: JournalEntry[],
  selectedIndex: number,
  isZh: boolean,
  now: number
): void {
  // Panel background
  ctx.save();
  ctx.fillStyle = 'rgba(0, 20, 30, 0.5)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const itemHeight = 38;
  const listPadding = 8;
  const listTop = y + listPadding;
  const listBottom = y + h - listPadding;
  const listHeight = listBottom - listTop;
  const maxVisible = Math.max(1, Math.floor(listHeight / itemHeight));

  // Build list items: index 0 is "compose new", rest are entries in reverse chronological order
  const totalItems = 1 + entries.length;

  // Determine scroll offset to keep selectedIndex visible
  let scrollOffset = 0;
  if (selectedIndex >= maxVisible) {
    scrollOffset = selectedIndex - maxVisible + 1;
  }

  for (let i = 0; i < totalItems; i++) {
    const visibleIndex = i - scrollOffset;
    if (visibleIndex < 0 || visibleIndex >= maxVisible) continue;

    const itemY = listTop + visibleIndex * itemHeight;
    const isSelected = i === selectedIndex;

    // Highlight background for selected item
    if (isSelected) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
      ctx.fillRect(x + 2, itemY, w - 4, itemHeight - 2);
      ctx.strokeStyle = borderHighlight;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, itemY, w - 4, itemHeight - 2);
      ctx.restore();
    }

    // Arrow indicator
    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    if (i === 0) {
      // Compose new entry
      const label = isZh ? '[ + 撰寫新特工筆記 ]' : '[ + COMPOSE NEW ENTRY ]';
      ctx.fillStyle = isSelected ? neonGreen : textSecondary;
      if (isSelected) {
        ctx.shadowColor = neonGreen;
        ctx.shadowBlur = 4;
      }
      ctx.fillText(label, x + 8, itemY + itemHeight / 2);
    } else {
      // Historical entry
      const entry = entries[i - 1];
      if (!entry) continue;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 2, itemY, w - 4, itemHeight - 2);
      ctx.clip();

      const arrow = isSelected ? '► ' : '  ';
      ctx.fillStyle = isSelected ? neonGold : textDim;
      ctx.fillText(arrow, x + 4, itemY + itemHeight / 2);

      // Title
      let title = entry.title || (isZh ? '無標題筆記' : 'Untitled Note');
      const maxTitleW = w - 36;
      ctx.font = '12px monospace';
      if (ctx.measureText(title).width > maxTitleW) {
        while (title.length > 1 && ctx.measureText(title + '...').width > maxTitleW) {
          title = title.slice(0, -1);
        }
        title = title + '...';
      }
      ctx.fillStyle = isSelected ? textPrimary : textSecondary;
      ctx.fillText(title, x + 24, itemY + itemHeight / 2 - 7);

      // Short time + sector
      const dateStr = entry.formattedDate || '';
      const shortDate = dateStr.length > 16 ? dateStr.slice(0, 16) : dateStr;
      const sectorLabel = entry.sectorId || 'UNKNOWN';
      const subLabel = `${shortDate} | ${sectorLabel}`;
      ctx.fillStyle = isSelected ? textSecondary : textDim;
      ctx.font = '10px monospace';
      ctx.fillText(subLabel, x + 24, itemY + itemHeight / 2 + 8);

      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawRightPanel(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  mode: 'view' | 'compose',
  entries: JournalEntry[],
  selectedIndex: number,
  inputBuffer: string,
  currentSector: string,
  isZh: boolean,
  now: number,
  playerPos?: { x: number; y: number },
  titleInputBuffer: string = '',
  composeField: 'title' | 'content' = 'title'
): void {
  // Panel background
  ctx.save();
  ctx.fillStyle = 'rgba(0, 20, 30, 0.5)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const panelPadding = 12;
  const contentX = x + panelPadding;
  const contentW = w - panelPadding * 2;
  let contentY = y + panelPadding;

  const measureFn = (str: string): number => (ctx.measureText ? ctx.measureText(str).width : str.length * 8);

  if (mode === 'compose') {
    // Compose mode
    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = neonCyan;
    ctx.shadowColor = neonCyan;
    ctx.shadowBlur = 4;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(isZh ? '[ 輸入特工日記 ]' : '[ ENTER OPERATIVE JOURNAL ]', contentX, contentY);
    ctx.restore();

    contentY += 24;

    // Preview timestamp and coordinates
    const previewTime = new Date(now);
    const year = previewTime.getFullYear();
    const month = String(previewTime.getMonth() + 1).padStart(2, '0');
    const day = String(previewTime.getDate()).padStart(2, '0');
    const hours = String(previewTime.getHours()).padStart(2, '0');
    const minutes = String(previewTime.getMinutes()).padStart(2, '0');
    const seconds = String(previewTime.getSeconds()).padStart(2, '0');
    const previewDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const coordStr = playerPos
      ? `(${playerPos.x}, ${playerPos.y})`
      : '(N/A)';

    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = textDim;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(isZh ? `預覽時間: ${previewDate}` : `PREVIEW TIME: ${previewDate}`, contentX, contentY);
    contentY += 16;
    ctx.fillText(
      isZh ? `扇區: ${currentSector} | 座標: ${coordStr}` : `SECTOR: ${currentSector} | POS: ${coordStr}`,
      contentX,
      contentY
    );
    ctx.restore();

    contentY += 24;

    // Title input box
    const titleBoxHeight = 32;
    const titleBoxY = contentY;
    const isTitleActive = composeField === 'title';

    ctx.save();
    ctx.strokeStyle = isTitleActive ? neonCyan : 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = isTitleActive ? 2 : 1;
    if (isTitleActive) {
      ctx.shadowColor = neonCyan;
      ctx.shadowBlur = 6;
    }
    ctx.strokeRect(contentX, titleBoxY, contentW, titleBoxHeight);
    ctx.restore();

    // Draw title text
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX + 2, titleBoxY + 2, contentW - 4, titleBoxHeight - 4);
    ctx.clip();
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const cursorPhase = Math.floor(now / 500) % 2 === 0;

    if (titleInputBuffer.length > 0) {
      // Draw entered title text
      ctx.fillStyle = textPrimary;
      ctx.fillText(titleInputBuffer, contentX + 8, titleBoxY + 8);

      // Blinking cursor after text
      if (cursorPhase && isTitleActive) {
        const cursorX = contentX + 8 + measureFn(titleInputBuffer) + 2;
        const cursorY = titleBoxY + 8;
        ctx.fillStyle = neonCyan;
        ctx.shadowColor = neonCyan;
        ctx.shadowBlur = 4;
        ctx.fillText('_', cursorX, cursorY);
      }
    } else {
      // Empty title: show placeholder
      if (isTitleActive) {
        // Active empty: dim placeholder prompt
        ctx.fillStyle = textDim;
        ctx.globalAlpha = 0.7;
        const placeholder = isZh
          ? '請在此輸入標題 (完成後按 Enter 輸入內容)...'
          : 'Type title here (press Enter to enter content)...';
        ctx.fillText(placeholder, contentX + 8, titleBoxY + 8);
        ctx.globalAlpha = 1;

        // Blinking cursor at start
        if (cursorPhase) {
          const cursorX = contentX + 8;
          const cursorY = titleBoxY + 8;
          ctx.fillStyle = neonCyan;
          ctx.shadowColor = neonCyan;
          ctx.shadowBlur = 4;
          ctx.fillText('_', cursorX, cursorY);
        }
      } else {
        // Inactive empty: dim placeholder
        ctx.fillStyle = textDim;
        ctx.globalAlpha = 0.5;
        const placeholder = isZh
          ? '（未命名，將自動由內容第一行生成）'
          : '(Unnamed, will auto-generate from first content line)';
        ctx.fillText(placeholder, contentX + 8, titleBoxY + 8);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();

    contentY = titleBoxY + titleBoxHeight + 12;

    // Content input box
    const contentBoxHeight = Math.max(60, Math.min(120, h - (contentY - y) - 45));
    const contentBoxY = contentY;
    const isContentActive = composeField === 'content';

    ctx.save();
    ctx.strokeStyle = isContentActive ? neonCyan : 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = isContentActive ? 2 : 1;
    if (isContentActive) {
      ctx.shadowColor = neonCyan;
      ctx.shadowBlur = 6;
    }
    ctx.strokeRect(contentX, contentBoxY, contentW, contentBoxHeight);
    ctx.restore();

    // Draw content buffer text with wrapping
    const wrappedLines = wrapText(inputBuffer, contentW - 16, measureFn);
    const lineHeight = 16;
    const maxLines = Math.floor((contentBoxHeight - 8) / lineHeight);

    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX + 2, contentBoxY + 2, contentW - 4, contentBoxHeight - 4);
    ctx.clip();
    ctx.font = '12px monospace';
    ctx.fillStyle = textPrimary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const displayLines = wrappedLines.slice(0, maxLines);
    for (let i = 0; i < displayLines.length; i++) {
      ctx.fillText(displayLines[i], contentX + 8, contentBoxY + 8 + i * lineHeight);
    }

    // Blinking cursor for content
    if (cursorPhase && isContentActive) {
      const lastLine = displayLines.length > 0 ? displayLines[displayLines.length - 1] : '';
      const cursorX = contentX + 8 + measureFn(lastLine) + 2;
      const cursorY = contentBoxY + 8 + (displayLines.length - 1) * lineHeight;
      ctx.fillStyle = neonCyan;
      ctx.shadowColor = neonCyan;
      ctx.shadowBlur = 4;
      ctx.fillText('_', cursorX, cursorY);
    }

    ctx.restore();

    contentY = contentBoxY + contentBoxHeight + 12;

    // Hint text
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = textDim;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      isZh
        ? '[TAB / ↑↓] 切換欄位 | [ENTER] 進入內容/儲存 | [ESC] 取消'
        : '[TAB / ↑↓] SWITCH FIELD | [ENTER] ENTER CONTENT/SAVE | [ESC] CANCEL',
      contentX,
      contentY
    );
    ctx.restore();
  } else {
    // View mode
    if (selectedIndex <= 0 || entries.length === 0) {
      // No entry selected or no entries
      ctx.save();
      ctx.font = '12px monospace';
      ctx.fillStyle = textDim;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const msg = isZh
        ? '無日記紀錄，請按 [N] 或選擇第一項撰寫新筆記。'
        : 'No journal entries. Press [N] or select the first item to compose a new note.';
      ctx.fillText(msg, x + w / 2, y + h / 2);
      ctx.restore();
    } else {
      const entry = entries[selectedIndex - 1];
      if (!entry) {
        ctx.save();
        ctx.font = '12px monospace';
        ctx.fillStyle = textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isZh ? '無日記紀錄' : 'No journal entries', x + w / 2, y + h / 2);
        ctx.restore();
        return;
      }

      // Title
      const entryTitle = entry.title || (isZh ? '無標題筆記' : 'Untitled Note');
      const titleLines = wrapText(`[ ${entryTitle} ]`, contentW, measureFn);
      ctx.save();
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = neonGold;
      ctx.shadowColor = neonGold;
      ctx.shadowBlur = 4;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (let i = 0; i < titleLines.length; i++) {
        ctx.fillText(titleLines[i], contentX, contentY + i * 20);
      }
      ctx.restore();

      contentY += Math.max(26, titleLines.length * 20 + 6);

      // Full date/time
      ctx.save();
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = neonCyan;
      ctx.shadowColor = neonCyan;
      ctx.shadowBlur = 3;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(entry.formattedDate || '', contentX, contentY);
      ctx.restore();

      contentY += 20;

      // Sector and coordinates
      const coordStr = entry.playerPos
        ? `(${entry.playerPos.x}, ${entry.playerPos.y})`
        : '(N/A)';
      ctx.save();
      ctx.font = '11px monospace';
      ctx.fillStyle = textDim;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(
        isZh
          ? `扇區: ${entry.sectorId || 'UNKNOWN'} | 座標: ${coordStr}`
          : `SECTOR: ${entry.sectorId || 'UNKNOWN'} | POS: ${coordStr}`,
        contentX,
        contentY
      );
      ctx.restore();

      contentY += 16;

      // Divider line
      ctx.save();
      ctx.strokeStyle = neonCyan;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(contentX, contentY);
      ctx.lineTo(contentX + contentW, contentY);
      ctx.stroke();
      ctx.restore();

      contentY += 12;

      // Journal content with wrapping
      const wrappedLines = wrapText(entry.content || '', contentW, measureFn);
      const lineHeight = 16;
      const maxLines = Math.floor((y + h - panelPadding - contentY) / lineHeight);

      ctx.save();
      ctx.font = '12px monospace';
      ctx.fillStyle = textPrimary;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const displayLines = wrappedLines.slice(0, maxLines);
      for (let i = 0; i < displayLines.length; i++) {
        ctx.fillText(displayLines[i], contentX, contentY + i * lineHeight);
      }

      ctx.restore();
    }
  }

  ctx.restore();
}
