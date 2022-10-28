export class Arrays {
  public static division<T>(array: T[], n: number): T[][] {
    const len = array.length;
    const max = Math.floor(len / n) + (Math.floor(len % n) > 0 ? 1 : 0);
    const out = [];

    for (let i = 0; i < max; i++) out.push(array.splice(0, n));
    return out;
  }
}