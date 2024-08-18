import {
  REACTIVE_NODE,
  type ReactiveNode,
  producerAccessed,
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

  node.onChange = () => {
    node.value = UNSET;
    node.version++;
    producerIncrementEpoch();
    producerNotifyConsumers(node);
  };

  return node;
}

export function volatileGetFn<T>(this: VolatileNode<T>): T {
  producerAccessed(this);

  // TODO:
  // - Handle errors in live snapshots.
  // - Throw if dependencies are used in the snapshot.
  // - Bust downstream caches when not live.

  if (this.live) {
    if (this.value === UNSET) {
      this.value = this.getSnapshot();
    }

    return this.value;
  }

  return this.getSnapshot();
}

export interface VolatileNode<T> extends ReactiveNode {
  /** Read state from the outside world. May be expensive. */
  getSnapshot: () => T;

  /** Called by the `subscribe` handler. Invalidates the cached value. */
  onChange(): void;

  /** Whether the volatile node is being observed. */
  live: boolean;

  /**
   * Cached value. Only used when being watched and a subscriber is provided.
   * Otherwise values are pulled from `getSnapshot`.
   */
  value: typeof UNSET | T;
}

// Note: Using an IIFE here to ensure that the spread assignment is not considered
// a side-effect, ending up preserving `VOLATILE_NODE` and `REACTIVE_NODE`.
// TODO: remove when https://github.com/evanw/esbuild/issues/3392 is resolved.
const VOLATILE_NODE = /* @__PURE__ */ (() => ({
  ...REACTIVE_NODE,
  value: UNSET,
  live: false,
}))();
