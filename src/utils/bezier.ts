export function calcBezierPath(
  ax: number, ay: number,
  bx: number, by: number
): string {
  const dx = bx - ax;
  const dy = by - ay;
  
  // Tonal curvature based on distance
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // As nodes get closer, relax the curve (larger tension multiplier)
  // As they get further, pull it tighter (smaller tension multiplier)
  const tension = Math.max(0.2, Math.min(0.5, 300 / (distance + 1)));

  const cp1x = ax + dx * tension;
  const cp1y = ay;
  const cp2x = bx - dx * tension;
  const cp2y = by;

  return `M ${ax},${ay} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${bx},${by}`;
}
