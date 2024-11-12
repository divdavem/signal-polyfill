import type {BaseLink, Consumer, RawStore} from './store';

export class RawWatcher implements Consumer {
  producerLinks: BaseLink<any>[] = [];
  dirty = false;

  constructor(
    public notifyFn: () => void,
    public wrapper: any,
  ) {}

  markDirty(): void {
    if (!this.dirty) {
      this.dirty = true;
      this.notifyFn.call(this.wrapper);
    }
  }

  addProducer(producer: RawStore<any>) {
    const link = producer.newLink(this);
    this.producerLinks.push(link);
    producer.registerConsumer(link);
  }

  removeProducer(producer: RawStore<any>) {
    const producerLinks = this.producerLinks;
    const index = producerLinks.findIndex((link) => link.producer === producer);
    if (index > -1) {
      const link = producerLinks[index];
      const lastItem = producerLinks.pop()!;
      if (link !== lastItem) {
        producerLinks[index] = lastItem;
      }
      producer.unregisterConsumer(link);
    }
  }
}
