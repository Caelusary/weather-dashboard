import { describe, expect, it } from 'vitest';
import { isWeakDevice } from './device';

describe('isWeakDevice', () => {
  it('treats few cores, little memory or Data Saver as weak', () => {
    expect(isWeakDevice({ hardwareConcurrency: 4, deviceMemory: 8 })).toBe(true);
    expect(isWeakDevice({ hardwareConcurrency: 8, deviceMemory: 2 })).toBe(true);
    expect(isWeakDevice({ hardwareConcurrency: 8, connection: { saveData: true } })).toBe(true);
  });

  it('treats a capable device, or one that reports nothing, as capable', () => {
    expect(isWeakDevice({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(false);
    expect(isWeakDevice({})).toBe(false);
    expect(isWeakDevice(null)).toBe(false);
  });
});
