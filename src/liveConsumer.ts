import {
  consumerDestroy,
  getActiveConsumer,
  REACTIVE_NODE,
  setActiveConsumer,
} from './graph';

const noop = () => {};
export const beginEnsureLive = () => {
  const activeConsumer = getActiveConsumer();
  if (activeConsumer) {
    return noop;
  }

  const liveConsumer = Object.create(REACTIVE_NODE);
  liveConsumer.consumerIsAlwaysLive = true;
  liveConsumer.consumerAllowSignalWrites = true;

  setActiveConsumer(liveConsumer);
  return () => {
    setActiveConsumer(null);
    consumerDestroy(liveConsumer);
  };
};
