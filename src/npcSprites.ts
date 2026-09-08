// @ts-nocheck
// eslint-disable

// NPC 專屬角色向量精緻繪製模組 (Unique Procedural Vector Sprites for all NPCs)
export function drawCustomNPCSprite(
  ctx: CanvasRenderingContext2D,
  npc: any,
  x: number,
  y: number,
  size: number,
  visible: boolean = true,
  time: number = 0
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const id = String(npc?.id || '').toLowerCase();
  const role = String(npc?.role || npc?.name || '').toUpperCase();
  const themeColor = String(
    npc?.avatarColor ||
      (id.includes('vance') || role.includes('MEDIC')
        ? '#00e5ff'
        : id.includes('kira') || role.includes('KIRA')
        ? '#ff6d00'
        : id.includes('hiro')
        ? '#ff9e00'
        : id.includes('sylvia')
        ? '#7cffcb'
        : id.includes('ghost')
        ? '#9d4edd'
        : id.includes('jackal')
        ? '#ff5252'
        : id.includes('zero')
        ? '#b388ff'
        : id.includes('elena')
        ? '#ff4081'
        : '#ffea00')
  );

  ctx.save();
  if (!visible) {
    ctx.globalAlpha = 0.4;
  }

  // 1. 地面柔和接觸陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.35, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // 2. 角色各部位專屬分流繪製
  if (id.includes('kira') || role.includes('KIRA') || role.includes('LEADER')) {
    drawKira(ctx, cx, cy, size, themeColor, time);
  } else if (id.includes('vance') || role.includes('VANCE') || role.includes('MEDIC')) {
    drawDocVance(ctx, cx, cy, size, themeColor, time);
  } else if (id.includes('hiro') || role.includes('HIRO') || role.includes('RAMEN')) {
    drawHiro(ctx, cx, cy, size, themeColor, time);
  } else if (id.includes('sylvia') || role.includes('SYLVIA') || role.includes('BOTANIST')) {
    drawSylvia(ctx, cx, cy, size, themeColor, time);
  } else if (id.includes('ghost') || role.includes('GHOST') || role.includes('INFILTRATOR')) {
    drawGhost(ctx, cx, cy, size, themeColor, time);
  } else if (id.includes('jackal') || role.includes('JACKAL') || role.includes('BROKER')) {
    drawJackal(ctx, cx, cy, size, themeColor, time);
  } else if (id.includes('zero') || role.includes('ZERO-ONE') || role.includes('CYBORG')) {
    drawZeroOne(ctx, cx, cy, size, themeColor, time);
  } else if (id.includes('elena') || role.includes('ELENA') || role.includes('ARCHIVIST')) {
    drawElena(ctx, cx, cy, size, themeColor, time);
  } else {
    // 預設/Jax：暗巷情報商
    drawJax(ctx, cx, cy, size, themeColor, time);
  }

  // 3. 頭頂浮動交談提示框 (TALK [T] Prompt)
  const bob = Math.sin(time * 0.005) * 2;
  const tagY = cy - size * 0.46 + bob;

  ctx.fillStyle = 'rgba(5, 15, 22, 0.88)';
  ctx.fillRect(cx - 24, tagY - 8, 48, 14);

  ctx.strokeStyle = themeColor;
  ctx.shadowColor = themeColor;
  ctx.shadowBlur = 4;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 24, tagY - 8, 48, 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TALK [T]', cx, tagY - 1);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// 1. Kira (火花指揮官): 橙紅軍官高領外套、反抗軍單肩斜帶、紅色幹練短髮、戰術通訊耳麥
function drawKira(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 皮靴
  ctx.fillStyle = '#11141a';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 橙紅高領軍官戰術大衣
  ctx.fillStyle = '#3a1f18';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.36);

  // 亮橘反抗軍斜背帶與合金搭扣
  ctx.fillStyle = '#ff6d00';
  ctx.shadowColor = '#ff6d00';
  ctx.shadowBlur = 4;
  ctx.fillRect(cx - size * 0.18, cy - size * 0.1, size * 0.36, 4);
  ctx.fillRect(cx + size * 0.08, cy - size * 0.06, 4, size * 0.24);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(cx - 3, cy - size * 0.04, 6, 6);
  ctx.shadowBlur = 0;

  // 臉部與膚色
  ctx.fillStyle = '#f0be9d';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 紅棕色幹練短髮
  ctx.fillStyle = '#b73212';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.26, size * 0.14, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + size * 0.14, cy - size * 0.18);
  ctx.lineTo(cx - size * 0.14, cy - size * 0.18);
  ctx.closePath();
  ctx.fill();

  // 戰術通訊耳麥天線
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.14, cy - size * 0.2);
  ctx.lineTo(cx - size * 0.18, cy - size * 0.32);
  ctx.stroke();
  ctx.fillStyle = '#00f0ff';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.34, 3, 3);

  // 橙色光學目鏡
  ctx.fillStyle = '#ff6d00';
  ctx.shadowColor = '#ff6d00';
  ctx.shadowBlur = 5;
  ctx.fillRect(cx - size * 0.08, cy - size * 0.23, size * 0.16, 3);
  ctx.shadowBlur = 0;
}

