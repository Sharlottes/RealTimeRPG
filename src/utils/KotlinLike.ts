Object.defineProperty(Object.prototype, "to", function <T, R>(this: T, callback: (x: T) => R): R {
  return callback(this);
});

Object.defineProperty(Object.prototype, "and", function <T>(this: T, callback: (x: T) => void): T {
  callback(this);
  return this;
});

declare global {
  interface Object {
    to<T, R>(this: T, callback: (x: T) => R): R;
    and<T>(this: T, callback: (x: T) => void): T;
  }

  interface Number {
    to<T, R>(this: T, callback: (x: T) => R): R;
    and<T>(this: T, callback: (x: T) => void): T;
  }
}

export {};
