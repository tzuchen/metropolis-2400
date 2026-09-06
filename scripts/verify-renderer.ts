import { GameRenderer } from '../src/renderer';

const mockCanvas = {
  width: 800,
  height: 600,
  getContext: (type: string) => ({
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
    fill: () => {},
    stroke: () => {},
    setLineDash: () => {},
    measureText: (t: string) => ({ width: t.length * 8 }),
  })
} as unknown as HTMLCanvasElement;

const renderer = new GameRenderer(mockCanvas);
if (typeof renderer.render !== 'function') {
  throw new Error('GameRenderer missing render method');
}
console.log('Renderer verification passed!');
