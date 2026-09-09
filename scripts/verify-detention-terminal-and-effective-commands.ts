import { GameEngine } from '../src/game';
import { TerminalSession } from '../src/terminal';

function createMockCanvas(w = 960, h = 600): any {
  const drawnTexts: string[] = [];
  return {
    width: w,
    height: h,
    drawnTexts,
    getContext: () => ({
      save: () => {},
      restore: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillText: (text: string) => {
        drawnTexts.push(text);
      },
      measureText: () => ({ width: 10 }),
      arc: () => {},
      fill: () => {},
      closePath: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    }),
    parentElement: { style: {} },
  };
}

console.log('=== 開始驗證監禁室附近 Terminal 與有效指令過濾系統 ===\n');

const canvas = createMockCanvas(960, 600);
const game = new GameEngine(canvas as any);

// 1. 驗證 Sector 1 監禁室附近存在終端機 (TERMINAL_DETENTION_SECURITY)
console.log('1. 驗證 Sector 1 監禁室守衛哨終端機配置...');
const sec1Terminals = (game.map as any).terminals;
const detentionTerm = sec1Terminals?.TERMINAL_DETENTION_SECURITY || 
  Object.values(sec1Terminals || {}).find((t: any) => t?.position?.x === 32 && t?.position?.y === 4);

if (!detentionTerm) {
  throw new Error('❌ 未在 Sector 1 (32, 4) 找到監禁室守衛哨終端機 (TERMINAL_DETENTION_SECURITY)');
}
console.log(`✅ 成功在 (32, 4) 找到監禁室周邊終端機: ${detentionTerm.name || detentionTerm.id}`);

// 2. 驗證特工可以在該終端機成功進行 CHECKIN
console.log('\n2. 測試在監禁室終端機執行 CHECKIN...');
const detentionSession = new TerminalSession(detentionTerm);
const checkinRes = detentionSession.executeCommand('CHECKIN');
if (!checkinRes.checkedIn) {
  throw new Error('❌ 在監禁室終端機執行 CHECKIN 失敗');
}
console.log('✅ 監禁室終端機 CHECKIN 執行成功！');

// 3. 測試每個終端機只保留有效果的 command
console.log('\n3. 驗證非核心終端機只保留有效果的指令（過濾掉 OVERLOAD, SUBVERSION, BREACH 等）...');
const safehouseTerm = sec1Terminals.TERMINAL_SAFEHOUSE_LOG;
const safehouseSession = new TerminalSession(safehouseTerm);

const effectiveCmds = safehouseSession.getEffectiveCommands();
const cmdNames = effectiveCmds.map((c: any) => (typeof c === 'string' ? c : c.cmd));

console.log('Safehouse 終端機有效指令清單:', cmdNames);

// 不應包含核心專屬指令
if (cmdNames.includes('OVERLOAD') || cmdNames.includes('SUBVERSION') || cmdNames.includes('BREACH')) {
  throw new Error('❌ 非核心終端機不應包含核心專屬終局指令 (OVERLOAD/SUBVERSION/BREACH)');
}
// Safehouse 無防護罩連動，不應包含 OVERRIDE
if (cmdNames.includes('OVERRIDE')) {
  throw new Error('❌ 無防護罩連動的終端機不應顯示 OVERRIDE 指令');
}
// 應包含常規有效指令
if (!cmdNames.includes('STATUS') || !cmdNames.includes('LOGS') || !cmdNames.includes('CHECKIN') || !cmdNames.includes('CLEAR_ALARM')) {
  throw new Error('❌ 缺少基本有效指令 (STATUS, LOGS, CHECKIN, CLEAR_ALARM)');
}
console.log('✅ Safehouse 終端機成功過濾無效指令！');

// 4. 驗證 Checkpoint 終端機有防護罩時包含 OVERRIDE
console.log('\n4. 驗證 Checkpoint 終端機具備 OVERRIDE 指令...');
const checkpointTerm = sec1Terminals.TERMINAL_CHECKPOINT_CONTROL;
const checkpointSession = new TerminalSession(checkpointTerm);
const cpCmdNames = checkpointSession.getEffectiveCommands().map((c: any) => (typeof c === 'string' ? c : c.cmd));
if (!cpCmdNames.includes('OVERRIDE')) {
  throw new Error('❌ 連動防護罩的 Checkpoint 終端機應包含 OVERRIDE 指令');
}
console.log('✅ Checkpoint 終端機正確具備 OVERRIDE 指令！');

// 5. 驗證 HELP 指令輸出與畫面顯示只包含有效指令
console.log('\n5. 測試 HELP 指令與終端機畫面呈現...');
const helpRes = safehouseSession.executeCommand('help');
if (helpRes.output.includes('OVERLOAD') || helpRes.output.includes('SUBVERSION')) {
  throw new Error('❌ 普通終端機的 HELP 輸出不應列出核心終局指令');
}
console.log('✅ HELP 指令輸出正確過濾無效指令！');

// 6. 測試汲取能量後 SIPHON 自動從有效指令中移除
console.log('\n6. 測試 SIPHON 汲取後自動從有效指令中移除...');
if (!safehouseSession.getEffectiveCommands().map((c: any) => (typeof c === 'string' ? c : c.cmd)).includes('SIPHON')) {
  throw new Error('❌ 未汲取前應有 SIPHON 指令');
}
safehouseSession.executeCommand('siphon');
if (safehouseSession.getEffectiveCommands().map((c: any) => (typeof c === 'string' ? c : c.cmd)).includes('SIPHON')) {
  throw new Error('❌ 電量汲取完後 SIPHON 不應再出現在有效指令清單中');
}
console.log('✅ 電量汲取後 SIPHON 自動移出有效指令清單！');

// 7. 測試 Renderer 繪製終端機畫面顯示可用指令
console.log('\n7. 測試 Renderer drawTerminal 呈現可用指令...');
canvas.drawnTexts.length = 0;
game.activeTerminal = safehouseSession;
game.render();
const hasCommandsInHud = canvas.drawnTexts.some((t: string) => t.includes('COMMAND') || t.includes('STATUS') || t.includes('CHECKIN'));
if (!hasCommandsInHud) {
  throw new Error('❌ Renderer drawTerminal 畫面上未呈現可用指令標籤');
}
console.log('✅ Renderer drawTerminal 畫面上成功呈現可用指令標籤！');

console.log('\n🎉 監禁室周邊 Terminal 與有效指令過濾系統全數驗證通過！');
