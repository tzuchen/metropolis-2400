#!/usr/bin/env node
/**
 * scripts/run-all-tests.ts
 *
 * Unified test runner that scans the scripts/ directory for all files
 * matching the pattern "verify-*.ts", executes them in parallel using a
 * worker pool, reports progress, and prints a summary at the end.
 *
 * Usage:
 *   npx tsx scripts/run-all-tests.ts [filter]
 *
 * Environment Variables:
 *   TEST_CONCURRENCY: Override the default concurrency level.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import * as os from 'os';

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
function findVerifyScripts(filter?: string): string[] {
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

  // Apply filter if provided
  const filteredFiles = filter ? verifyFiles.filter((name) => name.includes(filter)) : verifyFiles;

  filteredFiles.sort(naturalCompare);
  return filteredFiles;
}

/**
 * Execute a single verify script asynchronously and capture its output.
 */
function runScript(filename: string): Promise<TestResult> {
  return new Promise((resolve) => {
    const scriptsDir = path.resolve(__dirname);
    const scriptPath = path.join(scriptsDir, filename);
    const cwd = path.resolve(scriptsDir, '..');

    const startTime = Date.now();

    // Determine how to run tsx
    // 1. Check if node_modules/tsx/dist/cli.mjs exists
    const tsxCliPath = path.join(cwd, 'node_modules', 'tsx', 'dist', 'cli.mjs');
    let command: string;
    let args: string[];

    if (fs.existsSync(tsxCliPath)) {
      command = process.execPath;
      args = [tsxCliPath, scriptPath];
    } else {
      command = 'npx';
      args = ['tsx', scriptPath];
    }

    const child = spawn(command, args, {
      cwd,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number | null) => {
      const durationMs = Date.now() - startTime;
      const exitCode = code ?? -1;

      resolve({
        filename,
        passed: exitCode === 0,
        durationMs,
        stdout,
        stderr,
        exitCode,
      });
    });

    child.on('error', (err: Error) => {
      const durationMs = Date.now() - startTime;
      resolve({
        filename,
        passed: false,
        durationMs,
        stdout,
        stderr: stderr + '\n' + err.message,
        exitCode: -1,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║         Unified Test Runner – verify-*.ts          ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // Determine concurrency
  const defaultConcurrency = Math.min(os.cpus().length, 8);
  const envConcurrency = process.env.TEST_CONCURRENCY ? parseInt(process.env.TEST_CONCURRENCY, 10) : NaN;
  const concurrency = !Number.isNaN(envConcurrency) && envConcurrency > 0 ? envConcurrency : defaultConcurrency;

  // Get filter from command line arguments
  const filter = process.argv[2];

  const scripts = findVerifyScripts(filter);

  if (scripts.length === 0) {
    console.log('[run-all-tests] No verify-*.ts scripts found in scripts/ directory.');
    if (filter) {
      console.log(`[run-all-tests] Filter applied: "${filter}"`);
    }
    console.log('');
    console.log('Total:    0');
    console.log('Passed:   0');
    console.log('Failed:   0');
    console.log('Duration: 0.00s');
    process.exit(0);
    return;
  }

  console.log(`Found ${scripts.length} verify script(s). Running with concurrency ${concurrency}...`);
  console.log('');

  const results: TestResult[] = new Array(scripts.length);
  const total = scripts.length;

  // Worker Pool Implementation
  let currentIndex = 0;
  let activeWorkers = 0;

  const worker = async (): Promise<void> => {
    while (currentIndex < total) {
      const index = currentIndex++;
      const filename = scripts[index];
      const result = await runScript(filename);
      results[index] = result;

      // Print result immediately
      if (result.passed) {
        const seconds = (result.durationMs / 1000).toFixed(2);
        console.log(`[${String(index + 1).padStart(3, ' ')}] ✓ ${filename} (${seconds}s)`);
      } else {
        console.log(`[${String(index + 1).padStart(3, ' ')}] ✗ ${filename} (FAILED)`);
      }
    }
  };

  // Start workers
  const workers: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  // Wait for all workers to finish
  await Promise.all(workers);

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
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
