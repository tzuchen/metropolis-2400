import { EffectPreset } from './types';
import { getEffectPreset } from './effectRegistry';
import type { RandomSource } from './types';

type RNGSource = (() => number) | RandomSource;

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
  private rng: () => number = Math.random;

  constructor(rng?: RNGSource) {
    if (rng) {
      this.setRNG(rng);
    }
  }

  setRNG(rng: RNGSource): void {
    if (typeof rng === 'function') {
      this.rng = rng;
    } else if (typeof rng.random === 'function') {
      this.rng = () => rng.random!();
    } else {
      this.rng = Math.random;
    }
  }

  triggerShake(intensity: number): void {
    this.shakeIntensity = Math.min(20, this.shakeIntensity + intensity);
  }

  spawnSparks(x: number, y: number, color: string = '#00f0ff', count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = this.rng() * Math.PI * 2;
      const speed = 1 + this.rng() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 15 + this.rng() * 15,
        size: 2 + this.rng() * 2,
      });
    }
  }

  spawnExplosion(x: number, y: number, count: number = 20): void {
    const colors = ['#ff3300', '#ffaa00', '#ffff00', '#ff0055', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = this.rng() * Math.PI * 2;
      const speed = 1.5 + this.rng() * 4.5;
      const color = colors[Math.floor(this.rng() * colors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: 20 + this.rng() * 20,
        size: 2.5 + this.rng() * 3.5,
      });
    }
    this.triggerShake(8);
  }

  spawnEmpRing(x: number, y: number, maxRadius: number = 220): void {
    const preset = getEffectPreset('EMP_SHOCKWAVE');
    const pCount = preset?.particleCount ?? 48;
    const pColors = preset?.particleColors ?? ['#00f0ff', '#c77dff', '#ffffff'];
    const pMinLife = preset?.particleMinLife ?? 20;
    const pMaxLife = preset?.particleMaxLife ?? 35;
    const pMinSize = preset?.particleMinSize ?? 2.5;
    const pMaxSize = preset?.particleMaxSize ?? 5.5;
    const pMinSpeed = preset?.particleMinSpeed ?? 3.5;
    const pMaxSpeed = preset?.particleMaxSpeed ?? 8.5;
    const swMaxRadius = preset?.shockwaveMaxRadius ?? 220;
    const swSpeed = preset?.shockwaveSpeed ?? 1;
    const swColor = preset?.shockwaveColor ?? '#00f0ff';
    const swSecondaryColor = preset?.shockwaveSecondaryColor ?? '#c77dff';
    const swLineWidth = preset?.shockwaveLineWidth ?? 6;
    const swLife = preset?.shockwaveLife ?? 35;
    const flashAlpha = preset?.flashAlpha ?? 0.35;
    const shakeIntensity = preset?.shakeIntensity ?? 15;

    // 產生 2 層同心高能擴散震波環
    // 主震波外環
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: maxRadius,
      speed: swSpeed,
      color: swColor,
      secondaryColor: swSecondaryColor,
      lineWidth: swLineWidth,
      life: 0,
      maxLife: swLife,
    });
    // 次級電磁環
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: maxRadius * 0.7,
      speed: 0.8,
      color: swSecondaryColor,
      secondaryColor: '#ffffff',
      lineWidth: 3,
      life: 0,
      maxLife: 30,
    });

    // 產生放射狀高速電漿火花粒子
    for (let i = 0; i < pCount; i++) {
      const angle = (i / pCount) * Math.PI * 2 + (this.rng() - 0.5) * 0.2;
      const speed = pMinSpeed + this.rng() * (pMaxSpeed - pMinSpeed);
      const color = pColors[Math.floor(this.rng() * pColors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: pMinLife + this.rng() * (pMaxLife - pMinLife),
        size: pMinSize + this.rng() * (pMaxSize - pMinSize),
      });
    }

    this.triggerShake(shakeIntensity);
    this.empFlashAlpha = flashAlpha;
  }

  spawnPlasmaCanisterExplosion(x: number, y: number, blastRadius: number = 105): void {
    const preset = getEffectPreset('PLASMA_CANISTER_EXPLOSION');
    const pCount = preset?.particleCount ?? 28;
    const pColors = preset?.particleColors ?? ['#ff6600', '#ffcc00', '#00f0ff', '#ffffff'];
    const pMinLife = preset?.particleMinLife ?? 18;
    const pMaxLife = preset?.particleMaxLife ?? 30;
    const pMinSize = preset?.particleMinSize ?? 2;
    const pMaxSize = preset?.particleMaxSize ?? 5;
    const pMinSpeed = preset?.particleMinSpeed ?? 2.5;
    const pMaxSpeed = preset?.particleMaxSpeed ?? 7;
    const swMaxRadius = preset?.shockwaveMaxRadius ?? 105;
    const swSpeed = preset?.shockwaveSpeed ?? 1;
    const swColor = preset?.shockwaveColor ?? '#ff6600';
    const swSecondaryColor = preset?.shockwaveSecondaryColor ?? '#ffcc00';
    const swLineWidth = preset?.shockwaveLineWidth ?? 5;
    const swLife = preset?.shockwaveLife ?? 30;
    const shakeIntensity = preset?.shakeIntensity ?? 14;

    // 產生 2 層高能電漿震波環
    // 主震波外環：火焰橘色與金色
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: blastRadius,
      speed: swSpeed,
      color: swColor,
      secondaryColor: swSecondaryColor,
      lineWidth: swLineWidth,
      life: 0,
      maxLife: swLife,
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

    // 產生放射狀高溫電漿火花粒子
    for (let i = 0; i < pCount; i++) {
      const angle = (i / pCount) * Math.PI * 2 + (this.rng() - 0.5) * 0.3;
      const speed = pMinSpeed + this.rng() * (pMaxSpeed - pMinSpeed);
      const color = pColors[Math.floor(this.rng() * pColors.length)];
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0,
        maxLife: pMinLife + this.rng() * (pMaxLife - pMinLife),
        size: pMinSize + this.rng() * (pMaxSize - pMinSize),
      });
    }

    this.triggerShake(shakeIntensity);
  }

  spawnDashTrail(x: number, y: number, facing: string = 'right'): void {
    const colors = ['#00ffff', '#00ffaa', '#00bfff'];
    for (let i = 0; i < 10; i++) {
      let vx = (this.rng() - 0.5) * 1.5;
      let vy = (this.rng() - 0.5) * 1.5;
      if (facing === 'right') vx -= 2;
      if (facing === 'left') vx += 2;
      if (facing === 'down') vy -= 2;
      if (facing === 'up') vy += 2;

      this.particles.push({
        x: x + (this.rng() - 0.5) * 16,
        y: y + (this.rng() - 0.5) * 16,
        vx,
        vy,
        color: colors[Math.floor(this.rng() * colors.length)],
        life: 0,
        maxLife: 14 + this.rng() * 8,
        size: 2.5 + this.rng() * 2,
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
      const dx = (this.rng() - 0.5) * this.shakeIntensity * 2;
      const dy = (this.rng() - 0.5) * this.shakeIntensity * 2;
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
          const nextAngle = angle + (this.rng() - 0.5) * 0.8;
          const segLen = 4 + this.rng() * 6;
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
