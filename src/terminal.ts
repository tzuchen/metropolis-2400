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
      'Type HELP to display available terminal subroutines.',
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
      result = {
        output:
          'COMMANDS: HELP, STATUS, LOGS, OVERRIDE, CLEAR_ALARM, SIPHON, SCAN, CHECKIN, OVERLOAD, SUBVERSION, EVACUATION, BREACH, AWAKEN, CLEAR, EXIT\n' +
          '- STATUS     : Check terminal status & subsystems\n' +
          '- LOGS       : Read decrypted intelligence data\n' +
          '- OVERRIDE   : Bypass forcefields (or HACK)\n' +
          '- CLEAR_ALARM: Reset sector security alert to CLEAR\n' +
          '- SIPHON     : Drain power cells (+30 Energy)\n' +
          '- SCAN       : Scan sector security perimeter\n' +
          '- CHECKIN    : Neural collar check-in (reset surveillance timer)\n' +
          '- DISARM     : Disarm neural collar with Master Pass\n' +
          '- BREACH     : Breach the Tzorg dome (Core Terminal)\n' +
          '- AWAKEN     : Trigger the true ending (Core Terminal)\n' +
          '- CLEAR      : Clear screen\n' +
          '- EXIT       : Disconnect session (or Esc)',
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
