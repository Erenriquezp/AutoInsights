/** Map a value to one of `count` equal-count classes (0 = lowest). */
export function quantileClasses(values: number[], count: number): (value: number) => number {
  const sorted = [...values].sort((a, b) => a - b);
  return (value) => {
    if (sorted.length <= 1) return 0;
    const rank = sorted.filter((v) => v < value).length;
    return Math.min(count - 1, Math.floor((rank / sorted.length) * count));
  };
}
