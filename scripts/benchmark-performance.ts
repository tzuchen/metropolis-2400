import { GameEngine } from '../src/game';
import { calculateFOV, hasLineOfSight } from '../src/map';

const mockCanvas = {
  width: 960,
  height: 600,
  getContext: () => ({
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    arcTo: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    setLineDash: () => {},
    measureText: () => ({ width: 50 }),
  }),
} as unknown as HTMLCanvasElement;

export interface BenchmarkReport {
  timestamp: string;
  fovBenchmark: {
    iterations: number;
    totalMs: number;
    avgMs: number;
    opsPerSec: number;
  };
  losBenchmark: {
    iterations: number;
    totalMs: number;
    avgMs: number;
    opsPerSec: number;
  };
  hordeAiBenchmark: {
    ticks: number;
    totalMs: number;
    avgMsPerTick: number;
    effectiveFps: number;
    robotCount: number;
  };
}

export function runPerformanceBenchmark(silent = false): BenchmarkReport {
  if (!silent) {
    console.log('⚡======================================================⚡');
    console.log('   METROPOLIS 2400 // PERFORMANCE BENCHMARK SUITE');
    console.log('⚡======================================================⚡\n');
  }

  const game = new GameEngine(mockCanvas);

  // 1. FOV Benchmark (1,000 iterations across multiple sectors and radii)
  const fovIterations = 1000;
  const fovStart = performance.now();
  for (let i = 0; i < fovIterations; i++) {
    const origin = { x: 10 + (i % 20), y: 10 + (i % 15) };
    calculateFOV(game.map, origin, 9);
  }
  const fovTotalMs = performance.now() - fovStart;
  const fovAvgMs = fovTotalMs / fovIterations;
  const fovOpsPerSec = Math.round((fovIterations / fovTotalMs) * 1000);

  if (!silent) {
    console.log(`[1] FOV Calculation Benchmark (Radius = 9, ${fovIterations} iterations):`);
    console.log(`    - Total Time : ${fovTotalMs.toFixed(2)} ms`);
    console.log(`    - Avg / Call : ${fovAvgMs.toFixed(3)} ms`);
    console.log(`    - Throughput : ${fovOpsPerSec.toLocaleString()} ops/sec\n`);
  }

  // 2. Line of Sight (LOS) Benchmark (10,000 raycasts)
  const losIterations = 10000;
  const losStart = performance.now();
  for (let i = 0; i < losIterations; i++) {
    const from = { x: 5 + (i % 25), y: 5 + (i % 18) };
    const to = { x: 30 - (i % 20), y: 25 - (i % 15) };
    hasLineOfSight(game.map, from, to);
  }
  const losTotalMs = performance.now() - losStart;
  const losAvgMs = losTotalMs / losIterations;
  const losOpsPerSec = Math.round((losIterations / losTotalMs) * 1000);

  if (!silent) {
    console.log(`[2] Line-of-Sight (LOS) Raycast Benchmark (${losIterations} iterations):`);
    console.log(`    - Total Time : ${losTotalMs.toFixed(2)} ms`);
    console.log(`    - Avg / Call : ${losAvgMs.toFixed(4)} ms`);
    console.log(`    - Throughput : ${losOpsPerSec.toLocaleString()} ops/sec\n`);
  }

  // 3. Citadel Horde AI Simulation Benchmark (150 game ticks on Sector Citadel)
  game.switchSector('sector-citadel');
  // Wake all robots into chase state
  for (const robot of game.robots) {
    robot.aiState = 'chase';
  }
  const ticks = 150;
  const robotCount = game.robots.length;
  const hordeStart = performance.now();
  for (let t = 0; t < ticks; t++) {
    // Alternate player step to force path recomputation
    game.player.x = 25 + (t % 5);
    game.player.y = 15 + (t % 5);
    game.tick();
  }
  const hordeTotalMs = performance.now() - hordeStart;
  const hordeAvgMsPerTick = hordeTotalMs / ticks;
  const effectiveFps = Math.round(1000 / (hordeAvgMsPerTick || 0.001));

  if (!silent) {
    console.log(`[3] Citadel Horde AI Simulation (${ticks} ticks with ${robotCount} robots):`);
    console.log(`    - Total Time  : ${hordeTotalMs.toFixed(2)} ms`);
    console.log(`    - Avg / Tick  : ${hordeAvgMsPerTick.toFixed(3)} ms`);
    console.log(`    - Sim Speed   : ${effectiveFps.toLocaleString()} ticks/sec (Effective FPS)\n`);
    console.log('⚡======================================================⚡');
    console.log('   BENCHMARK COMPLETED SUCCESSFULLY');
    console.log('⚡======================================================⚡\n');
  }

  return {
    timestamp: new Date().toISOString(),
    fovBenchmark: {
      iterations: fovIterations,
      totalMs: fovTotalMs,
      avgMs: fovAvgMs,
      opsPerSec: fovOpsPerSec,
    },
    losBenchmark: {
      iterations: losIterations,
      totalMs: losTotalMs,
      avgMs: losAvgMs,
      opsPerSec: losOpsPerSec,
    },
    hordeAiBenchmark: {
      ticks,
      totalMs: hordeTotalMs,
      avgMsPerTick: hordeAvgMsPerTick,
      effectiveFps,
      robotCount,
    },
  };
}

runPerformanceBenchmark();
