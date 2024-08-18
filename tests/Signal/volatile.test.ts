import {describe, expect, it, vi} from 'vitest';
import {Signal} from '../../src/wrapper.js';

describe('Signal.Volatile', () => {
  it('reads the value using the given function', () => {
    const volatile = new Signal.Volatile(() => 'value');

    expect(volatile.get()).toBe('value');
  });

  it('always reads values from source when not observed', () => {
    let count = 0;
    const spy = vi.fn(() => count++);
    const volatile = new Signal.Volatile(spy);

    expect(spy).not.toHaveBeenCalled();

    expect(volatile.get()).toBe(0);
    expect(volatile.get()).toBe(1);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('calls the subscribe function when observed', () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const volatile = new Signal.Volatile(() => 'value', {
      subscribe,
    });

    expect(subscribe).not.toHaveBeenCalled();
    const watcher = new Signal.subtle.Watcher(() => {});
    watcher.watch(volatile);

    expect(subscribe).toHaveBeenCalled();
  });

  it('unsubscribes when the function is no longer observed', () => {
    const unsubscribe = vi.fn();
    const volatile = new Signal.Volatile(() => 'value', {
      subscribe: () => unsubscribe,
    });

    const watcher = new Signal.subtle.Watcher(() => {});
    watcher.watch(volatile);
    expect(unsubscribe).not.toHaveBeenCalled();

    watcher.unwatch(volatile);
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('survives subscribe without an unsubscribe callback', () => {
    const volatile = new Signal.Volatile(() => 'value', {
      subscribe: () => {},
    });

    const watcher = new Signal.subtle.Watcher(() => {});
    watcher.watch(volatile);
    const pass = () => watcher.unwatch(volatile);

    expect(pass).not.toThrow();
  });

  it('returns the cached value when observed', () => {
    const getSnapshot = vi.fn(() => 'value');
    const volatile = new Signal.Volatile(getSnapshot, {
      subscribe: () => {},
    });

    // Promote the volatile to a 'live' producer.
    const watcher = new Signal.subtle.Watcher(() => {});
    watcher.watch(volatile);

    // Cache the value. Depend on `onChange` to tell us of changes.
    expect(volatile.get()).toBe('value');
    expect(volatile.get()).toBe('value');
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });

  it('can be cached by consumers while observed', () => {
    const getSnapshot = vi.fn(() => 'value');
    const volatile = new Signal.Volatile(getSnapshot, {
      subscribe: () => {},
    });

    const watcher = new Signal.subtle.Watcher(() => {});
    watcher.watch(volatile);

    expect(getSnapshot).not.toHaveBeenCalled();
    const computed = new Signal.Computed(() => volatile.get());

    expect(computed.get()).toBe('value');
    expect(computed.get()).toBe('value');
    expect(getSnapshot).toHaveBeenCalledTimes(1);
  });
});