// 2. Doc Vance (生化醫官): 白青色醫官大褂、胸前十字發光醫護標記、灰白鬍茬、雙管光纖聽診器
function drawDocVance(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 黑色防護靴
  ctx.fillStyle = '#0f171e';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 醫官白青色戰術大褂 (深色內襯)
  ctx.fillStyle = '#0b1d28';
  ctx.fillRect(cx - size * 0.18, cy - size * 0.12, size * 0.36, size * 0.36);
  ctx.fillStyle = '#e1f5fe';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.1, size * 0.1, size * 0.34);
  ctx.fillRect(cx + size * 0.1, cy - size * 0.1, size * 0.1, size * 0.34);

  // 胸前發光綠/青十字
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 5;
  ctx.fillRect(cx - 1.5, cy - size * 0.04, 3, 10);
  ctx.fillRect(cx - 5, cy - size * 0.04 + 3.5, 10, 3);
  ctx.shadowBlur = 0;

  // 雙管光纖聽診器掛繩
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.1, size * 0.12, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  // 臉部膚色與灰白鬍茬
  ctx.fillStyle = '#d29b7a';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 灰白頭髮與鬢角
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.26, size * 0.14, Math.PI * 0.9, Math.PI * 2.1);
  ctx.fill();
  // 灰白小鬍子
  ctx.fillStyle = '#cfd8dc';
  ctx.fillRect(cx - 4, cy - size * 0.17, 8, 3);

  // 單邊青色診斷目鏡
  ctx.fillStyle = '#00e5ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 5;
  ctx.fillRect(cx + 1, cy - size * 0.23, 7, 3.5);
  ctx.shadowBlur = 0;
}

// 3. Hiro (商店街拉麵商): 廚師白頭巾(Hachimaki)、深藍圍裙(Maekake)、手持湯勺/麵碗與微弱熱氣
function drawHiro(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 木屐/黑鞋
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 白色廚師上衣 + 深藍色日式圍裙
  ctx.fillStyle = '#eceff1';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.36);
  ctx.fillStyle = '#0d47a1';
  ctx.fillRect(cx - size * 0.16, cy - size * 0.02, size * 0.32, size * 0.26);

  // 圍裙金色「麵」字圖騰標記
  ctx.fillStyle = '#ffd54f';
  ctx.fillRect(cx - 3, cy + size * 0.05, 6, 2);
  ctx.fillRect(cx - 1, cy + size * 0.07, 2, 6);

  // 雙手捧著一碗熱拉麵
  ctx.fillStyle = '#d32f2f'; // 紅色拉麵碗
  ctx.beginPath();
  ctx.arc(cx - size * 0.1, cy + size * 0.08, size * 0.1, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#fff9c4'; // 金黃高湯
  ctx.fillRect(cx - size * 0.18, cy + size * 0.06, size * 0.16, 2);

  // 不銹鋼湯勺握在右手
  ctx.strokeStyle = '#b0bec5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.14, cy + size * 0.18);
  ctx.lineTo(cx + size * 0.12, cy - size * 0.02);
  ctx.stroke();
  ctx.fillStyle = '#cfd8dc';
  ctx.beginPath();
  ctx.arc(cx + size * 0.12, cy - size * 0.04, 3, 0, Math.PI * 2);
  ctx.fill();

  // 拉麵熱氣蒸汽微粒動畫
  const steamY = (time * 0.04) % 16;
  const steamAlpha = Math.max(0, 1 - steamY / 16);
  ctx.fillStyle = `rgba(255, 255, 255, ${steamAlpha * 0.6})`;
  ctx.beginPath();
  ctx.arc(cx - size * 0.1 + Math.sin(time * 0.008) * 3, cy + size * 0.04 - steamY, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 臉部膚色
  ctx.fillStyle = '#e0a98b';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 黑色短髮 + 額頭白色綁巾(Hachimaki)
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.26, size * 0.14, Math.PI, Math.PI * 2);
  ctx.fill();
  // 白頭巾
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - size * 0.14, cy - size * 0.27, size * 0.28, 4);
  // 頭巾飄帶結
  ctx.fillRect(cx + size * 0.12, cy - size * 0.28, 4, 8);

  // 瞇瞇眼親切笑容
  ctx.strokeStyle = '#424242';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx - 4, cy - size * 0.21, 2, Math.PI, 0);
  ctx.arc(cx + 4, cy - size * 0.21, 2, Math.PI, 0);
  ctx.stroke();
}

