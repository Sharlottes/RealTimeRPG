import { Rationess } from '@type';

/**
 * @param arr 값을 뽑을 배열
 * @returns arr 배열에서 특정 비율 기반의 랜덤으로 인수 하나를 뽑아 반환
 */
export function getOne<T extends Rationess>(arr: T[]): T {
  let random = Math.random();
  const total = arr.reduce((a, e) => a + e.ratio, 0);
  for (const i in arr) {
    random -= arr[i].ratio / total;
    if (random < 0) {
      return arr[i];
    }
  }
  return arr[0];
}