import {
  consumerDestroy,
  getActiveConsumer,
  producerAccessed,
  REACTIVE_NODE,
  ReactiveNode,
  setActiveConsumer,
} from './graph';

const noop = () => {};
export const beginEnsureLive = (node: ReactiveNode) => {
  const activeConsumer = getActiveConsumer();
  if (activeConsumer) {
    return noop;
  }

  const liveConsumer = Object.create(REACTIVE_NODE);
  liveConsumer.consumerIsAlwaysLive = true;
  liveConsumer.consumerAllowSignalWrites = true;

  setActiveConsumer(liveConsumer);
  producerAccessed(node);
  setActiveConsumer(null);
  return () => {
    consumerDestroy(liveConsumer);
  };
};