// 4. Sylvia (仿生公園學者): 薄荷綠生化背心、額頭護目鏡、腰帶發光試管、肩上發光孢子
function drawSylvia(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 防護靴
  ctx.fillStyle = '#1b3022';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 深綠工作服 + 薄荷綠生化防護背心
  ctx.fillStyle = '#132a1f';
  ctx.fillRect(cx - size * 0.18, cy - size * 0.12, size * 0.36, size * 0.36);
  ctx.fillStyle = '#00bfa5';
  ctx.fillRect(cx - size * 0.16, cy - size * 0.1, size * 0.32, size * 0.24);

  // 腰帶掛載發光試管 (青/綠生化樣品)
  ctx.fillStyle = '#00e676';
  ctx.shadowColor = '#00e676';
  ctx.shadowBlur = 4;
  ctx.fillRect(cx - size * 0.12, cy + size * 0.1, 3, 8);
  ctx.fillStyle = '#00b0ff';
  ctx.shadowColor = '#00b0ff';
  ctx.fillRect(cx - size * 0.06, cy + size * 0.1, 3, 8);
  ctx.shadowBlur = 0;

  // 肩部微型發光機械蜜蜂/生化孢子微光
  const sporePulse = 0.5 + 0.5 * Math.sin(time * 0.008);
  ctx.fillStyle = `rgba(124, 255, 203, ${sporePulse})`;
  ctx.shadowColor = '#7cffcb';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(cx + size * 0.18, cy - size * 0.12, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 臉部白皙膚色
  ctx.fillStyle = '#fce4ec';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 栗色馬尾長髮
  ctx.fillStyle = '#4e342e';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.26, size * 0.14, Math.PI * 0.8, Math.PI * 2.2);
  ctx.fill();
  ctx.fillRect(cx - size * 0.18, cy - size * 0.24, 4, size * 0.28); // 馬尾

  // 額頭推起之黃銅/翠綠護目鏡
  ctx.fillStyle = '#ffb300';
  ctx.fillRect(cx - size * 0.1, cy - size * 0.31, size * 0.2, 4);
  ctx.fillStyle = '#7cffcb';
  ctx.fillRect(cx - size * 0.08, cy - size * 0.3, 5, 2.5);
  ctx.fillRect(cx + size * 0.01, cy - size * 0.3, 5, 2.5);

  // 柔和綠色眼睛
  ctx.fillStyle = '#00e676';
  ctx.fillRect(cx - 5, cy - size * 0.22, 3, 2.5);
  ctx.fillRect(cx + 2, cy - size * 0.22, 3, 2.5);
}

