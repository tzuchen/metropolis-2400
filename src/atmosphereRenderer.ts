export class AtmosphereRenderer {
  drawScreenAtmosphere(width: number, height: number, ctx: any): void {
    ctx.save?.();
    const grad = ctx.createLinearGradient?.(0, 0, 0, height);
    if (grad) {
      grad.addColorStop(0, 'rgba(0, 5, 10, 0.4)');
      grad.addColorStop(0.1, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.9, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 5, 10, 0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect?.(0, 0, width, height);
    }
    ctx.restore?.();
  }
  drawSectorAtmosphere(
    px: number,
    py: number,
    width: number,
    height: number,
    camX: number,
    camY: number,
    ctx: any,
    now: number
  ): void {
    ctx.save?.();

    // 判斷玩家所在分區
    const sector = this.getSectorFromPosition(px, py);

    if (sector === 'SECTOR_1') {
      // 賽博酸雨絲與霧氣粒子 (Cyber Acid Rain & Fog Particles)
      this.drawAcidRainAndFog(width, height, ctx, now);
    } else if (sector === 'SECTOR_2') {
      // 科技區輸送帶微弱火花 (Tech District Conveyor Sparks)
      this.drawConveyorSparks(width, height, ctx, now);
    } else if (sector === 'SEWER_0') {
      // 下水道微弱毒霧蒸汽 (Sewer Toxic Mist & Steam)
      this.drawSewerToxicMist(width, height, ctx, now);
    }

    ctx.restore?.();
  }
  getSectorFromPosition(px: number, py: number): string {
    // 簡化分區判斷邏輯
    if (px >= 50 && py >= 20) {
      return 'SEWER_0';
    } else if (px >= 40) {
      return 'SECTOR_2';
    } else {
      return 'SECTOR_1';
    }
  }
  drawAcidRainAndFog(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();

    // 霧氣層 (Fog Layer)
    const fogGrad = ctx.createLinearGradient?.(0, 0, 0, height);
    if (fogGrad) {
      fogGrad.addColorStop(0, 'rgba(20, 40, 50, 0.15)');
      fogGrad.addColorStop(0.5, 'rgba(10, 20, 30, 0.05)');
      fogGrad.addColorStop(1, 'rgba(15, 30, 40, 0.2)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect?.(0, 0, width, height);
    }

    // 酸雨絲 (Acid Rain Streaks)
    const rainCount = 40;
    for (let i = 0; i < rainCount; i++) {
      // Deterministic pseudo-random values derived from index
      const seed = i * 2654435761;
      const hash1 = ((seed ^ (seed >>> 13)) * 2246822519) >>> 0;
      const hash2 = ((hash1 ^ (hash1 >>> 16)) * 3266489917) >>> 0;
      const hash3 = ((hash2 ^ (hash2 >>> 13)) * 668265263) >>> 0;
      const hash4 = ((hash3 ^ (hash3 >>> 16)) * 1274126177) >>> 0;

      // Stable distinct position, speed, length, slant, opacity
      const baseX = (hash1 / 4294967295) * width;
      const fallSpeed = 0.15 + (hash2 / 4294967295) * 0.25;
      const len = 12 + (hash3 / 4294967295) * 16;
      const slant = -1 - (hash4 / 4294967295) * 3;
      const baseAlpha = 0.12 + (hash1 / 4294967295) * 0.12;

      // Subtle time variation for drift and opacity
      const drift = Math.sin(now * 0.0006 + i * 0.7) * 3;
      const alpha = baseAlpha + 0.04 * Math.sin(now * 0.001 + i * 1.3);

      const x = baseX + drift;
      const y = ((now * fallSpeed + (hash2 / 4294967295) * (height + 60)) % (height + 60)) - 30;

      ctx.strokeStyle = `rgba(100, 255, 150, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath?.();
      ctx.moveTo?.(x, y);
      ctx.lineTo?.(x + slant, y + len);
      ctx.stroke?.();
    }

    // 霧氣粒子 (Fog Particles)
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const x = (i * (width / particleCount) + now * 0.012) % width;
      const y = ((i * 73.1) % height) + Math.sin(now * 0.0006 + i) * 12;
      const size = 20 + Math.sin(i * 0.6) * 15;
      const alpha = 0.02 + 0.02 * Math.sin(i * 0.8);

      ctx.fillStyle = `rgba(150, 200, 220, ${alpha})`;
      ctx.beginPath?.();
      ctx.arc?.(x, y, size, 0, Math.PI * 2);
      ctx.fill?.();
    }

    ctx.restore?.();
  }
  drawConveyorSparks(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();

    // 背景微弱光暈 (Subtle Glow)
    const glowGrad = ctx.createRadialGradient?.(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
    if (glowGrad) {
      glowGrad.addColorStop(0, 'rgba(0, 100, 150, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect?.(0, 0, width, height);
    }

    // 輸送帶火花 (Conveyor Sparks)
    const sparkCount = 15;
    for (let i = 0; i < sparkCount; i++) {
      const seed = i * 211.7 + now * 0.08;
      const x = (Math.sin(seed * 0.5) * 0.5 + 0.5) * width;
      const y = (Math.cos(seed * 0.4) * 0.5 + 0.5) * height;
      const size = 1 + Math.random() * 2;
      const alpha = 0.3 + 0.3 * Math.sin(seed * 0.9);

      ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
      ctx.shadowColor = '#ffcc33';
      ctx.shadowBlur = 4;
      ctx.beginPath?.();
      ctx.arc?.(x, y, size, 0, Math.PI * 2);
      ctx.fill?.();
    }

    ctx.shadowBlur = 0;
    ctx.restore?.();
  }
  drawSewerToxicMist(width: number, height: number, ctx: any, now: number): void {
    ctx.save?.();

    // 毒霧底色 (Toxic Mist Base)
    const mistGrad = ctx.createLinearGradient?.(0, height * 0.6, 0, height);
    if (mistGrad) {
      mistGrad.addColorStop(0, 'rgba(50, 100, 30, 0)');
      mistGrad.addColorStop(0.5, 'rgba(60, 120, 40, 0.12)');
      mistGrad.addColorStop(1, 'rgba(80, 150, 50, 0.25)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect?.(0, 0, width, height);
    }

    // 蒸汽粒子 (Steam Particles)
    const steamCount = 25;
    for (let i = 0; i < steamCount; i++) {
      const baseX = (i * (width / steamCount) * 1.618) % width;
      const x = baseX + Math.sin(now * 0.0008 + i * 0.5) * 8;
      const y = height - ((now * 0.15 + i * 40) % (height * 0.5));
      const size = 30 + Math.sin(i * 0.5) * 20;
      const alpha = 0.04 + 0.03 * Math.sin(i * 0.7);

      ctx.fillStyle = `rgba(120, 200, 80, ${alpha})`;
      ctx.beginPath?.();
      ctx.arc?.(x, y, size, 0, Math.PI * 2);
      ctx.fill?.();
    }

    // 地面毒氣光暈 (Ground Toxic Glow)
    const groundGlow = ctx.createLinearGradient?.(0, height - 80, 0, height);
    if (groundGlow) {
      groundGlow.addColorStop(0, 'rgba(100, 180, 60, 0)');
      groundGlow.addColorStop(1, 'rgba(120, 200, 70, 0.15)');
      ctx.fillStyle = groundGlow;
      ctx.fillRect?.(0, height - 80, width, 80);
    }

    ctx.restore?.();
  }
}
