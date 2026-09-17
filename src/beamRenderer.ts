import { LaserBeam, Position } from './types';

export class BeamRenderer {
  drawLaserBeam(ctx: CanvasRenderingContext2D, beam: LaserBeam, now: number, progress: number): void {
    const { from, to, color, width = 2 } = beam;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const nx = -dy / len;
    const ny = dx / len;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);

    // Core beam
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Glow
    ctx.strokeStyle = color;
    ctx.lineWidth = width * 3;
    ctx.globalAlpha = Math.max(0, 0.3 * (1 - progress));
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Impact spark
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = color;
    const sparkSize = 4 * (1 - progress);
    ctx.beginPath();
    ctx.arc(to.x, to.y, sparkSize, 0, Math.PI * 2);
    ctx.fill();

    // Particle sparks
    const numSparks = 3;
    for (let i = 0; i < numSparks; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 8 * (1 - progress);
      const sx = to.x + Math.cos(angle) * dist;
      const sy = to.y + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 * (1 - progress), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawElectricArc(ctx: CanvasRenderingContext2D, beam: LaserBeam, now: number, progress: number): void {
    const { from, to, color, width = 2 } = beam;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);

    // Jagged electric arc
    const segments = 8;
    const points: Position[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = from.x + dx * t;
      const y = from.y + dy * t;
      if (i > 0 && i < segments) {
        const offset = (Math.random() - 0.5) * 6;
        const nx = -dy / len;
        const ny = dx / len;
        points.push({ x: x + nx * offset, y: y + ny * offset });
      } else {
        points.push({ x, y });
      }
    }

    // Core arc
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Glow
    ctx.strokeStyle = color;
    ctx.lineWidth = width * 3;
    ctx.globalAlpha = Math.max(0, 0.3 * (1 - progress));
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Impact spark
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = color;
    const sparkSize = 5 * (1 - progress);
    ctx.beginPath();
    ctx.arc(to.x, to.y, sparkSize, 0, Math.PI * 2);
    ctx.fill();

    // Particle sparks
    const numSparks = 5;
    for (let i = 0; i < numSparks; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 10 * (1 - progress);
      const sx = to.x + Math.cos(angle) * dist;
      const sy = to.y + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(sx, sy, 2 * (1 - progress), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawPlasmaBeam(ctx: CanvasRenderingContext2D, beam: LaserBeam, now: number, progress: number): void {
    const { from, to, color, width = 4 } = beam;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);

    // Core plasma beam
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Inner glow
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = width * 0.5;
    ctx.globalAlpha = Math.max(0, 0.5 * (1 - progress));
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Outer glow
    ctx.strokeStyle = color;
    ctx.lineWidth = width * 2.5;
    ctx.globalAlpha = Math.max(0, 0.2 * (1 - progress));
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Impact explosion
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = color;
    const explosionSize = 8 * (1 - progress);
    ctx.beginPath();
    ctx.arc(to.x, to.y, explosionSize, 0, Math.PI * 2);
    ctx.fill();

    // Particle sparks
    const numSparks = 8;
    for (let i = 0; i < numSparks; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 15 * (1 - progress);
      const sx = to.x + Math.cos(angle) * dist;
      const sy = to.y + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5 * (1 - progress), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawNeedleTracer(ctx: CanvasRenderingContext2D, beam: LaserBeam, now: number, progress: number): void {
    const { from, to, color, width = 1 } = beam;
    const p = Math.min(1, Math.max(0, progress));
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const headDist = Math.min(dist, p * 1.65 * dist);
    const tailDist = Math.max(0, headDist - Math.min(dist * 0.45, 48));
    const hx = from.x + (dx / dist) * headDist;
    const hy = from.y + (dy / dist) * headDist;
    const tx = from.x + (dx / dist) * tailDist;
    const ty = from.y + (dy / dist) * tailDist;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);

    // Needle beam segment
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    // Front tip light
    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(hx, hy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Impact effect when p >= 0.6
    if (p >= 0.6) {
      const impactPulse = 0.5 + 0.5 * Math.sin(now * 0.02);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(to.x, to.y, 6 + impactPulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      // 3 rotating spark particles
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + now * 0.005;
        const sparkDist = 4 + impactPulse * 2;
        const sx = to.x + Math.cos(angle) * sparkDist;
        const sy = to.y + Math.sin(angle) * sparkDist;
        ctx.fillStyle = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  drawQuantumBeam(ctx: CanvasRenderingContext2D, beam: LaserBeam, now: number, progress: number): void {
    const { from, to, color, width = 3 } = beam;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress);

    // Core quantum beam
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Pulsing glow
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.01);
    ctx.strokeStyle = color;
    ctx.lineWidth = width * (2 + pulse);
    ctx.globalAlpha = Math.max(0, 0.3 * (1 - progress) * pulse);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Impact spark
    ctx.globalAlpha = Math.max(0, 1 - progress);
    ctx.fillStyle = color;
    const sparkSize = 6 * (1 - progress);
    ctx.beginPath();
    ctx.arc(to.x, to.y, sparkSize, 0, Math.PI * 2);
    ctx.fill();

    // Particle sparks
    const numSparks = 6;
    for (let i = 0; i < numSparks; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 12 * (1 - progress);
      const sx = to.x + Math.cos(angle) * dist;
      const sy = to.y + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(sx, sy, 2 * (1 - progress), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
