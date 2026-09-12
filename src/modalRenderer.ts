import { getFont, getTitleFont } from './uiFont';
import { wrapText } from './textWrap';
import type { Language, MissionObjective, Player, StoryLog } from './types';

export class ModalRenderer {
  language: Language = 'zh';
  tileSize = 32;
  storyArchiveSelectedIndex = 0;

  drawInventoryModal(
    player: Player,
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 720);
    const boxH = Math.min(height - 60, 440);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    ctx.fillStyle = 'rgba(3, 8, 14, 0.96)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#ffaa00';
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#ffaa00';
    ctx.font = getTitleFont(14, this.language === 'zh');
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.('// RESISTANCE TACTICAL INVENTORY & CYBERDECK //', x + 20, y + 16);

    // 特工軍階稱號、等級、經驗進度與技能點數 (Agent Rank, Level, XP & Skill Points)
    const pInv = player;
    const invLevel = Number(pInv?.level ?? 1) || 1;
    const invXp = Number(pInv?.exp ?? pInv?.xp ?? 0) || 0;
    const invXpToNext = Number(pInv?.expToNext ?? pInv?.xpToNext ?? 100) || 100;
    const invXpRatio = Math.max(0, Math.min(1, invXp / invXpToNext));
    const skillPoints = Number(pInv?.skillPoints ?? 0) || 0;

    // 軍階稱號 (Agent Rank Title)
    let rankTitle = 'RECRUIT';
    if (invLevel >= 20) rankTitle = 'LEGENDARY OPERATIVE';
    else if (invLevel >= 15) rankTitle = 'MASTER GHOST';
    else if (invLevel >= 10) rankTitle = 'VETERAN SHADOW';
    else if (invLevel >= 5) rankTitle = 'SKILLED INFILTRATOR';
    else if (invLevel >= 3) rankTitle = 'PROVEN AGENT';
    else if (invLevel >= 2) rankTitle = 'FIELD OPERATIVE';

    const isZhInv = this.language === 'zh';
    const rankZh = isZhInv
      ? (invLevel >= 20 ? '傳奇特工' : invLevel >= 15 ? '大師幽影' : invLevel >= 10 ? '資深暗影' : invLevel >= 5 ? '熟練滲透者' : invLevel >= 3 ? '經驗特工' : invLevel >= 2 ? '外勤特工' : '新兵')
      : rankTitle;

    // 右側賽博風格顯示
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffea00';
    ctx.font = getTitleFont(12, isZhInv);
    ctx.fillText?.(`[LV.${invLevel} RANK: ${rankZh}]`, x + boxW - 20, y + 16);

    // XP 進度條 (右側)
    const invXpBarW = 120;
    const invXpBarH = 6;
    const invXpBarX = x + boxW - 20 - invXpBarW;
    const invXpBarY = y + 34;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect?.(invXpBarX, invXpBarY, invXpBarW, invXpBarH);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect?.(invXpBarX, invXpBarY, invXpBarW * invXpRatio, invXpBarH);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect?.(invXpBarX, invXpBarY, invXpBarW, invXpBarH);
    ctx.fillStyle = '#8899a6';
    ctx.font = '9px monospace';
    ctx.fillText?.(`XP: ${invXp}/${invXpToNext}`, x + boxW - 20, invXpBarY + 8);

    // 技能點數
    ctx.fillStyle = skillPoints > 0 ? '#00ff88' : '#445566';
    ctx.font = getTitleFont(11, isZhInv);
    ctx.fillText?.(`[SKILL PTS: ${skillPoints}]`, x + boxW - 20, y + 52);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#8899a6';
    ctx.font = getFont(11, this.language === 'zh');
    const hotkeyText = this.language === 'zh'
      ? 'HOTKEYS: [Q] 切換武器 | [F] 拔槍/收槍 | [1] 醫療包 | [2] 電池 | [3] EMP | [I/ESC] 關閉'
      : 'HOTKEYS: [Q] SWAP WEAPON | [F] DRAW/HOLSTER | [1] MEDKIT | [2] BATTERY | [3] EMP | [I/ESC] CLOSE';
    ctx.fillText?.(hotkeyText, x + 20, y + 36);

    ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    const colW = (boxW - 60) / 2;

    // 左欄：已配備戰術裝備
    ctx.fillStyle = '#00e5ff';
    ctx.font = getTitleFont(13, this.language === 'zh');
    ctx.fillText?.('► EQUIPPED CYBERWARE & WEAPONS', x + 20, y + 68);

    const p = player;
    const equippedWeapon = p?.equippedWeapon;
    const isZh = this.language === 'zh';

    // Dynamically build weapon display
    let weaponName = 'None';
    let weaponStat = 'ATK: 0 DMG';
    let weaponDesc = 'No weapon equipped.';
    let weaponColor = '#8899a6';

    if (equippedWeapon) {
      weaponName = equippedWeapon.name || 'Unknown Weapon';
      const dmg = Number(equippedWeapon.power ?? equippedWeapon.damage ?? 0) || 0;
      const en = equippedWeapon.energyCost || 0;
      const range = equippedWeapon.range || 0;
      const isQuantum = String(weaponName).toUpperCase().includes('QUANTUM');

      if (isQuantum) {
        weaponName = isZh ? '量子殲滅重砲 [★ 最強神兵]' : 'Quantum Annihilator [★ ULTIMATE]';
        weaponStat = `ATK: ${dmg} DMG (${en} EN) | 射程 ${range} | 破盾穿透`;
        weaponDesc = isZh ? '反物質加農砲，一擊必殺，穿透所有護盾。' : 'Antimatter cannon, one-shot kill, pierces all shields.';
        weaponColor = '#b388ff';
      } else {
        weaponStat = `ATK: ${dmg} DMG (${en} EN) | 射程 ${range}`;
        weaponDesc = equippedWeapon.description || 'Standard tactical weapon.';
        weaponColor = '#ff3855';
      }
    }

