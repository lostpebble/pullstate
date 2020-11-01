export function isWebOrReactNative(): boolean {
  return typeof document !== "undefined" || (navigator?.product === "ReactNative");
}
