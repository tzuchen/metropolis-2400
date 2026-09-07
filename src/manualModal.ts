import type { Language } from './types';

export function drawManualModal(
  width: number,
  height: number,
  ctx: any,
  now: number,
  language: Language
): void {
  ctx.save?.();
  const isZh = language === 'zh';

  const boxW = Math.min(width - 40, 740);
  const boxH = Math.min(height - 60, 480);
  const x = (width - boxW) / 2;
  const y = (height - boxH) / 2;

  // 半透明深黑賽博底板
  ctx.fillStyle = 'rgba(2, 8, 14, 0.96)';
  ctx.fillRect?.(x, y, boxW, boxH);

  // 霓虹邊框
  ctx.strokeStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 2;
  ctx.strokeRect?.(x + 1, y + 1, boxW - 2, boxH - 2);

  // 標題
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 15px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const title = isZh
    ? '// 火花反抗軍特工戰術手冊 // OPERATION PROMETHEUS FIELD MANUAL //'
    : '// SPARK RESISTANCE PROTOCOL // OPERATION PROMETHEUS MANUAL //';
  ctx.fillText?.(title, x + 20, y + 16);

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath?.();
  ctx.moveTo?.(x + 20, y + 38);
  ctx.lineTo?.(x + boxW - 20, y + 38);
  ctx.stroke?.();

  // 四大情報板塊
  const sections = isZh
    ? [
        {
          title: '一、戰術移動與基本操作',
          color: '#00ffcc',
          items: [
            '[ W A S D / 方向鍵 ]：八向移動與探索街道。',
            '[ 空格鍵 / SPACE ]：原地待命一回合（避開巡邏路徑）。',
            '[ E ]：手動開關門鎖。  [ T ]：居民對話 / 終端機接入。',
            '[ 8 / F5 ]：即時存檔。  [ 9 / F9 ]：即時讀檔。  [ Z ]：中英切換。',
          ],
        },
        {
          title: '二、匿蹤潛入與多武器系統',
          color: '#ff9e00',
          items: [
            '[ F ] 拔槍 / 收槍：收起武器可解除警戒；收槍時近身攻擊觸發【伏擊爆擊】(200% DMG)。',
            '[ Q ] 切換武器：雷射手槍 (高射程)、電漿步槍 (極高破甲)、消音飛鏢槍 (無聲射擊不引怪)。',
            '[ C ] 全像偽裝：消耗能量開啟光學匿蹤，可直接穿越巡邏無人機視野。',
          ],
        },
        {
          title: '三、戰術消耗品與生化改裝',
          color: '#c77dff',
          items: [
            '[ 1 ] 奈米醫療包 (+40 HP)  |  [ 2 ] 高能電池 (+50 EN)  |  [ 3 ] 電磁脈衝手榴彈 (範圍癱瘓)。',
            '[ U ] 生化診所：皮下裝甲 (+10 DEF)、目鏡 HUD (敵方血條追蹤)、神經加速 (+15%閃避/爆擊)、過載核心 (+50 EN)。',
          ],
        },
        {
          title: '四、終端機入侵與分區戰略',
          color: '#ff5252',
          items: [
            '終端機指令：輸入 HELP 查看命令，CLEAR_ALARM 解除全域警戒，OVERRIDE 關閉力場屏障。',
            '分區穿梭：解鎖 01 檢查哨後，可搭乘東側電梯往返 Sector 1 (街道) 與 Sector 2 (製造廠)。',
            '多結局核心：深入 Sector 2 東側佐格主腦終端，可執行【過載自毀】、【病毒改寫】或【軌道撤離】。',
            '秘技測試：[ V ] 破除全圖視野限制（全知透鏡）  |  [ X ] 完整呈現小地圖測繪藍圖  |  [ B ] 背景音樂開關',
          ],
        },
      ]
    : [
        {
          title: 'I. TACTICAL MOVEMENT & BASIC CONTROLS',
          color: '#00ffcc',
          items: [
            '[ W A S D / Arrow Keys ] : Move and navigate sector street grid.',
            '[ SPACE ] : Wait a turn in position (allow patrols to pass).',
            '[ E ] : Toggle door state.  [ T ] : Interact with NPCs / Terminals.',
            '[ 8 / F5 ] : Quick Save.  [ 9 / F9 ] : Quick Load.  [ Z ] : Toggle EN/ZH.',
          ],
        },
        {
          title: 'II. STEALTH INFILTRATION & WEAPONS ARSENAL',
          color: '#ff9e00',
          items: [
            '[ F ] Draw/Holster Weapon: Holstered melee triggers [Ambush Crit] (200% DMG).',
            '[ Q ] Cycle Armament: Laser Pistol, Plasma Rifle, or Dart Gun (Suppressed firing).',
            '[ C ] Holo-Disguise: Drain energy to slip past drone detection cones unseen.',
          ],
        },
        {
          title: 'III. TACTICAL CONSUMABLES & CYBERWARE CLINIC',
          color: '#c77dff',
          items: [
            '[ 1 ] Nanite Medkit (+40 HP) | [ 2 ] Battery (+50 EN) | [ 3 ] EMP Grenade (AOE Stun).',
            '[ U ] Cyber-Clinic: Dermal Armor (+10 DEF), Optic HUD (Enemy HP), Reflex Booster, Power Core.',
          ],
        },
        {
          title: 'IV. TERMINAL HACKING & MULTI-ENDINGS',
          color: '#ff5252',
          items: [
            'Terminal Commands: Type HELP for commands, CLEAR_ALARM to drop alert, OVERRIDE for forcefields.',
            'Sector Transit: Take the elevator to travel between Sector 1 and Sector 2 Fab-Plex.',
            'Endgame Nexus: Breach Central Overmind terminal for OVERLOAD, SUBVERSION, or EVACUATION endings.',
            'Testing Cheats: [ V ] Toggle Omni-Vision (Breaks vision limits) | [ X ] Toggle Full Minimap Blueprint | [ B ] Toggle Synth BGM',
          ],
        },
      ];

  let secY = y + 48;
  sections.forEach((sec) => {
    ctx.fillStyle = sec.color;
    ctx.font = 'bold 12px monospace';
    ctx.shadowColor = sec.color;
    ctx.shadowBlur = 4;
    ctx.fillText?.(sec.title, x + 24, secY);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#d0e4f2';
    ctx.font = '11px monospace';
    sec.items.forEach((item, idx) => {
      ctx.fillText?.('• ' + item, x + 32, secY + 18 + idx * 16);
    });

    secY += 24 + sec.items.length * 16 + 8;
  });

  // 底部關閉提示
  const pulse = 0.7 + 0.3 * Math.sin(now * 0.008);
  ctx.fillStyle = `rgba(0, 240, 255, ${pulse})`;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText?.(
    isZh ? '按 [ H ] 或 [ ESC ] 或 [ 空格鍵 ] 關閉特工手冊' : 'PRESS [ H ] OR [ ESC ] OR [ SPACE ] TO CLOSE MANUAL',
    x + boxW / 2,
    y + boxH - 18
  );

  ctx.restore?.();
}
