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

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  color: string;
  secondaryColor: string;
  lineWidth: number;
  life: number;
  maxLife: number;
}

export class FXManager {
  shakeIntensity: number = 0;
  particles: Particle[] = [];
  shockwaves: Shockwave[] = [];
  empFlashAlpha: number = 0;

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

  spawnEmpRing(x: number, y: number, maxRadius: number = 220): void {
    // 產生 2 層同心高能擴散震波環
    // 主震波外環
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius,
      speed: 1,
      color: '#00f0ff',
      secondaryColor: '#c77dff',
      lineWidth: 6,
      life: 0,
      maxLife: 35,
    });
    // 次級電磁環
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: maxRadius * 0.7,
      speed: 0.8,
      color: '#c77dff',
      secondaryColor: '#ffffff',
      lineWidth: 3,
      life: 0,
      maxLife: 30,
    });

    // 產生 45 顆以上放射狀高速電漿火花粒子
    const colors = ['#00f0ff', '#c77dff', '#ffffff'];
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const speed = 3.5 + Math.random() * 5.0; // 3.5 ~ 8.5 px/frame
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        size: 2.5 + Math.random() * 3,
      });
    }

    this.triggerShake(15);
    this.empFlashAlpha = 0.35;
  }

  spawnPlasmaCanisterExplosion(x: number, y: number, blastRadius: number = 105): void {
    // 產生 2 層高能電漿震波環
    // 主震波外環：火焰橘色與金色
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: blastRadius,
      speed: 1,
      color: '#ff6600',
      secondaryColor: '#ffcc00',
      lineWidth: 5,
      life: 0,
      maxLife: 30,
    });
    // 次級電漿能量環：高壓電漿青藍色與亮白色
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: blastRadius * 0.65,
      speed: 0.85,
      color: '#00f0ff',
      secondaryColor: '#ffffff',
      lineWidth: 3,
      life: 0,
      maxLife: 25,
    });

    // 產生 25 顆以上放射狀高溫電漿火花粒子
    const colors = ['#ff6600', '#ffcc00', '#00f0ff', '#ffffff'];
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 2.5 + Math.random() * 4.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 18 + Math.random() * 12,
        size: 2 + Math.random() * 3,
      });
    }

    this.triggerShake(14);
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

    // EMP 閃光衰減
    if (this.empFlashAlpha > 0) {
      this.empFlashAlpha = Math.max(0, this.empFlashAlpha * 0.85 - 0.005);
    }

    // 震波模擬 (非線性減速 Ease-out)
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life++;
      const progress = s.life / s.maxLife;
      // Ease-out curve: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      s.radius = s.maxRadius * eased;
      if (s.life >= s.maxLife) {
        this.shockwaves.splice(i, 1);
      }
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
    ctx.save?.();

    // 繪製震波環
    for (const s of this.shockwaves) {
      const px = s.x - camX;
      const py = s.y - camY;
      const alpha = Math.max(0, 1 - s.life / s.maxLife);
      if (alpha <= 0) continue;

      // 徑向漸層半透明高能電磁光波力場
      const grad = ctx.createRadialGradient?.(px, py, s.radius * 0.8, px, py, s.radius * 1.2);
      if (grad) {
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.5, s.color + Math.floor(alpha * 80).toString(16).padStart(2, '0'));
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath?.();
        ctx.arc?.(px, py, s.radius * 1.2, 0, Math.PI * 2);
        ctx.fill?.();
      }

      // 外層發光主震波光環
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth * alpha;
      ctx.globalAlpha = alpha * 0.8;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 15;
      ctx.beginPath?.();
      ctx.arc?.(px, py, s.radius, 0, Math.PI * 2);
      ctx.stroke?.();

      // 內層亮白色核心環
      ctx.strokeStyle = s.secondaryColor;
      ctx.lineWidth = s.lineWidth * 0.4 * alpha;
      ctx.globalAlpha = alpha * 0.6;
      ctx.shadowColor = s.secondaryColor;
      ctx.shadowBlur = 8;
      ctx.beginPath?.();
      ctx.arc?.(px, py, s.radius * 0.92, 0, Math.PI * 2);
      ctx.stroke?.();

      // 震波前緣曲折放射電弧閃電分支
      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      const branchCount = 12;
      for (let b = 0; b < branchCount; b++) {
        const angle = (b / branchCount) * Math.PI * 2 + s.life * 0.05;
        const bx = px + Math.cos(angle) * s.radius;
        const by = py + Math.sin(angle) * s.radius;
        ctx.beginPath?.();
        ctx.moveTo(bx, by);
        let cx = bx;
        let cy = by;
        const segments = 4;
        for (let seg = 0; seg < segments; seg++) {
          const nextAngle = angle + (Math.random() - 0.5) * 0.8;
          const segLen = 4 + Math.random() * 6;
          cx += Math.cos(nextAngle) * segLen;
          cy += Math.sin(nextAngle) * segLen;
          ctx.lineTo?.(cx, cy);
        }
        ctx.stroke?.();
      }
    }

    // 繪製粒子
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

    // 全畫面青藍色電磁干擾微光
    if (this.empFlashAlpha > 0.02) {
      ctx.globalAlpha = this.empFlashAlpha;
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(0, 0, ctx.canvas?.width || 800, ctx.canvas?.height || 600);
      ctx.globalAlpha = 1;
    }

    ctx.restore?.();
  }
}
