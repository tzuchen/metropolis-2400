import type { TerminalData } from './types';

export interface TerminalCommandResult {
  output: string;
  shouldExit?: boolean;
  disabledForcefield?: string;
  unlockedDoor?: string;
  clearedAlert?: boolean;
  energyGain?: number;
  checkedIn?: boolean;
  disarmCollar?: boolean;
  endgameChoice?: 'OVERLOAD' | 'SUBVERSION' | 'EVACUATION' | 'AWAKEN';
}

export interface TerminalContext {
  player?: {
    defeatedBoss?: boolean;
    hasDefeatedBoss?: boolean;
    items?: string[];
    level?: number;
    decryptedSlates?: string[];
  };
  defeatedBoss?: boolean;
  hasDefeatedBoss?: boolean;
  items?: string[];
  level?: number;
  decryptedSlates?: string[];
}

export class TerminalSession {
  terminal: TerminalData;
  history: string[] = [];
  input: string = '';
  isSiphoned: boolean = false;

  constructor(terminal: TerminalData) {
    this.terminal = terminal;

    // 自動補齊 terminal 的相容性名稱與欄位
    if (!this.terminal.name) {
      const id = String(this.terminal.id || '');
      if (id.includes('SAFEHOUSE')) {
        this.terminal.name = 'Rebel Safehouse Archive Node';
      } else if (id.includes('CHECKPOINT')) {
        this.terminal.name = 'Tzorg Checkpoint Security Terminal';
      } else if (id.includes('DATA')) {
        this.terminal.name = 'Sector 1 Central Data Hub Terminal';
      } else {
        this.terminal.name = id || 'Security Outpost Terminal';
      }
    }

    if (!this.terminal.forcefieldToDisable && (this.terminal as any).forcefieldId) {
      this.terminal.forcefieldToDisable = (this.terminal as any).forcefieldId;
    }

    if (!Array.isArray(this.terminal.logs) || this.terminal.logs.length === 0) {
      const singleLog = (this.terminal as any).log;
      if (singleLog) {
        this.terminal.logs = [String(singleLog)];
      } else {
        this.terminal.logs = [
          'Log 2400.1: Tzorg patrol routing active.',
          'Log 2400.2: Sector 1 forcefield set to frequency 884.',
        ];
      }
    }

    this.history = [
      this.getWelcomeMessage(),
      'System Ready. Node Authorization: ' + String((this.terminal as any).securityLevel || this.terminal.clearanceNeeded || 'CLEAR'),
      'Active Subroutines: ' + this.getEffectiveCommands().map(c => c.cmd).join(', '),
      '-------------------------------------------------------',
    ];
  }

  getWelcomeMessage(): string {
    return '=== TZORG NETWORK: ' + this.terminal.name + ' ===\nType HELP for available commands.';
  }

  private isCoreTerminal(): boolean {
    const type = String((this.terminal as any).type || '').toUpperCase();
    const id = String(this.terminal.id || '').toUpperCase();
    const name = String(this.terminal.name || '').toUpperCase();
    return type === 'CORE' || id.includes('CORE') || id.includes('OVERMIND') || name.includes('CORE') || name.includes('OVERMIND') || name.includes('CITADEL');
  }

