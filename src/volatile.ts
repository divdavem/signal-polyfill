import type {Signal} from './wrapper';
import {
  REACTIVE_NODE,
  type ReactiveNode,
  producerAccessed,
  producerUpdateValueVersion,
  producerIncrementEpoch,
  producerNotifyConsumers,
} from './graph';

/**
 * A dedicated symbol used before a computed value has been calculated for the first time.
 * Explicitly typed as `any` so we can use it as signal's value.
 */
export const UNSET = /* @__PURE__ */ Symbol('UNSET');

/**
 * Volatile functions read from external sources. They can change at any time
 * without notifying the graph. If the source supports it, optionally we can
 * subscribe to changes while observed.
 *
 * Unless the external source is actively being observed, we have to assume
 * it's stale and bust the cache of everything downstream.
 */
export function createVolatile<T>(getSnapshot: () => T): VolatileNode<T> {
  const node: VolatileNode<T> = Object.create(VOLATILE_NODE);
  node.getSnapshot = getSnapshot;

  return node;
}

export function volatileGetFn<T>(node: VolatileNode<T>): T {
  // Update the cache if necessary.
  producerUpdateValueVersion(node);

  // Track who accessed the signal.
  producerAccessed(node);

  return node.value as T;
}

export interface VolatileNode<T> extends ReactiveNode {
  /** Read state from the outside world. May be expensive. */
  getSnapshot: () => T;

  /** Invalidates the cached value when subscribed to an external source. */
  onChange(this: VolatileNode<T>): void;

  /**
   * Cached value. Only used when being watched and a subscriber is provided.
   * Otherwise values are pulled from `getSnapshot`.
   */
  value: typeof UNSET | T;

  /**
   * If the volatile source supports it, a `subscribe` callback may be
   * provided that upgrades to a non-volatile source by tracking changes in
   * a versioned cache.
   *
   * The return value may be an `unsubscribe` callback.
   */
  subscribe?: (
    this: Signal.Volatile<T>,
    onChange: () => void,
  ) => void | ((this: Signal.Volatile<T>) => void);

  /**
   * Returned by the `subscribe` callback. Invoked when the volatile source is
   * no longer being observed.
   */
  unsubscribe(): void;
}

// Note: Using an IIFE here to ensure that the spread assignment is not considered
// a side-effect, ending up preserving `VOLATILE_NODE` and `REACTIVE_NODE`.
// TODO: remove when https://github.com/evanw/esbuild/issues/3392 is resolved.
const VOLATILE_NODE = /* @__PURE__ */ (() => ({
  ...REACTIVE_NODE,
  value: UNSET,
  dirty: true,
  volatile: true,

  unsubscribe() {},

  onChange() {
    this.version++;
    this.value = UNSET;
    this.dirty = true;
    producerIncrementEpoch();
    producerNotifyConsumers(this);
  },

  producerMustRecompute(node: VolatileNode<unknown>): boolean {
    return node.value === UNSET;
  },

  producerRecomputeValue(node: VolatileNode<unknown>): void {
    if (node.volatile) {
      // The source is untracked. Unconditionally refresh the value.
      node.value = node.getSnapshot();
      return;
    }

    if (node.value === UNSET) {
      // The value is tracked, but the cache is stale. Refresh it.
      node.value = node.getSnapshot();
    }
  },
}))();
