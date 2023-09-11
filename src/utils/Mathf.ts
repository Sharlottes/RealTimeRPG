export default class Mathf {
  public static range(from: number, to: number) {
    return from + Math.random() * (to - from);
  }

  public static clamp(value: number, min = 0, max = 1) {
    if (value > max) return max;
    else if (value < min) return min;
    else return value;
  }

  public static round(target: number, step = 0) {
    return Math.round(target * Math.pow(10, step)) / Math.pow(10, step);
  }
}