    const gear = [
      { name: weaponName, stat: weaponStat, desc: weaponDesc, color: weaponColor },
      { name: 'Nanite Mesh Shield', stat: 'DEF: 50% ABSORB (4 EN)', desc: 'Kinetic & energy deflection barrier activated upon impact.', color: '#00f0ff' },
      { name: 'Holo-Disguise Matrix', stat: 'STEALTH: 1 EN/turn', desc: 'Projects civilian signature. Deactivates if weapon drawn.', color: '#00e5ff' },
      { name: 'Neural Cyberdeck v2.4', stat: 'HACK: CLEARANCE LV-2', desc: 'Direct-link terminal hacking apparatus for security hubs.', color: '#c77dff' },
    ];

    gear.forEach((g, i) => {
      const gy = y + 92 + i * 54;
      ctx.fillStyle = 'rgba(15, 25, 35, 0.8)';
      ctx.fillRect?.(x + 20, gy, colW, 46);
      ctx.strokeStyle = g.color || '#005577';
      ctx.strokeRect?.(x + 20, gy, colW, 46);

      ctx.fillStyle = g.color || '#ffffff';
      ctx.font = getTitleFont(12, isZh);
      ctx.fillText?.(g.name, x + 28, gy + 8);

      ctx.fillStyle = '#00f0ff';
      ctx.font = getFont(11, isZh);
      ctx.fillText?.(g.stat, x + 28, gy + 22);

      ctx.fillStyle = '#7a8e99';
      ctx.font = getFont(11, isZh);
      ctx.fillText?.(g.desc, x + 28, gy + 34);
    });

    // List all owned weapons
    const weapons = p?.weapons || [];
    if (Array.isArray(weapons) && weapons.length > 0) {
      ctx.fillStyle = '#ffea00';
      ctx.font = getTitleFont(12, isZh);
      ctx.fillText?.('► OWNED WEAPONS', x + 20, y + 320);

      weapons.forEach((w, i) => {
        const wy = y + 338 + i * 18;
        const isEquipped = equippedWeapon && w.id === equippedWeapon.id;
        ctx.fillStyle = isEquipped ? '#00ff88' : '#8899a6';
        ctx.font = '10px monospace';
        const equipTag = isEquipped ? (isZh ? ' [已裝備]' : ' [EQUIPPED]') : '';
        ctx.fillText?.(`${w.name || 'Unknown'}${equipTag}`, x + 28, wy);
      });
    }

    // 右欄：野戰補給品與消耗性戰術物品
    const rx = x + 30 + colW;
    ctx.fillStyle = '#00ff88';
    ctx.font = getTitleFont(13, this.language === 'zh');
    ctx.fillText?.('► FIELD CONSUMABLES & TACTICAL ITEMS', rx, y + 68);

    const medkits = p?.consumables?.medkits ?? 0;
    const batteries = p?.consumables?.batteries ?? 0;
    const emps = p?.consumables?.empGrenades ?? 0;

    const items = [
      { key: '[1]', name: 'Nanite Stimpack', count: medkits, color: '#00ff88', effect: '+40 HP immediate cellular repair' },
      { key: '[2]', name: 'Plasma Energy Cell', count: batteries, color: '#00e5ff', effect: '+50 Energy capacitors reload' },
      { key: '[3]', name: 'EMP Disruptor Grenade', count: emps, color: '#c77dff', effect: 'Stuns all robots in radius 4 for 4 turns' },
      { key: '[CR]', name: 'Tzorg Credits', count: p?.credits ?? 0, color: '#ffea00', effect: 'Black market currency for informants' },
    ];

    items.forEach((it, i) => {
      const iy = y + 92 + i * 54;
      ctx.fillStyle = 'rgba(15, 30, 22, 0.8)';
      ctx.fillRect?.(rx, iy, colW, 46);
      ctx.strokeStyle = it.color;
      ctx.strokeRect?.(rx, iy, colW, 46);

      ctx.fillStyle = it.color;
      ctx.font = getTitleFont(12, this.language === 'zh');
      ctx.fillText?.(`${it.key} ${it.name} (x${it.count})`, rx + 10, iy + 8);

      ctx.fillStyle = '#a0b4b8';
      ctx.font = getFont(11, this.language === 'zh');
      ctx.fillText?.(it.effect, rx + 10, iy + 26);
    });

    // 已安裝義體清單 (Installed Augmentations)
    const installedAugments = [
      { id: 'DERMAL_ARMOR', name: 'Dermal Armor Plating', desc: 'Passive +10 DEF' },
      { id: 'OPTIC_HUD', name: 'Optic HUD Targeting', desc: 'Enemy HP overlays' },
      { id: 'REFLEX_BOOSTER', name: 'Reflex Booster', desc: 'Dodge & crit chance up' },
      { id: 'POWER_CORE', name: 'Overclocked Power Core', desc: '+50 Max Energy' },
    ];
    const augList = p?.augments ?? {};
    ctx.fillStyle = '#c77dff';
    ctx.font = getTitleFont(13, this.language === 'zh');
    ctx.fillText?.('► INSTALLED AUGMENTATIONS', rx, y + 320);
    installedAugments.forEach((aug, i) => {
      const ay = y + 338 + i * 18;
      const isInstalled = !!augList[aug.id];
      ctx.fillStyle = isInstalled ? '#00ff88' : '#445566';
      ctx.font = '10px monospace';
      ctx.fillText?.(`${isInstalled ? '[✓]' : '[ ]'} ${aug.name} — ${aug.desc}`, rx + 10, ay);
    });