// 5. Ghost (反抗軍滲透幽靈): 深紫色兜帽斗篷、面部全息流光面罩、腕部全息投影
function drawGhost(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 靜音戰術靴
  ctx.fillStyle = '#0a0512';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 深紫/黑潛行風衣斗篷
  ctx.fillStyle = '#210d3a';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.38);

  // 腕部微型全息投影光束 (左手)
  const holoGlow = 0.4 + 0.3 * Math.sin(time * 0.01);
  ctx.fillStyle = `rgba(157, 78, 221, ${holoGlow})`;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.16, cy + size * 0.08);
  ctx.lineTo(cx - size * 0.26, cy - size * 0.05);
  ctx.lineTo(cx - size * 0.12, cy - size * 0.08);
  ctx.closePath();
  ctx.fill();

  // 尖頂深紫刺客兜帽
  ctx.fillStyle = '#3c096c';
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.4);
  ctx.lineTo(cx + size * 0.18, cy - size * 0.15);
  ctx.lineTo(cx - size * 0.18, cy - size * 0.15);
  ctx.closePath();
  ctx.fill();

  // 兜帽陰影深處
  ctx.fillStyle = '#10002b';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // 面部橫條全息紫色流光面罩
  ctx.fillStyle = '#c77dff';
  ctx.shadowColor = '#c77dff';
  ctx.shadowBlur = 8;
  ctx.fillRect(cx - size * 0.09, cy - size * 0.23, size * 0.18, 3.5);

  // 閃爍數據脈衝點
  if (Math.sin(time * 0.015) > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - size * 0.04, cy - size * 0.23, 3, 3.5);
  }
  ctx.shadowBlur = 0;
}

// 6. Jackal (黑市軍火掮客): 緋紅皮質背心、重型雙濾罐防毒面罩、彈藥斜挎帶、紅色機械義眼
function drawJackal(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 重裝鐵頭皮靴
  ctx.fillStyle = '#1c1b1b';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 緋紅皮質背心 + 黑色內襯
  ctx.fillStyle = '#212121';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.36);
  ctx.fillStyle = '#b71c1c';
  ctx.fillRect(cx - size * 0.16, cy - size * 0.1, size * 0.32, size * 0.32);

  // 霰彈/EMP斜背彈藥帶
  ctx.fillStyle = '#ffd600';
  for (let b = 0; b < 4; b++) {
    ctx.fillRect(cx - size * 0.12 + b * 6, cy - size * 0.06 + b * 4, 4, 3);
  }

  // 臉部硬朗膚色
  ctx.fillStyle = '#ba7b56';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 黑色凌亂頭髮
  ctx.fillStyle = '#212121';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.27, size * 0.14, Math.PI * 0.9, Math.PI * 2.1);
  ctx.fill();

  // 重型雙濾罐防毒面罩 (覆蓋下半臉)
  ctx.fillStyle = '#37474f';
  ctx.fillRect(cx - 8, cy - size * 0.19, 16, 7);
  ctx.fillStyle = '#455a64';
  ctx.beginPath();
  ctx.arc(cx - 8, cy - size * 0.16, 3.5, 0, Math.PI * 2);
  ctx.arc(cx + 8, cy - size * 0.16, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 左眼正常冷漠，右眼緋紅機械義眼 (十字準星)
  ctx.fillStyle = '#ff1744';
  ctx.shadowColor = '#ff1744';
  ctx.shadowBlur = 6;
  ctx.fillRect(cx + 2, cy - size * 0.24, 4, 4);
  ctx.shadowBlur = 0;
}

// 7. Zero-One (叛逃覺醒生化人): 震撼的半人半機械構造，紫色超導光纖、紫水晶機械眼、背後金屬散熱脊椎
function drawZeroOne(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 合金義肢腳步
  ctx.fillStyle = '#263238';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillStyle = '#b388ff';
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 軀幹：右側人類衣服，左側裸露機械金屬電路
  ctx.fillStyle = '#37474f';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.2, size * 0.36);
  ctx.fillStyle = '#1a237e';
  ctx.fillRect(cx, cy - size * 0.12, size * 0.2, size * 0.36);

  // 背部紫色金屬散熱脊椎
  const pulse = 0.6 + 0.4 * Math.sin(time * 0.01);
  ctx.fillStyle = `rgba(179, 136, 255, ${pulse})`;
  ctx.shadowColor = '#b388ff';
  ctx.shadowBlur = 6;
  ctx.fillRect(cx - 1.5, cy - size * 0.08, 3, size * 0.3);
  ctx.shadowBlur = 0;

  // 臉部：右側人類蒼白膚色，左側金屬機械顱骨
  ctx.fillStyle = '#cfd8dc'; // 右半臉
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, Math.PI * 0.5, Math.PI * 1.5);
  ctx.fill();

  ctx.fillStyle = '#455a64'; // 左半臉機械金屬
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, Math.PI * 1.5, Math.PI * 2.5);
  ctx.fill();

  // 左臉裸露紫色超導光纖束
  ctx.strokeStyle = '#7c4dff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 2, cy - size * 0.28);
  ctx.lineTo(cx + 7, cy - size * 0.18);
  ctx.stroke();

  // 左眼：耀眼紫水晶機械義眼
  ctx.fillStyle = '#b388ff';
  ctx.shadowColor = '#b388ff';
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.arc(cx + 4.5, cy - size * 0.22, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // 右眼：暗淡人類眼眸
  ctx.fillStyle = '#37474f';
  ctx.shadowBlur = 0;
  ctx.fillRect(cx - 6, cy - size * 0.23, 3, 2);
}

