import { TerminalSession } from '../src/terminal';
import { TerminalData, SecurityLevel } from '../src/types';

const mockTerminal: TerminalData = {
  id: 'term-01',
  name: 'Security Outpost Terminal',
  clearanceNeeded: SecurityLevel.CLEAR,
  isHacked: false,
  logs: ['Log 2400.1: Tzorg patrol routing active.', 'Log 2400.2: Sector 1 forcefield set to frequency 884.'],
  forcefieldToDisable: 'CHECKPOINT_FF'
};

const session = new TerminalSession(mockTerminal);
const welcome = session.getWelcomeMessage();
if (!welcome || !welcome.includes('Security Outpost')) {
  throw new Error('Invalid welcome message');
}

const helpResult = session.executeCommand('help');
if (!helpResult.output.includes('COMMANDS')) {
  throw new Error('Help command failed');
}

const logResult = session.executeCommand('logs');
if (!logResult.output.includes('Tzorg patrol routing')) {
  throw new Error('Logs command failed');
}

const overrideResult = session.executeCommand('override');
if (!overrideResult.disabledForcefield || !mockTerminal.isHacked) {
  throw new Error('Override command failed');
}

console.log('Terminal verification passed!');
