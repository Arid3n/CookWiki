// Decorative contour lines: nested wobbly rings around a few centres.
// Ported from the topo-v23 mockup; deterministic per seed.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(1);

export function topoPaths(seed: number, width: number, height: number): string[] {
  const rand = mulberry32(Math.floor(seed * 1000) + 1);
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const centres: [number, number, number][] = [
    [w * 0.28, h * 0.45, 1.0],
    [w * 0.78, h * 0.6, 0.8],
    [w * 0.55, h * 0.1, 0.6],
  ];
  const out: string[] = [];
  centres.forEach((c, ci) => {
    const ph = rand() * 6.28 + ci * 2.1; // per-seed, per-centre phase
    for (let k = 1; k <= 11; k++) {
      const base = k * 9 * c[2];
      let d = '';
      for (let a = 0; a < 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        const r =
          base *
          (1 +
            0.22 * Math.sin(3 * t + ph) +
            0.12 * Math.sin(5 * t + ph * 1.7) +
            0.06 * Math.sin(8 * t + ph));
        d += `${a === 0 ? 'M' : 'L'}${f(c[0] + Math.cos(t) * r * 1.25)},${f(c[1] + Math.sin(t) * r * 0.85)} `;
      }
      out.push(`${d}Z`);
    }
  });
  return out;
}
