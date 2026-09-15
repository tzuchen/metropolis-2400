// scripts/verify-intro-briefing-content.ts
// 驗證開局任務簡報內容更新為全新的特工行動原則與日記使用指南

import { drawTitleStoryModal } from '../src/titleStoryModal';

console.log('=== 開始驗證：開局任務簡報內容更新 ===\n');

function createMockCanvas(width = 800, height = 600) {
  const drawnTexts: string[] = [];

  const ctx: any = {
    font: '13px monospace',
    fillStyle: '#fff',
    strokeStyle: '#fff',
    lineWidth: 1,
    textAlign: 'left',
    textBaseline: 'top',
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    rect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    stroke: () => {},
    fill: () => {},
    clip: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fillText: (text: string) => {
      drawnTexts.push(String(text));
    },
    measureText: (text: string) => ({ width: text.length * 8 }),
    setLineDash: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
  };

  return { ctx, drawnTexts };
}

// 1. 測試中文模式 (zh) 下的渲染與內容（多個滾動偏移量以涵蓋所有視口區塊）
console.log('1. 驗證中文模式簡報內容...');
const mockZh = createMockCanvas();
for (let offset = 0; offset <= 1000; offset += 150) {
  drawTitleStoryModal(800, 600, mockZh.ctx, 1000, 'zh', offset);
}

const allZhText = mockZh.drawnTexts.join('\n');

const requiredZhSnippets = [
  '你是 Metropolis 2400 的一名特工',
  '這座城市不會替你解釋一切',
  '你只有當下看得見的世界',
  '行動原則',
  '在移動、開門、交談、終端機、戰鬥或出現新提示後',
  '特工日記：你的長期記憶',
  '按 P 開啟日記',
  '安全屋：西門通往主街',
  '閱讀日記',
  '你的目標不是最快通關',
];

for (const snippet of requiredZhSnippets) {
  if (!allZhText.includes(snippet)) {
    throw new Error(`中文簡報內容缺少必要片段: "${snippet}"`);
  }
}
console.log('✅ 中文模式任務簡報所有關鍵內容驗證通過！');

// 2. 測試英文模式 (en) 下的渲染與內容
console.log('\n2. 驗證英文模式簡報內容...');
const mockEn = createMockCanvas();
for (let offset = 0; offset <= 1000; offset += 150) {
  drawTitleStoryModal(800, 600, mockEn.ctx, 1000, 'en', offset);
}

const allEnText = mockEn.drawnTexts.join('\n');
const requiredEnSnippets = [
  'You are an operative in Metropolis 2400',
  'OPERATIONAL PRINCIPLES',
  'YOUR LONG-TERM MEMORY',
  'REVIEWING YOUR JOURNAL',
  'Your goal is not speedrunning',
];

for (const snippet of requiredEnSnippets) {
  if (!allEnText.includes(snippet)) {
    throw new Error(`英文簡報內容缺少必要片段: "${snippet}"`);
  }
}
console.log('✅ 英文模式任務簡報所有關鍵內容驗證通過！');

console.log('\n🎉 開局任務簡報內容更新 100% 驗證通過！');
