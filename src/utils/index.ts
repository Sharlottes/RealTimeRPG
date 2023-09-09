export * from "./Arrays";
export * from "./Strings";
export * from "./Canvas";
export * from "./Mathf";
export * from "./delay";
export * from "./isOfType";

export function isFunction(param: any): param is Function {
  return typeof param === "function";
}
export function functionOrNot<T>(param: MaybeFunction<T>): T {
  if (isFunction(param)) return param();
  return param;
}
