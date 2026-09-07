export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export class FXManager {
  shakeIntensity: number = 0;
  particles: Particle[] = [];

  triggerShake(intensity: number): void {
    this.shakeIntensity = Math.min(20, this.shakeIntensity + intensity);
  }

  spawnSparks(x: number, y: number, color: string = '#00f0ff', count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 15 + Math.random() * 15,
        size: 2 + Math.random() * 2,
      });
    }
  }

  spawnExplosion(x: number, y: number, count: number = 20): void {
    const colors = ['#ff3300', '#ffaa00', '#ffff00', '#ff0055', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 20 + Math.random() * 20,
        size: 2.5 + Math.random() * 3.5,
      });
    }
    this.triggerShake(8);
  }

  spawnEmpRing(x: number, y: number): void {
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const speed = 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#c77dff',
        life: 0,
        maxLife: 25,
        size: 3,
      });
    }
    this.triggerShake(10);
  }

  spawnDashTrail(x: number, y: number, facing: string = 'right'): void {
    const colors = ['#00ffff', '#00ffaa', '#00bfff'];
    for (let i = 0; i < 10; i++) {
      let vx = (Math.random() - 0.5) * 1.5;
      let vy = (Math.random() - 0.5) * 1.5;
      if (facing === 'right') vx -= 2;
      if (facing === 'left') vx += 2;
      if (facing === 'down') vy -= 2;
      if (facing === 'up') vy += 2;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx,
        vy,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 14 + Math.random() * 8,
        size: 2.5 + Math.random() * 2,
      });
    }
  }

  update(dt: number = 16): void {
    // 震屏衰減
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity * 0.88 - 0.3);
    }

    // 粒子物理模擬
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life++;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  applyScreenShake(ctx: any): void {
    if (this.shakeIntensity > 0.2 && typeof ctx.translate === 'function') {
      const dx = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const dy = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(dx, dy);
    }
  }

  render(ctx: any, camX: number, camY: number): void {
    if (this.particles.length === 0) return;
    ctx.save?.();
    for (const p of this.particles) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      const px = p.x - camX;
      const py = p.y - camY;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath?.();
      ctx.arc?.(px, py, p.size * alpha, 0, Math.PI * 2);
      ctx.fill?.();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore?.();
  }
}
