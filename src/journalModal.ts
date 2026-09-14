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
  playerPos?: { x: number; y: number }
): void {
  const isZh = language === 'zh';

  // Layout
  const padding = 16;
  const titleHeight = 48;
  const footerHeight = 36;
  const contentTop = padding + titleHeight;
  const contentBottom = height - padding - footerHeight;
  const contentHeight = contentBottom - contentTop;

  const leftWidth = Math.floor(width * 0.4);
  const rightWidth = width - leftWidth;
  const gap = 12;

  const leftX = padding;
  const rightX = leftX + leftWidth + gap;

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
    playerPos
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

  const itemHeight = 32;
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

      const arrow = isSelected ? '► ' : '  ';
      ctx.fillStyle = isSelected ? neonGold : textDim;
      ctx.fillText(arrow, x + 4, itemY + itemHeight / 2);

      // Timestamp
      ctx.fillStyle = isSelected ? textPrimary : textSecondary;
      const dateStr = entry.formattedDate || '';
      const shortDate = dateStr.length > 16 ? dateStr.slice(0, 16) : dateStr;
      ctx.fillText(shortDate, x + 24, itemY + itemHeight / 2 - 6);

      // Sector + snippet
      const sectorLabel = entry.sectorId || 'UNKNOWN';
      const snippet = entry.content ? entry.content.slice(0, 20) : '';
      const subLabel = `${sectorLabel} ${snippet}`;
      ctx.fillStyle = isSelected ? textSecondary : textDim;
      ctx.font = '10px monospace';
      ctx.fillText(subLabel, x + 24, itemY + itemHeight / 2 + 8);
    }

    ctx.restore();
  }
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
  playerPos?: { x: number; y: number }
): void {
  // Panel background
  ctx.save();
  ctx.fillStyle = 'rgba(0, 20, 30, 0.5)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  const panelPadding = 12;
  const contentX = x + panelPadding;
  const contentW = w - panelPadding * 2;
  let contentY = y + panelPadding;

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

    // Input box
    const inputBoxHeight = Math.min(120, h - (contentY - y) - 40);
    const inputBoxY = contentY;

    ctx.save();
    ctx.strokeStyle = neonCyan;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.strokeRect(contentX, inputBoxY, contentW, inputBoxHeight);
    ctx.restore();

    // Draw input buffer text with wrapping
    const measureFn = (str: string): number => {
      ctx.font = '12px monospace';
      return ctx.measureText(str).width;
    };

    const wrappedLines = wrapText(inputBuffer, contentW - 16, measureFn);
    const lineHeight = 16;
    const maxLines = Math.floor((inputBoxHeight - 8) / lineHeight);

    ctx.save();
    ctx.font = '12px monospace';
    ctx.fillStyle = textPrimary;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const displayLines = wrappedLines.slice(0, maxLines);
    for (let i = 0; i < displayLines.length; i++) {
      ctx.fillText(displayLines[i], contentX + 8, inputBoxY + 8 + i * lineHeight);
    }

    // Blinking cursor
    const cursorPhase = Math.floor(now / 500) % 2 === 0;
    if (cursorPhase) {
      const lastLine = displayLines.length > 0 ? displayLines[displayLines.length - 1] : '';
      const cursorX = contentX + 8 + measureFn(lastLine) + 2;
      const cursorY = inputBoxY + 8 + (displayLines.length - 1) * lineHeight;
      ctx.fillStyle = neonCyan;
      ctx.shadowColor = neonCyan;
      ctx.shadowBlur = 4;
      ctx.fillText('_', cursorX, cursorY);
    }

    ctx.restore();

    contentY = inputBoxY + inputBoxHeight + 12;

    // Hint text
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = textDim;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(
      isZh ? '[ENTER] 儲存日記 | [ESC] 取消' : '[ENTER] SAVE JOURNAL | [ESC] CANCEL',
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
      const measureFn = (str: string): number => {
        ctx.font = '12px monospace';
        return ctx.measureText(str).width;
      };

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

      // Ellipsis if truncated
      if (wrappedLines.length > maxLines) {
        ctx.fillStyle = textDim;
        ctx.fillText('...', contentX, contentY + maxLines * lineHeight);
      }

      ctx.restore();
    }
  }
}
