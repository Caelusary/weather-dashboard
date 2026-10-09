/**
 * A rough "this phone will struggle" check: few CPU cores, little memory, or Data Saver on. Such
 * devices get the lite sky (no particles or sun beams) and glass without backdrop blur.
 * Missing APIs (Safari has no deviceMemory) count as capable.
 */
export function isWeakDevice(nav = globalThis.navigator) {
  if (!nav) return false;
  return (
    (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || nav.connection?.saveData === true
  );
}
