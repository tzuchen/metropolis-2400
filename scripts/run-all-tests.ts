#!/usr/bin/env node
/**
 * scripts/run-all-tests.ts
 *
 * Unified test runner that scans the scripts/ directory for all files
 * matching the pattern "verify-*.ts", executes them sequentially,
 * reports progress, and prints a summary at the end.
 *
 * Usage:
 *   npx tsx scripts/run-all-tests.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestResult {
  filename: string;
  passed: boolean;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Natural (human-friendly) alphabetical sort.
 * e.g. verify-2.ts < verify-10.ts < verify-100.ts
 */
function naturalCompare(a: string, b: string): number {
  const aParts = a.split(/(\d+)/);
  const bParts = b.split(/(\d+)/);

  const len = Math.min(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];

    if (aPart === bPart) continue;

    // Both numeric
    const aNum = Number(aPart);
    const bNum = Number(bPart);
    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return aNum - bNum;
    }

    // One numeric, one not – numeric comes first
    if (!Number.isNaN(aNum)) return -1;
    if (!Number.isNaN(bNum)) return 1;

    // Both non-numeric – simple string compare
    return aPart.localeCompare(bPart, 'en', { numeric: true });
  }

  // If all compared parts are equal, the longer name comes later
  return aParts.length - bParts.length;
}

/**
 * Scan the scripts/ directory for files matching "verify-*.ts".
 * Returns an array of file names (not full paths), sorted naturally.
 */
function findVerifyScripts(): string[] {
  const scriptsDir = path.resolve(__dirname);

  let entries: string[];
  try {
    entries = fs.readdirSync(scriptsDir);
  } catch (err) {
    console.error(`[run-all-tests] ERROR: Cannot read directory "${scriptsDir}": ${err}`);
    process.exit(1);
    return [];
  }

  const verifyFiles = entries.filter((name) => {
    if (!name.startsWith('verify-')) return false;
    if (!name.endsWith('.ts')) return false;
    // Exclude this runner itself (just in case it's named verify-*)
    if (name === 'run-all-tests.ts') return false;
    // Ensure it's a file, not a directory
    const fullPath = path.join(scriptsDir, name);
    try {
      return fs.statSync(fullPath).isFile();
    } catch {
      return false;
    }
  });

  verifyFiles.sort(naturalCompare);
  return verifyFiles;
}

/**
 * Execute a single verify script and capture its output.
 */
function runScript(filename: string): TestResult {
  const scriptsDir = path.resolve(__dirname);
  const scriptPath = path.join(scriptsDir, filename);

  const startTime = Date.now();

  // Use npx tsx to run the TypeScript file
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `require('child_process').execSync('npx tsx "${scriptPath}"', { stdio: 'inherit', cwd: '${path.resolve(scriptsDir, '..')}' });`,
    ],
    {
      cwd: path.resolve(scriptsDir, '..'),
      encoding: 'utf-8',
      timeout: 300_000, // 5 minute timeout per script
    }
  );

  const durationMs = Date.now() - startTime;

  // Fallback: if the -e approach fails, try direct npx tsx
  let stdout = result.stdout || '';
  let stderr = result.stderr || '';
  let exitCode = result.status ?? -1;

  if (exitCode !== 0 && stderr.includes('Cannot find module')) {
    // Retry with npx tsx directly
    const retryResult = spawnSync(
      'npx',
      ['tsx', scriptPath],
      {
        cwd: path.resolve(scriptsDir, '..'),
        encoding: 'utf-8',
        timeout: 300_000,
      }
    );
    stdout = retryResult.stdout || '';
    stderr = retryResult.stderr || '';
    exitCode = retryResult.status ?? -1;
    durationMs = Date.now() - startTime;
  }

  return {
    filename,
    passed: exitCode === 0,
    durationMs,
    stdout,
    stderr,
    exitCode,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║         Unified Test Runner – verify-*.ts          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const scripts = findVerifyScripts();

  if (scripts.length === 0) {
    console.log('[run-all-tests] No verify-*.ts scripts found in scripts/ directory.');
    console.log('');
    console.log('Total:    0');
    console.log('Passed:   0');
    console.log('Failed:   0');
    console.log('Duration: 0.00s');
    process.exit(0);
    return;
  }

  console.log(`Found ${scripts.length} verify script(s). Running sequentially...`);
  console.log('');

  const results: TestResult[] = [];
  const total = scripts.length;

  for (let i = 0; i < total; i++) {
    const filename = scripts[i];
    const index = i + 1;

    const result = runScript(filename);
    results.push(result);

    if (result.passed) {
      const seconds = (result.durationMs / 1000).toFixed(2);
      console.log(`[${String(index).padStart(3, ' ')}] ✓ ${filename} (${seconds}s)`);
    } else {
      console.log(`[${String(index).padStart(3, ' ')}] ✗ ${filename} (FAILED)`);
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const totalDurationMs = Date.now() - startTime;
  const totalDurationSec = (totalDurationMs / 1000).toFixed(2);
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║                    SUMMARY                       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Total:    ${total}`);
  console.log(`Passed:   ${passedCount}`);
  console.log(`Failed:   ${failedCount}`);
  console.log(`Duration: ${totalDurationSec}s`);
  console.log('');

  // -----------------------------------------------------------------------
  // Failure details
  // -----------------------------------------------------------------------
  if (failedCount > 0) {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║                 FAILURE DETAILS                  ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    for (const result of results) {
      if (result.passed) continue;

      console.log(`──────────────────────────────────────────────────`);
      console.log(`✗ ${result.filename} (exit code: ${result.exitCode}, ${result.durationMs}ms)`);
      console.log(`──────────────────────────────────────────────────`);

      if (result.stderr.trim()) {
        console.log('  [stderr]');
        const stderrLines = result.stderr.trim().split('\n');
        for (const line of stderrLines) {
          console.log(`    ${line}`);
        }
      }

      if (result.stdout.trim()) {
        console.log('  [stdout]');
        const stdoutLines = result.stdout.trim().split('\n');
        for (const line of stdoutLines) {
          console.log(`    ${line}`);
        }
      }

      console.log('');
    }

    process.exit(1);
  } else {
    console.log('All tests passed. 🎉');
    process.exit(0);
  }
}

// Run
main();