  getEffectiveCommands(context?: TerminalContext): Array<{ cmd: string; desc: string }> {
    const commands: Array<{ cmd: string; desc: string }> = [];

    // 基礎有效指令
    commands.push({ cmd: 'STATUS', desc: 'Check terminal status & subsystems' });
    commands.push({ cmd: 'LOGS', desc: 'Read decrypted intelligence data' });
    commands.push({ cmd: 'CHECKIN', desc: 'Neural collar check-in (reset surveillance timer)' });
    commands.push({ cmd: 'CLEAR_ALARM', desc: 'Reset sector security alert to CLEAR' });
    commands.push({ cmd: 'SCAN', desc: 'Scan sector security perimeter' });
    commands.push({ cmd: 'POETRY', desc: "Recite Shakespeare Sonnet 18 & Archie's notes" });

    // 條件指令
    if (!this.isSiphoned) {
      commands.push({ cmd: 'SIPHON', desc: 'Drain power cells (+30 Energy)' });
    }

    if (this.terminal.forcefieldToDisable && !this.terminal.isHacked) {
      commands.push({ cmd: 'OVERRIDE', desc: 'Bypass forcefields (or HACK)' });
    }

    const pData = context?.player || context;
    const items: any[] = (context as any)?.items || pData?.items || (Array.isArray((pData as any)?.inventory) ? (pData as any).inventory.map((i: any) => i?.id || i) : []) || [];
    const hasMasterPass = items.some((it: any) => it === 'item-master-pass' || it?.id === 'item-master-pass');
    const defeatedBoss = pData?.defeatedBoss || pData?.hasDefeatedBoss;

    // 假設 context 中沒有明確標記 collar 是否已解除，我們檢查是否有 master pass 且未明確標記已解除
    // 根據需求 "若 context 包含 item-master-pass 且未解除項圈則加入 DISARM"
    // 這裡我們假設如果 context 沒有提供 disarmCollar 狀態，我們就認為未解除，或者依賴 items 存在
    // 為了簡單起見，如果持有 master pass，就顯示 DISARM (因為通常持有 pass 意味著可以執行，且如果已解除，執行會失敗或無效，但題目要求 "有效果才加入"，通常指該指令在此情境下可執行且有意義)
    // 如果 context 中有明確的 collarDisarmed 標誌，則不加入。這裡暫定：若有 master pass 則加入。
    if (hasMasterPass) {
      commands.push({ cmd: 'DISARM', desc: 'Disarm neural collar with Master Pass' });
    }

    if (this.isCoreTerminal()) {
      commands.push({ cmd: 'BREACH', desc: 'Breach the Tzorg dome (Core Terminal)' });
      if (defeatedBoss) {
        commands.push({ cmd: 'OVERLOAD', desc: 'Trigger reactor meltdown (Core Terminal)' });
        commands.push({ cmd: 'SUBVERSION', desc: 'Overwrite Tzorg neural lattice (Core Terminal)' });
        commands.push({ cmd: 'EVACUATION', desc: 'Launch underground ark evacuation (Core Terminal)' });
        commands.push({ cmd: 'AWAKEN', desc: 'Trigger the true ending (Core Terminal)' });
      }
    }

    // 系統通用指令
    commands.push({ cmd: 'HELP', desc: 'Display available terminal subroutines' });
    commands.push({ cmd: 'CLEAR', desc: 'Clear screen' });
    commands.push({ cmd: 'EXIT', desc: 'Disconnect session (or Esc)' });

    return commands;
  }

