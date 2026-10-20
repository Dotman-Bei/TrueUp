/** A torn-receipt bottom edge: `teeth` zigzag points cut `depth` px into the foot of the element. */
export function zigzagFoot(teeth = 24, depth = 10): string {
  const pts = ["0 0", "100% 0"];
  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth) * 100;
    pts.push(`${x.toFixed(3)}% ${i % 2 === 0 ? "100%" : `calc(100% - ${depth}px)`}`);
  }
  return `polygon(${pts.join(", ")})`;
}