    // 底部提示
    ctx.fillStyle = '#ffaa00';
    ctx.font = getTitleFont(11, this.language === 'zh');
    ctx.textAlign = 'center';
    ctx.fillText?.('PRESS [ 1 ], [ 2 ], [ 3 ] TO QUICK-USE  |  PRESS [ I ] OR [ ESC ] TO RESUME TACTICAL VIEW', x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }
  drawMissionLogModal(
    objectives: MissionObjective[],
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    
    // 1. 過濾顯示任務：主線任務 + 已發現的支線任務
    const visibleList = objectives.filter(obj => !obj.isSideQuest || obj.discovered);
    
    const boxW = Math.min(width - 40, 680);
    const headerH = 54;
    const footerH = 30;
    const itemH = 52;
    const itemGap = 10;
    const padding = 20;
    
    // 3. 動態計算彈窗高度
    const contentH = visibleList.length * (itemH + itemGap);
    const boxH = Math.min(height - 40, headerH + contentH + footerH + padding * 2);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    ctx.fillStyle = 'rgba(4, 12, 20, 0.96)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    const isZh = this.language === 'zh';
    ctx.fillStyle = '#00e5ff';
    ctx.font = getTitleFont(14, isZh);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.(isZh ? '// 反抗軍作戰任務日誌與戰術指令 //' : '// RESISTANCE MISSION INTEL & DIRECTIVES //', x + 20, y + 16);

    // 2. 頂部進度統計以 visibleList 為準
    ctx.fillStyle = '#6a8e99';
    ctx.font = getFont(11, isZh);
    const completedCount = visibleList.filter(obj => obj.completed).length;
    const totalCount = visibleList.length;
    ctx.fillText?.(isZh ? `第一分區滲透作戰協議 // 狀態：進行中 // 已完成 ${completedCount}/${totalCount}` : `SECTOR 1 INFILTRATION PROTOCOL // STATUS: ACTIVE // ${completedCount}/${totalCount} COMPLETE`, x + 20, y + 36);

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    visibleList.forEach((obj, i) => {
      const oy = y + 70 + i * (itemH + itemGap);
      const isDone = obj.completed;
      const isSideQuest = obj.isSideQuest;

      ctx.fillStyle = isDone ? 'rgba(0, 40, 25, 0.6)' : 'rgba(15, 25, 35, 0.7)';
      ctx.fillRect?.(x + 20, oy, boxW - 40, itemH);

      ctx.strokeStyle = isDone ? '#00ff88' : '#005577';
      ctx.strokeRect?.(x + 20, oy, boxW - 40, itemH);

      // 4. 項目上標示【主線】（藍色）與【支線】（金黃色 #ffaa00）標籤
      const tagText = isSideQuest ? (isZh ? '【支線】' : '[SIDE]') : (isZh ? '【主線】' : '[MAIN]');
      const tagColor = isSideQuest ? '#ffaa00' : '#00e5ff';
      ctx.fillStyle = tagColor;
      ctx.font = getTitleFont(10, isZh);
      ctx.fillText?.(tagText, x + 30, oy + 10);

      // 5. 完成狀態顯示 [✓] 已完成（綠色 #00ff88），未完成顯示 [ ] 進行中
      ctx.fillStyle = isDone ? '#00ff88' : '#ff3855';
      ctx.font = getTitleFont(12, isZh);
      ctx.fillText?.(isDone ? (isZh ? '[✓] 已完成' : '[✓] COMPLETE') : (isZh ? '[ ] 進行中' : '[ ] ACTIVE'), x + 85, oy + 10);

      const title = (isZh && obj.titleZh) ? obj.titleZh : obj.title;
      ctx.fillStyle = isDone ? '#ffffff' : '#d0e5f2';
      ctx.font = getTitleFont(12, isZh);
      ctx.fillText?.(title, x + 190, oy + 10);

      const desc = (isZh && obj.descriptionZh) ? obj.descriptionZh : obj.description;
      ctx.fillStyle = '#8aa0aa';
      ctx.font = getFont(11, isZh);
      ctx.fillText?.(desc, x + 30, oy + 30);
    });

    ctx.fillStyle = '#00e5ff';
    ctx.font = getTitleFont(11, isZh);
    ctx.textAlign = 'center';
    ctx.fillText?.(isZh ? '按 [ M ] 或 [ ESC ] 關閉任務情報' : 'PRESS [ M ] OR [ ESC ] TO CLOSE MISSION INTEL', x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }
  drawGameOverOverlay(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();
    ctx.fillStyle = 'rgba(15, 0, 5, 0.85)';
    ctx.fillRect?.(0, 0, width, height);

    const isZh = this.language === 'zh';
    const title = isZh ? '// 特工陣亡・生命信號中斷 //' : '// OPERATIVE ELIMINATED //';
    const prompt = isZh ? '按 [ R ] 重啟反抗軍模擬協議  |  按 [ 9 ] 讀取快速存檔' : 'PRESS [ R ] TO RESTART  |  [ 9 ] QUICK LOAD';

    const pulse = 0.8 + 0.2 * Math.sin(now * 0.005);
    ctx.fillStyle = 'rgba(255, 30, 50, ' + pulse + ')';
    ctx.shadowColor = '#ff1e32';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText?.(title, width / 2, height / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '13px monospace';
    ctx.fillText?.(prompt, width / 2, height / 2 + 20);

    ctx.restore?.();
  }
  drawStoryLogModal(
    log: StoryLog,
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 720);
    const boxH = Math.min(height - 60, 440);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;
    const isZh = this.language === 'zh';
    const isUnlocked = log.read !== false;

    ctx.fillStyle = 'rgba(2, 8, 14, 0.97)';
    ctx.fillRect?.(x, y, boxW, boxH);

    const borderColor = isUnlocked ? '#00e5ff' : '#ff5533';
    ctx.strokeStyle = borderColor;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = borderColor;
    ctx.font = 'bold 13px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const headerText = isUnlocked
      ? '// TZORG INTELLIGENCE ARCHIVE // CLASSIFIED RECORD //'
      : '// TZORG ENCRYPTION // ACCESS RESTRICTED //';
    ctx.fillText?.(headerText, x + 24, y + 18);

    const logTitle = isZh && log.titleZh ? log.titleZh : log.title;
    const titlePrefix = isUnlocked ? '► ' : '🔒 ';
    const titleColor = isUnlocked ? '#ffea00' : '#ff7755';
    const contentColor = isUnlocked ? '#e4f4fc' : '#ffccaa';

    ctx.fillStyle = titleColor;
    ctx.font = getTitleFont(14, isZh);
    ctx.fillText?.(titlePrefix + logTitle.toUpperCase(), x + 24, y + 38);

    ctx.fillStyle = '#8aa0b2';
    ctx.font = '10px monospace';
    ctx.fillText?.(`OPERATIVE: RAVEN  |  SOURCE: ${log.author}  |  TIMESTAMP: ${log.timestamp}`, x + 24, y + 56);

    ctx.strokeStyle = isUnlocked ? 'rgba(0, 229, 255, 0.35)' : 'rgba(255, 119, 85, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 24, y + 72);
    ctx.lineTo?.(x + boxW - 24, y + 72);
    ctx.stroke?.();

    ctx.fillStyle = contentColor;
    ctx.font = getFont(14, isZh);
    let lineY = y + 84;
    const maxLineW = boxW - 48;

    const paragraphs = isZh && Array.isArray(log.contentZh) && log.contentZh.length > 0 ? log.contentZh : (Array.isArray(log.content) ? log.content : [String(log.content)]);
    paragraphs.forEach((paragraph) => {
      const lines = wrapText(paragraph, maxLineW, (s) => (ctx.measureText ? ctx.measureText(s).width : s.length * 8));
      lines.forEach((l) => {
        ctx.fillText?.('  ' + l, x + 24, lineY);
        lineY += isZh ? 22 : 18;
      });
      lineY += 6;
    });

    const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
    ctx.fillStyle = `rgba(${isUnlocked ? '0, 229, 255' : '255, 85, 51'}, ${pulse})`;
    ctx.font = getTitleFont(12, isZh);
    ctx.textAlign = 'center';
    const footerText = isZh
      ? '按 [ 空白鍵 ]、[ ENTER ] 或 [ ESC ] 關閉檔案記錄  |  按 [ Z ] 切換中英文'
      : 'PRESS [ SPACE ] OR [ ENTER ] OR [ ESC ] TO CLOSE  |  [ Z ] SWITCH LANGUAGE';
    ctx.fillText?.(footerText, x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }
  drawStoryArchiveModal(
    logs: StoryLog[],
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 720);
    const boxH = Math.min(height - 60, 440);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;
    const isZh = this.language === 'zh';

    ctx.fillStyle = 'rgba(4, 10, 16, 0.97)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#ff9900';
    ctx.shadowColor = '#ff9900';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#ff9900';
    ctx.font = getTitleFont(14, isZh);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const headerText = isZh ? '// 反抗軍歷史數據檔案庫 // 第一分區情報主機 //' : '// RESISTANCE LORE ARCHIVES // SECTOR 1 DATA BANK //';
    ctx.fillText?.(headerText, x + 20, y + 16);

    const readCount = logs.filter((l) => l.read).length;
    ctx.fillStyle = '#8aa0aa';
    ctx.font = getFont(11, isZh);
    const subHeaderText = isZh
      ? `已解密記憶數據板：${readCount} / ${logs.length}（按 [1-4] 閱讀，按 [Z] 切換語言）`
      : `RECOVERED DATA SLATES: ${readCount} / ${logs.length} FOUND (Press [1-4] to read, [Z] for Lang)`;
    ctx.fillText?.(subHeaderText, x + 20, y + 36);

    ctx.strokeStyle = 'rgba(255, 153, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    const selectedIndex = this.storyArchiveSelectedIndex ?? 0;

    logs.forEach((log, i) => {
      const ly = y + 66 + i * 80;
      const isFound = log.read;
      const isSelected = selectedIndex === i;

      ctx.fillStyle = isFound ? 'rgba(15, 28, 38, 0.7)' : 'rgba(10, 15, 20, 0.5)';
      ctx.fillRect?.(x + 20, ly, boxW - 40, 70);

      if (isSelected) {
        ctx.strokeStyle = '#ffea00';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ffea00';
        ctx.shadowBlur = 8;
      } else {
        ctx.strokeStyle = isFound ? '#00e5ff' : '#334455';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
      }
      ctx.strokeRect?.(x + 20, ly, boxW - 40, 70);

      ctx.fillStyle = isFound ? '#00e5ff' : '#667788';
      ctx.font = getTitleFont(12, isZh);
      const logTitle = isZh && log.titleZh ? log.titleZh : log.title;
      const prefix = isSelected ? '► ' : '  ';
      const slateLabel = `${prefix}[ ${i + 1} ] [ ${isZh ? '數據板' : 'SLATE'} 0${i + 1} ] ${isFound ? logTitle : (isZh ? '// 🔒 加密鎖定（按此查閱線索）//' : '// 🔒 ENCRYPTED (PRESS TO VIEW INTEL) //')}`;
      ctx.fillText?.(slateLabel, x + 30, ly + 10);

      ctx.fillStyle = isFound ? '#ffea00' : '#445566';
      ctx.font = getFont(10, isZh);
      const sourceText = isFound
        ? isZh
          ? `來源：${log.author} | 日期戳：${log.timestamp}`
          : `SOURCE: ${log.author} | DATE: ${log.timestamp}`
        : isZh
          ? '搜索第一分區物資據點以回收此記憶磁碟'
          : 'SEARCH SECTOR 1 DEPOTS TO RECOVER DISK';
      ctx.fillText?.(sourceText, x + 30, ly + 28);

      ctx.fillStyle = isFound ? '#c0d4de' : '#334455';
      ctx.font = getFont(10, isZh);
      const snippet = isFound
        ? ((log.contentZh?.[0] || log.content[0] || '').slice(0, 80) + '...')
        : isZh
          ? '存取權限受佐格防火牆嚴格限制。'
          : 'Access restricted by Tzorg firewall.';
      ctx.fillText?.(snippet, x + 30, ly + 46);
    });

    ctx.fillStyle = '#ff9900';
    ctx.font = getTitleFont(11, isZh);
    ctx.textAlign = 'center';
    const footerText = isZh
      ? '按 [ 1-4 ] 或 [ ↑/↓ ] 選擇按 [ ENTER ] 閱讀  |  支援滑鼠點擊卡片  |  按 [ Z ] 切換語言  |  [ L / ESC ] 關閉'
      : 'PRESS [ 1-4 ] OR [ UP/DOWN + ENTER ] TO READ  |  CLICK TO OPEN  |  [ Z ] SWITCH LANG  |  [ L / ESC ] CLOSE';
    ctx.fillText?.(footerText, x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }
  drawVictoryOverlay(player: Player, width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();
    ctx.fillStyle = 'rgba(0, 20, 15, 0.95)';
    ctx.fillRect?.(0, 0, width, height);

    const p = player;
    const endgameChoice = String(p?.endgameChoice ?? '').toUpperCase();
    const isZh = this.language === 'zh';

    let title = '★ MISSION ACCOMPLISHED ★';
    let subtitle = 'TZORG SECURITY FORCEFIELD PERFORATED // NEXUS ACCESSED';
    let poem = '';
    let accentColor = '#00ff88';
    let shadowColor = '#00ff88';

    if (endgameChoice === 'OVERLOAD') {
      title = isZh ? '☢ 核心過載・終焉之焰 ☢' : '☢ NEXUS OVERLOAD ☢';
      subtitle = isZh ? '核心燃燒 // 第一分區陷入死寂' : 'THE CORE BURNS // SECTOR 1 DROPS INTO SILENCE';
      poem = isZh
        ? '我們將憤怒餵予機器，它以火焰回應。\n每一塊螢幕泛白，每一架無人機墜落。\n城市重新呼吸——帶著傷疤，卻已自由。'
        : 'We fed the machine our rage and it answered in fire.\nEvery screen went white, every drone fell from the sky.\nThe city breathes again — scarred, but free.';
      accentColor = '#ff4444';
      shadowColor = '#ff2200';
    } else if (endgameChoice === 'SUBVERSION') {
      title = isZh ? '◈ 幽影協議・無痕滲透 ◈' : '◈ GHOST PROTOCOL ◈';
      subtitle = isZh ? '佐格主機被重寫 // 無跡可尋' : 'TZORG MAINFRAME REWRITTEN // NO TRACE REMAINS';
      poem = isZh
        ? '沒有爆炸，沒有警報——只有電線中的低語。\n他們自己的牆壁，如今在黑暗中唸出我們的名字。\n反抗軍活在代碼裡，無形且永恆。'
        : 'No explosion, no alarm — just a whisper in the wire.\nTheir own walls now speak our names in the dark.\nThe rebellion lives in code, invisible and eternal.';
      accentColor = '#00e5ff';
      shadowColor = '#0088ff';
    } else if (endgameChoice === 'EVACUATION') {
      title = isZh ? '▲ 撤離完成・火種延續 ▲' : '▲ EXTRACTION COMPLETE ▲';
      subtitle = isZh ? '反抗軍細胞保存 // 第一分區棄守' : 'RESISTANCE CELL PRESERVED // SECTOR 1 ABANDONED';
      poem = isZh
        ? '我們把霓虹街道留給機器，卻帶走了火種。\n在網格之外某處，新的細胞正在成形。\n戰鬥沒有結束——只是換了地址。'
        : 'We left the neon streets to the machines, but carried the spark.\nSomewhere beyond the grid, new cells are forming.\nThe fight does not end — it only changes address.';
      accentColor = '#ffea00';
      shadowColor = '#ffaa00';
    } else if (endgameChoice === 'AWAKEN') {
      title = isZh ? '★ 全民大覺醒 (THE GREAT AWAKENING) ★' : '★ THE GREAT AWAKENING ★';
      subtitle = isZh ? '五百萬人神經項圈解除 // 大都會全面光復' : 'FIVE MILLION CITIZENS LIBERATED // TOTAL RESTORATION';
      poem = isZh
        ? '逆向廣播脈衝刺破了三代人的永夜巨蛋。\n工廠停擺、合成項圈解鎖，五百萬沉睡的神智迎來曙光。\n這不是代碼的終點，而是人類新生的拂曉。'
        : 'The inverse pulse shattered three generations of synthetic sleep.\nCollars dropped, factories ceased, and five million souls opened their eyes.\nNot an end of code, but the golden dawn of humankind.';
      accentColor = '#00ff88';
      shadowColor = '#00ffaa';
    }

    // 1. 頂部標題與副標題 (帶光暈與脈衝)
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.005);
    ctx.fillStyle = accentColor;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 15;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = pulse;
    ctx.fillText?.(title, width / 2, 40);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#00f0ff';
    ctx.font = '14px monospace';
    ctx.fillText?.(subtitle, width / 2, 65);

    // 2. 左側區塊：詩篇敘事與夥伴後日談
    const leftX = 40;
    const leftW = width * 0.45;
    let leftY = 100;

    // 詩篇敘事
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText?.(isZh ? '【 終局詩篇 】' : '[ EPILOGUE POEM ]', leftX, leftY);
    leftY += 20;

    ctx.fillStyle = '#c0d4de';
    ctx.font = 'italic 12px monospace';
    const poemLines = poem.split('\n');
    poemLines.forEach((line) => {
      ctx.fillText?.(line, leftX, leftY);
      leftY += 18;
    });
    leftY += 10;

    // 反抗軍夥伴後日談
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.(isZh ? '【 反抗軍夥伴後日談 】' : '[ COMPANION EPILOGUES ]', leftX, leftY);
    leftY += 20;

    const companions = [
      {
        name: isZh ? '文斯博士 (Doc Vance)' : 'Doc Vance',
        text: isZh
          ? '「我終於不再只是個逃犯。在廢墟中重建醫療站，我終於找到了贖罪的方式。」'
          : '"I am no longer just a fugitive. Rebuilding the medical station in the ruins, I found my redemption."'
      },
      {
        name: isZh ? '基拉 (Kira)' : 'Kira',
        text: isZh
          ? '「戰火平息後，我將為每一位犧牲的反抗軍點起霓虹燈。他們的名字將永遠閃爍。」'
          : '"After the war, I will light a neon sign for every fallen rebel. Their names will shine forever."'
      },
      {
        name: isZh ? '希爾維亞 (Sylvia)' : 'Sylvia',
        text: isZh
          ? '「我的工坊將成為自由者的避風港。這裡不再製造武器，而是製造希望。」'
          : '"My workshop will be a sanctuary for the free. No more weapons here, only hope."'
      }
    ];

    companions.forEach((comp) => {
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText?.(comp.name, leftX, leftY);
      leftY += 16;

      ctx.fillStyle = '#a0b4b8';
      ctx.font = '11px monospace';
      const wrappedLines = wrapText(comp.text, leftW - 20, (s) => (ctx.measureText ? ctx.measureText(s).width : s.length * 8));
      wrappedLines.forEach((line) => {
        ctx.fillText?.(line, leftX, leftY);
        leftY += 14;
      });
      leftY += 8;
    });

    // 3. 右側區塊：特工終局檔案與戰果評級
    const rightX = width * 0.55;
    const rightW = width * 0.45 - 40;
    let rightY = 100;

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.(isZh ? '【 特工終局檔案 】' : '[ OPERATIVE DOSSIER ]', rightX, rightY);
    rightY += 20;

    // 統計顯示
    const level = Number(p?.level ?? 1) || 1;
    let rankTitle = 'RECRUIT';
    if (level >= 20) rankTitle = 'LEGENDARY OPERATIVE';
    else if (level >= 15) rankTitle = 'MASTER GHOST';
    else if (level >= 10) rankTitle = 'VETERAN SHADOW';
    else if (level >= 5) rankTitle = 'SKILLED INFILTRATOR';
    else if (level >= 3) rankTitle = 'PROVEN AGENT';
    else if (level >= 2) rankTitle = 'FIELD OPERATIVE';

    const rankZh = isZh
      ? (level >= 20 ? '傳奇特工' : level >= 15 ? '大師幽影' : level >= 10 ? '資深暗影' : level >= 5 ? '熟練滲透者' : level >= 3 ? '經驗特工' : level >= 2 ? '外勤特工' : '新兵')
      : rankTitle;

    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.(isZh ? `等級：LV.${level} | 軍階：${rankZh}` : `LEVEL: LV.${level} | RANK: ${rankTitle}`, rightX, rightY);
    rightY += 20;

    // 情報晶片解密度
    const storyLogs = player.storyLogs ?? [];
    const readCount = Array.isArray(storyLogs) ? storyLogs.filter((l: any) => l.read).length : 0;
    const totalLogs = Array.isArray(storyLogs) ? storyLogs.length : 4;
    ctx.fillStyle = '#00e5ff';
    ctx.fillText?.(isZh ? `情報晶片解密度：${readCount}/${totalLogs}` : `INTEL SLATES DECRYPTED: ${readCount}/${totalLogs}`, rightX, rightY);
    rightY += 20;

    // 首領討伐狀態
    const bossDefeated = player.hasDefeatedBoss || false;
    ctx.fillStyle = bossDefeated ? '#00ff88' : '#ff3855';
    ctx.fillText?.(isZh ? `首領討伐狀態：${bossDefeated ? '已討伐' : '未討伐'}` : `BOSS STATUS: ${bossDefeated ? 'DEFEATED' : 'NOT DEFEATED'}`, rightX, rightY);
    rightY += 20;

    // 裝備神兵
    const weaponName = p?.equippedWeapon?.name || 'None';
    ctx.fillStyle = '#c77dff';
    ctx.fillText?.(isZh ? `裝備神兵：${weaponName}` : `EQUIPPED WEAPON: ${weaponName}`, rightX, rightY);
    rightY += 30;

    // 終局等級評定
    let finalRank = 'A';
    let finalRankText = isZh ? '自由特工' : 'FREE AGENT';
    if (level >= 15 && readCount >= 3 && bossDefeated) {
      finalRank = 'S+';
      finalRankText = isZh ? '傳奇解放者' : 'LEGENDARY LIBERATOR';
    } else if (level >= 10 && readCount >= 2) {
      finalRank = 'S';
      finalRankText = isZh ? '菁英幽影' : 'ELITE GHOST';
    }

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 16px monospace';
    ctx.fillText?.(isZh ? `終局評級：RANK ${finalRank} - ${finalRankText}` : `FINAL RANK: ${finalRank} - ${finalRankText}`, rightX, rightY);

    // 4. 底部提示
    const promptText = isZh ? '按 [ R ] 重新開始模擬  |  按 [ 9 ] 讀取快速存檔' : 'PRESS [ R ] TO RESTART  |  [ 9 ] QUICK LOAD';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText?.(promptText, width / 2, height - 30);

    ctx.restore?.();
  }
  drawAugmentShopModal(
    player: Player,
    width: number,
    height: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();
    const boxW = Math.min(width - 40, 840);
    const boxH = Math.min(height - 40, 520);
    const x = (width - boxW) / 2;
    const y = (height - boxH) / 2;

    ctx.fillStyle = 'rgba(2, 6, 12, 0.97)';
    ctx.fillRect?.(x, y, boxW, boxH);

    ctx.strokeStyle = '#c77dff';
    ctx.shadowColor = '#c77dff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

    ctx.fillStyle = '#c77dff';
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText?.('// JAX\'S BLACK MARKET CYBER-CLINIC & TACTICAL ARMORY //', x + 20, y + 16);

    const p = player;
    const credits = p?.credits ?? 0;
    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.('YOUR CREDITS: ' + credits + ' CR', x + 20, y + 38);

    ctx.strokeStyle = 'rgba(199, 125, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath?.();
    ctx.moveTo?.(x + 20, y + 54);
    ctx.lineTo?.(x + boxW - 20, y + 54);
    ctx.stroke?.();

    const colW = (boxW - 60) / 2;
    const leftX = x + 20;
    const rightX = x + 40 + colW;

    // Left Column: Neural Augmentations
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.('[ NEURAL AUGMENTATIONS ]', leftX, y + 68);

    const augments = [
      { key: '[1]', id: 'DERMAL_ARMOR', name: 'Dermal Armor Plating', effect: 'Passive +10 DEF. Subdermal kinetic mesh.', price: 100 },
      { key: '[2]', id: 'OPTIC_HUD', name: 'Optic HUD Targeting', effect: 'Enemy HP overlays & threat tracking.', price: 120 },
      { key: '[3]', id: 'REFLEX_BOOSTER', name: 'Reflex Booster', effect: '+15% dodge & +10% crit chance.', price: 150 },
      { key: '[4]', id: 'POWER_CORE', name: 'Overclocked Power Core', effect: '+50 Max Energy capacity.', price: 100 },
    ];
    const installed = p?.augments ?? {};

    augments.forEach((aug, i) => {
      const ay = y + 88 + i * 78;
      const isInstalled = !!installed[aug.id];
      const canAfford = credits >= aug.price;

      ctx.fillStyle = isInstalled ? 'rgba(20, 40, 30, 0.75)' : 'rgba(15, 15, 30, 0.75)';
      ctx.fillRect?.(leftX, ay, colW, 68);
      ctx.strokeStyle = isInstalled ? '#00ff88' : canAfford ? '#c77dff' : '#445566';
      ctx.strokeRect?.(leftX, ay, colW, 68);

      ctx.fillStyle = isInstalled ? '#00ff88' : '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText?.(aug.name, leftX + 12, ay + 10);

      ctx.fillStyle = '#8aa0b2';
      ctx.font = '10px monospace';
      ctx.fillText?.(aug.effect, leftX + 12, ay + 28);

      ctx.fillStyle = isInstalled ? '#00ff88' : canAfford ? '#ffea00' : '#ff3855';
      ctx.font = 'bold 11px monospace';
      ctx.fillText?.(isInstalled ? '[INSTALLED]' : aug.price + ' CR', leftX + 12, ay + 46);

      if (!isInstalled) {
        ctx.fillStyle = canAfford ? '#c77dff' : '#445566';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'right';
        ctx.fillText?.(canAfford ? aug.key + ' BUY' : 'INSUFFICIENT CR', leftX + colW - 12, ay + 46);
        ctx.textAlign = 'left';
      }
    });

    // Right Column: Black Market Supplies & Services
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText?.('[ BLACK MARKET SUPPLIES & SERVICES ]', rightX, y + 68);

    const medkits = p?.consumables?.medkits ?? 0;
    const batteries = p?.consumables?.batteries ?? 0;
    const empGrenades = p?.consumables?.empGrenades ?? 0;
    const weaponName = p?.equippedWeapon?.name || 'Blaster';
    const weaponPower = p?.equippedWeapon?.power ?? 20;

    const supplies = [
      { key: '[5]', name: 'Nanite Medkit', effect: `Quick-heal +50 HP (Owned: ${medkits})`, price: 40 },
      { key: '[6]', name: 'Plasma Battery', effect: `Quick-recharge +50 EN (Owned: ${batteries})`, price: 35 },
      { key: '[7]', name: 'EMP Disruptor', effect: `Stun area robots (Owned: ${empGrenades})`, price: 70 },
      { key: '[8]', name: 'Weapon Overclock', effect: `+5 DMG to ${weaponName} (Current: ${weaponPower} DMG)`, price: 150 },
      { key: '[9]', name: 'Security Bribe', effect: 'Clear alert & reset collar timer to 100', price: 100 },
    ];

    supplies.forEach((sup, i) => {
      const sy = y + 88 + i * 78;
      const canAfford = credits >= sup.price;

      ctx.fillStyle = 'rgba(15, 15, 30, 0.75)';
      ctx.fillRect?.(rightX, sy, colW, 68);
      ctx.strokeStyle = canAfford ? '#ffaa00' : '#445566';
      ctx.strokeRect?.(rightX, sy, colW, 68);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText?.(sup.name, rightX + 12, sy + 10);

      ctx.fillStyle = '#8aa0b2';
      ctx.font = '10px monospace';
      ctx.fillText?.(sup.effect, rightX + 12, sy + 28);

      ctx.fillStyle = canAfford ? '#ffea00' : '#ff3855';
      ctx.font = 'bold 11px monospace';
      ctx.fillText?.(sup.price + ' CR', rightX + 12, sy + 46);

      ctx.fillStyle = canAfford ? '#ffaa00' : '#445566';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText?.(canAfford ? sup.key + ' BUY' : 'INSUFFICIENT CR', rightX + colW - 12, sy + 46);
      ctx.textAlign = 'left';
    });

    const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
    ctx.fillStyle = `rgba(199, 125, 255, ${pulse})`;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText?.('PRESS [ 1 ]-[ 9 ] TO PURCHASE  |  PRESS [ U ] OR [ ESC ] TO EXIT', x + boxW / 2, y + boxH - 18);

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }
  drawDefeatCutscene(width: number, height: number, ctx: any, now: number, cutscene: any, lang: string, camX?: number, camY?: number): void {
    if (!cutscene) return;
    const stage = String(cutscene.stage || 'swarm');
    const stageStartTime = Number(cutscene.stageStartTime) || now;
    const duration = Number(cutscene.duration) || 3000;
    const progress = Math.max(0, Math.min(1, (now - stageStartTime) / duration));
    const isZh = lang === 'zh';

    ctx.save?.();

    if (stage === 'swarm') {
      // 深紅色警戒暗角
      const vignetteGrad = ctx.createRadialGradient?.(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
      if (vignetteGrad) {
        vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGrad.addColorStop(0.6, 'rgba(80, 0, 0, 0.3)');
        vignetteGrad.addColorStop(1, 'rgba(120, 0, 0, 0.8)');
        ctx.fillStyle = vignetteGrad;
        ctx.fillRect?.(0, 0, width, height);
      }

      // 精確計算特工倒地螢幕座標
      const downPos = cutscene.playerDownPos || { x: 0, y: 0 };
      const actualCamX = camX !== undefined ? camX : (downPos.x * this.tileSize - width / 2);
      const actualCamY = camY !== undefined ? camY : (downPos.y * this.tileSize - height / 2);
      const cx = downPos.x * this.tileSize - actualCamX + this.tileSize / 2;
      const cy = downPos.y * this.tileSize - actualCamY + this.tileSize / 2;

      // 脈衝霓虹紅色收容力場圈與電弧火花 (以 cx, cy 為圓心)
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
      ctx.strokeStyle = `rgba(255, 30, 50, ${0.6 + 0.4 * pulse})`;
      ctx.shadowColor = '#ff1e32';
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3;
      ctx.beginPath?.();
      ctx.arc?.(cx, cy, 60 + pulse * 10, 0, Math.PI * 2);
      ctx.stroke?.();

      // 電弧火花
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + now * 0.005;
        const dist = 70 + Math.sin(now * 0.01 + i) * 15;
        const sx = cx + Math.cos(angle) * dist;
        const sy = cy + Math.sin(angle) * dist;
        ctx.fillStyle = '#ff4466';
        ctx.shadowBlur = 8;
        ctx.beginPath?.();
        ctx.arc?.(sx, sy, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill?.();
      }
      ctx.shadowBlur = 0;

      // 警報橫幅
      ctx.fillStyle = 'rgba(20, 0, 0, 0.85)';
      ctx.fillRect?.(0, height - 80, width, 80);
      ctx.strokeStyle = '#ff1e32';
      ctx.lineWidth = 2;
      ctx.strokeRect?.(0, height - 80, width, 80);

      ctx.fillStyle = '#ff4466';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const alertText = isZh
        ? '【佐格安保】警報：目標已癱瘓！收容部隊正在壓制並執行拘捕...'
        : '[TZORG SECURITY] Target neutralized! Enforcers engaging containment protocol...';
      ctx.fillText?.(alertText, width / 2, height - 40);

    } else if (stage === 'blur_out') {
      // 逐漸加深黑屏與模糊暗度
      const alpha = progress;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect?.(0, 0, width, height);

      // CRT 故障干擾橫紋
      if (alpha > 0.3) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * alpha})`;
        for (let i = 0; i < 10; i++) {
          const y = (i * (height / 10) + Math.sin(now * 0.01 + i) * 5) % height;
          ctx.fillRect?.(0, y, width, 2);
        }
      }

      // 中央神經斷線與押送字樣
      if (alpha > 0.5) {
        ctx.fillStyle = `rgba(255, 100, 100, ${(alpha - 0.5) * 2})`;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const neuralText = isZh
          ? '>> 意識神經中斷 // 押送往第一區中央禁閉室... <<'
          : '>> NEURAL FEED LOST // TRANSPORTING TO SECTOR 1 DETENTION <<';
        ctx.fillText?.(neuralText, width / 2, height / 2);
      }

    } else if (stage === 'wake_up') {
      // 精細的緩慢眨眼開闔效果（上下眼皮模擬）
      // 使用 progress 控制眼皮開啟程度，並加入輕微的抖動模擬剛醒來的狀態
      const blinkProgress = progress;
      const eyelidH = (1 - blinkProgress) * height * 0.35;

      // 上眼皮
      ctx.fillStyle = 'rgba(10, 5, 5, 1)';
      ctx.fillRect?.(0, 0, width, eyelidH);

      // 下眼皮
      ctx.fillRect?.(0, height - eyelidH, width, eyelidH);

      // 青色霓虹 HUD 重啟字樣逐漸淡出
      if (progress > 0.3 && progress < 0.9) {
        const hudAlpha = Math.min(1, (progress - 0.3) / 0.2) * Math.min(1, (0.9 - progress) / 0.2);
        ctx.fillStyle = `rgba(0, 229, 255, ${hudAlpha})`;
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const rebootText = isZh
          ? '[ 神經系統重啟... 第一區禁閉室 ]'
          : '[ BIOS REBOOT COMPLETE // SECTOR 1 DETENTION ]';
        ctx.fillText?.(rebootText, width / 2, height / 2);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore?.();
  }
}