  executeCommand(cmd: string, context?: TerminalContext): TerminalCommandResult {
    const raw = cmd.trim();
    const c = raw.toLowerCase();

    // 寫入終端機歷史紀錄
    if (raw.length > 0) {
      this.history.push('> ' + raw);
    }

    // 容錯支援：同時支援 context.player 巢狀結構與 context 扁平結構
    const pData = context?.player || context;
    const defeatedBoss = pData?.defeatedBoss || pData?.hasDefeatedBoss;
    const level: number = pData?.level || 1;
    const decryptedSlates: string[] = pData?.decryptedSlates || [];

    const hasContext = Boolean(context && (context.player || (context as any).items || (context as any).hasDefeatedBoss !== undefined));

    const items: any[] = (context as any)?.items || pData?.items || (Array.isArray((pData as any)?.inventory) ? (pData as any).inventory.map((i: any) => i?.id || i) : []) || [];

    let result: TerminalCommandResult;

    if (c === 'help') {
      const effectiveCommands = this.getEffectiveCommands(context);
      const cmdNames = effectiveCommands.map(c => c.cmd).join(', ');
      const cmdDescs = effectiveCommands.map(c => '- ' + c.cmd.padEnd(12) + ': ' + c.desc).join('\n');
      result = {
        output: 'COMMANDS: ' + cmdNames + '\n' + cmdDescs,
      };
    } else if (c === 'status') {
      const ffStatus = this.terminal.forcefieldToDisable
        ? this.terminal.isHacked
          ? 'OFFLINE (DEACTIVATED)'
          : 'ONLINE (ARMED)'
        : 'NONE LINKED';

      result = {
        output:
          'TERMINAL: ' +
          this.terminal.name +
          ' | HACKED: ' +
          (this.terminal.isHacked ? 'TRUE' : 'FALSE') +
          '\nSECURITY NODE: ' +
          this.terminal.id +
          ' | FORCEFIELD LINK: ' +
          ffStatus +
          '\nENERGY CAPACITORS: ' +
          (this.isSiphoned ? 'DRAINED (0V)' : 'CHARGED (30V)'),
      };
    } else if (c === 'logs' || c === 'log' || c === 'read' || c === 'cat') {
      const logs = this.terminal.logs || [];
      const logText = logs.length > 0 ? logs.join('\n') : 'No encrypted logs found.';
      result = { output: '--- DECRYPTED INTEL LOGS ---\n' + logText };
    } else if (c === 'override' || c === 'hack' || c === 'bypass') {
      const targetFF = this.terminal.forcefieldToDisable || (this.terminal as any).forcefieldId;
      if (targetFF) {
        this.terminal.isHacked = true;
        result = {
          output:
            'FORCEFIELD OVERRIDDEN: ' +
            targetFF +
            '\n[SUCCESS] Main power relay disabled. Checkpoint forcefield collapsed!',
          disabledForcefield: targetFF,
        };
      } else {
        result = { output: 'No forcefields linked to this terminal.' };
      }
    } else if (c === 'clear_alarm' || c === 'reset_alert' || c === 'alarm') {
      result = {
        output: 'SECTOR ALARM CLEARED.\nTzorg threat level restored to CLEAR.',
        clearedAlert: true,
      };
    } else if (c === 'siphon' || c === 'drain' || c === 'energy') {
      if (this.isSiphoned) {
        result = { output: 'ERROR: Auxiliary energy cells already drained.' };
      } else {
        this.isSiphoned = true;
        result = {
          output: 'SIPHON COMPLETE: Extracted +30 EN from terminal capacitors.',
          energyGain: 30,
        };
      }
    } else if (c === 'scan' || c === 'radar') {
      result = {
        output:
          'PERIMETER SCAN COMPLETE:\n' +
          '- Scout Drones: 2 units detected on corridor patrol\n' +
          '- Shock Enforcers: 1 heavy unit stationed at checkpoint\n' +
          '- Hunter Killers: 1 assault unit guarding Server Vault\n' +
          '- Threat Level: AUTOMATED PATROL PROTOCOL',
      };
    } else if (c === 'checkin' || c === 'check_in' || c === 'ping') {
      const hasMasterPass = items.some((it: any) => it === 'item-master-pass' || it?.id === 'item-master-pass') || (Array.isArray((pData as any)?.inventory) && (pData as any).inventory.some((it: any) => it?.id === 'item-master-pass'));
      if (hasMasterPass) {
        result = {
          output:
            'MASTER PASS RECOGNIZED. Neural collar disarmed. Tzorg surveillance timer reset to 100 steps. Citizen status: COMPLIANT.',
          checkedIn: true,
          disarmCollar: true,
        };
      } else {
        result = {
          output:
            'NEURAL COLLAR CHECK-IN VERIFIED. Tzorg surveillance timer reset to 100 steps. Citizen status: COMPLIANT.',
          checkedIn: true,
        };
      }
    } else if (c === 'disarm' || c === 'disarm_collar' || c === 'unlock_collar' || c === 'master_pass') {
      const hasMasterPass = items.some((it: any) => it === 'item-master-pass' || it?.id === 'item-master-pass') || (Array.isArray((pData as any)?.inventory) && (pData as any).inventory.some((it: any) => it?.id === 'item-master-pass'));
      if (hasMasterPass) {
        result = {
          output:
            'MASTER PASS ACCEPTED. Neural collar disarmed successfully. You are free from Tzorg surveillance.',
          disarmCollar: true,
        };
      } else {
        result = {
          output: 'ACCESS DENIED: Requires Tzorg Master Keycard [item-master-pass].',
        };
      }
    } else if (c === 'overload') {
      if (this.isCoreTerminal()) {
        if (hasContext) {
          result = {
            output:
              'CORE TERMINAL OVERLOAD INITIATED: 核融過載 - Reactor meltdown sequence engaged.\n' +
              'The Tzorg Overmind will be destroyed in a nuclear fusion cascade.',
            endgameChoice: 'OVERLOAD',
            shouldExit: true,
          };
        } else {
          result = {
            output:
              'CORE TERMINAL OVERLOAD INITIATED: 核融過載 - Reactor meltdown sequence engaged.\n' +
              'The Tzorg Overmind will be destroyed in a nuclear fusion cascade.',
            endgameChoice: 'OVERLOAD',
            shouldExit: true,
          };
        }
      } else {
        result = { output: 'ACCESS DENIED: Requires Core Terminal' };
      }
    } else if (c === 'subversion') {
      if (this.isCoreTerminal()) {
        result = {
          output:
            'NEURAL SUBVERSION COMPLETE: 神經同化覆寫 - Tzorg neural lattice overwritten.\n' +
            'All Tzorg units are now under resistance command.',
          endgameChoice: 'SUBVERSION',
          shouldExit: true,
        };
      } else {
        result = { output: 'ACCESS DENIED: Requires Core Terminal' };
      }
    } else if (c === 'evacuation') {
      if (this.isCoreTerminal()) {
        result = {
          output:
            'UNDERGROUND ARK EVACUATION LAUNCHED: 地下方舟撤離 - Resistance personnel are extracting.\n' +
            'The subterranean ark is departing the sector.',
          endgameChoice: 'EVACUATION',
          shouldExit: true,
        };
      } else {
        result = { output: 'ACCESS DENIED: Requires Core Terminal' };
      }
    } else if (c === 'awaken') {
      if (this.isCoreTerminal()) {
        result = {
          output:
            'OPERATION PROMETHEUS TRUE VICTORY: 【五百萬人的全民大覺醒】\n' +
            'Quantum cipher verified. Broadcast towers radiating inverse neural pulse across the metropolis dome.\n' +
            'Every human consciousness is unshackled. The Tzorg reign has ended in true liberation.',
          endgameChoice: 'AWAKEN',
          shouldExit: true,
        };
      } else {
        result = { output: 'ACCESS DENIED: Requires Core Terminal' };
      }
    } else if (c === 'poetry' || c === 'poem' || c === 'verse' || c === 'sonnet') {
      result = {
        output:
          '--- SHAKESPEARE: SONNET 18 ---\n' +
          'Shall I compare thee to a summer\'s day?\n' +
          'Thou art more lovely and more temperate:\n' +
          'Rough winds do shake the darling buds of May,\n' +
          'And summer\'s lease hath all too short a date;\n' +
          'Sometime too hot the eye of heaven shines,\n' +
          'And often is his gold complexion dimm\'d;\n' +
          'And every fair from fair sometime declines,\n' +
          'By chance or nature\'s course of untrimm\'d;\n' +
          'But thy eternal summer shall not fade,\n' +
          'Nor lose possession of that fair thou ow\'st;\n' +
          'Nor shall Death brag thou wander\'st in his shade,\n' +
          'When in eternal lines to time thou grow\'st:\n' +
          'So long as eyes can see, or so long lives,\n' +
          'So long lives this, and this gives life to thee.\n' +
          '\n' +
          '--- ARCHIE\'S NOTES ---\n' +
          '古老文字蔑視佐格的數位抹殺。',
      };
    } else if (c === 'clear' || c === 'cls') {
      this.history = [];
      return { output: '' };
    } else if (c === 'exit' || c === 'quit' || c === 'logout') {
      result = { output: 'TERMINAL LOGOUT.', shouldExit: true };
    } else {
      result = { output: 'UNKNOWN COMMAND: ' + cmd + '. Type HELP for command listing.' };
    }

    // 將輸出逐行寫入歷史
    if (result.output) {
      result.output.split('\n').forEach((line) => {
        this.history.push(line);
      });
    }

    return result;
  }
}
