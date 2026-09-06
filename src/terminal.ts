import type { TerminalData } from './types';

export interface TerminalCommandResult {
  output: string;
  shouldExit?: boolean;
  disabledForcefield?: string;
  unlockedDoor?: string;
  clearedAlert?: boolean;
}

export class TerminalSession {
  terminal: TerminalData;

  constructor(terminal: TerminalData) {
    this.terminal = terminal;
  }

  getWelcomeMessage(): string {
    return '=== TZORG NETWORK: ' + this.terminal.name + ' ===\nType HELP for available commands.';
  }

  executeCommand(cmd: string): TerminalCommandResult {
    const c = cmd.trim().toLowerCase();

    if (c === 'help') {
      return { output: 'COMMANDS: HELP, STATUS, LOGS, OVERRIDE, CLEAR_ALARM, EXIT' };
    }

    if (c === 'status') {
      return { output: 'TERMINAL: ' + this.terminal.name + ' | HACKED: ' + this.terminal.isHacked };
    }

    if (c === 'logs') {
      return { output: (this.terminal.logs || []).join('\n') || 'No logs available.' };
    }

    if (c === 'override' || c === 'hack') {
      if (this.terminal.forcefieldToDisable) {
        this.terminal.isHacked = true;
        return {
          output: 'FORCEFIELD OVERRIDDEN: ' + this.terminal.forcefieldToDisable,
          disabledForcefield: this.terminal.forcefieldToDisable,
        };
      }

      return { output: 'No forcefields linked to this terminal.' };
    }

    if (c === 'clear_alarm') {
      return { output: 'SECTOR ALARM CLEARED.', clearedAlert: true };
    }

    if (c === 'exit' || c === 'quit') {
      return { output: 'TERMINAL LOGOUT.', shouldExit: true };
    }

    return { output: 'UNKNOWN COMMAND: ' + cmd + '. Type HELP.' };
  }
}