// 8. Elena (失落音軌保管人): 復古大風衣、粉紫耳罩式耳機、銀髮高盤髻、手持卡帶隨身聽
function drawElena(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 復古皮鞋
  ctx.fillStyle = '#2d1b16';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 米色復古長風衣 + 霓虹粉翻領
  ctx.fillStyle = '#d7ccc8';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.38);
  ctx.fillStyle = '#ff4081';
  ctx.fillRect(cx - size * 0.14, cy - size * 0.1, 4, size * 0.22);
  ctx.fillRect(cx + size * 0.08, cy - size * 0.1, 4, size * 0.22);

  // 手持復古卡帶隨身聽 (右手)
  ctx.fillStyle = '#212121';
  ctx.fillRect(cx + size * 0.08, cy + size * 0.05, size * 0.16, size * 0.12);
  // 卡帶滾輪轉動動畫
  ctx.fillStyle = '#ffd54f';
  ctx.beginPath();
  ctx.arc(cx + size * 0.12, cy + size * 0.11, 2, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.18, cy + size * 0.11, 2, 0, Math.PI * 2);
  ctx.fill();

  // 臉部慈祥膚色
  ctx.fillStyle = '#ecd0be';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 銀白色高盤髮髻 + 銀簪天線
  ctx.fillStyle = '#cfd8dc';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.26, size * 0.14, Math.PI * 0.8, Math.PI * 2.2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.34, size * 0.08, 0, Math.PI * 2); // 盤髮球
  ctx.fill();

  // 頸部粉紫復古頭戴式大耳機
  ctx.fillStyle = '#ff80ab';
  ctx.shadowColor = '#ff80ab';
  ctx.shadowBlur = 5;
  ctx.fillRect(cx - size * 0.16, cy - size * 0.18, 5, 8);
  ctx.fillRect(cx + size * 0.12, cy - size * 0.18, 5, 8);
  ctx.strokeStyle = '#ff80ab';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.15, size * 0.15, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// 9. Jax / 預設 (暗巷情報商): 暗巷帽T、亮黃護目鏡、斜挎信用點晶片包
function drawJax(ctx: any, cx: number, cy: number, size: number, color: string, time: number) {
  // 街頭帆布鞋
  ctx.fillStyle = '#101720';
  ctx.fillRect(cx - size * 0.16, cy + size * 0.22, size * 0.11, size * 0.16);
  ctx.fillRect(cx + size * 0.05, cy + size * 0.22, size * 0.11, size * 0.16);

  // 深藍/黑街頭帽T風衣
  ctx.fillStyle = '#1e2530';
  ctx.fillRect(cx - size * 0.2, cy - size * 0.12, size * 0.4, size * 0.36);

  // 斜挎信用點小包 (黃色發光晶片)
  ctx.strokeStyle = '#ffea00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.16, cy - size * 0.08);
  ctx.lineTo(cx + size * 0.14, cy + size * 0.18);
  ctx.stroke();
  ctx.fillStyle = '#ffd600';
  ctx.shadowColor = '#ffd600';
  ctx.shadowBlur = 4;
  ctx.fillRect(cx + size * 0.08, cy + size * 0.12, 7, 6);
  ctx.shadowBlur = 0;

  // 臉部膚色
  ctx.fillStyle = '#dca27d';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.22, size * 0.13, 0, Math.PI * 2);
  ctx.fill();

  // 黑色刺蝟短髮與外罩帽兜
  ctx.fillStyle = '#141820';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.26, size * 0.14, Math.PI, Math.PI * 2);
  ctx.fill();

  // 亮黃色賽博飛行員護目鏡
  ctx.fillStyle = '#ffea00';
  ctx.shadowColor = '#ffea00';
  ctx.shadowBlur = 6;
  ctx.fillRect(cx - size * 0.08, cy - size * 0.23, size * 0.16, 3.5);
  ctx.shadowBlur = 0;
}
