import { GameEngine } from '../src/game';
import { TileType } from '../src/types';

console.log('=== 開始驗證：門與通道鄰近感知提示訊息 (Door & Passage Proximity Hints) ===\n');

function createMockCanvas(): any {
  const ctx: any = {
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
    fillText: () => {},
    measureText: (text: string) => ({ width: text.length * 8 }),
    setLineDash: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    drawImage: () => {},
  };
  return {
    getContext: (type: string) => (type === '2d' ? ctx : null),
    width: 800,
    height: 600,
  };
}

const game = new GameEngine(createMockCanvas() as any);
game.language = 'zh';

// 1. 測試：玩家位於關閉的門下方 (門在玩家上方)
console.log('1. 測試：門在上方時提示「上方似乎有一扇門」...');
const testMap = game.map;
// 在 (15, 15) 放置一扇關閉的氣密門
testMap.tiles[15][15] = TileType.DOOR_CLOSED;

// 玩家站在 (15, 16)（門的下方）
game.player.x = 15;
game.player.y = 16;
game.player.facing = 'up';
game.tick();

let lastMsg = game.messages[game.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('上方') || !lastMsg.text.includes('門')) {
  throw new Error(`門在上方時提示不正確，最新訊息: "${lastMsg?.text}"`);
}
console.log(`✅ 上方門提示驗證通過: "${lastMsg.text}"`);

// 2. 測試：門在下方時提示「下方...」
console.log('\n2. 測試：門在下方時提示「下方似乎有一扇門」...');
game.player.x = 15;
game.player.y = 14;
game.player.facing = 'down';
game.tick();

lastMsg = game.messages[game.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('下方') || !lastMsg.text.includes('門')) {
  throw new Error(`門在下方時提示不正確，最新訊息: "${lastMsg?.text}"`);
}
console.log(`✅ 下方門提示驗證通過: "${lastMsg.text}"`);

// 3. 測試：門在右方時提示「右方...」
console.log('\n3. 測試：門在右方時提示「右方似乎有一扇門」...');
game.player.x = 14;
game.player.y = 15;
game.player.facing = 'right';
game.tick();

lastMsg = game.messages[game.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('右方') || !lastMsg.text.includes('門')) {
  throw new Error(`門在右方時提示不正確，最新訊息: "${lastMsg?.text}"`);
}
console.log(`✅ 右方門提示驗證通過: "${lastMsg.text}"`);

// 4. 測試：門在左方時提示「左方...」
console.log('\n4. 測試：門在左方時提示「左方似乎有一扇門」...');
game.player.x = 16;
game.player.y = 15;
game.player.facing = 'left';
game.tick();

lastMsg = game.messages[game.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('左方') || !lastMsg.text.includes('門')) {
  throw new Error(`門在左方時提示不正確，最新訊息: "${lastMsg?.text}"`);
}
console.log(`✅ 左方門提示驗證通過: "${lastMsg.text}"`);

// 5. 測試：原地不動或重複 tick 時不重複洗頻
console.log('\n5. 測試：同一位置同一扇門不洗頻重複提示...');
const countBefore = game.messages.length;
game.tick();
const countAfter = game.messages.length;
if (countAfter !== countBefore) {
  throw new Error(`原地停留時發生重複洗頻，訊息數量由 ${countBefore} 增至 ${countAfter}`);
}
console.log('✅ 原地停留防洗頻驗證通過！');

// 6. 測試：英文語系 (English Localization)
console.log('\n6. 測試：英文環境提示...');
game.language = 'en';
// 移動到遠處再移回來觸發
game.player.x = 20;
game.player.y = 20;
game.tick();
// 移回 (15, 16)
game.player.x = 15;
game.player.y = 16;
game.player.facing = 'up';
game.tick();

lastMsg = game.messages[game.messages.length - 1];
if (!lastMsg || !lastMsg.text.includes('door') || !lastMsg.text.includes('above')) {
  throw new Error(`英文語系提示不正確，最新訊息: "${lastMsg?.text}"`);
}
console.log(`✅ 英文環境門提示驗證通過: "${lastMsg.text}"`);

console.log('\n🎉 所有門與通道鄰近感知提示訊息驗證 100% 通過！');
