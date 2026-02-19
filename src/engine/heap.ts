/**
 * Binary Signal Heap
 * 
 * Backs numeric signals with a SharedArrayBuffer (or ArrayBuffer) and Float64Array
 * to enable zero-copy updates and high-performance sharing between workers.
 * 
 * Mappings between string keys and heap indices are maintained here.
 */

export class BinaryHeap {
  private buffer: SharedArrayBuffer | ArrayBuffer;
  private view: Float64Array;
  private keyMap: Map<string, number>;
  private nextIndex: number;
  private capacity: number;

  constructor(capacity: number = 1024) {
    this.capacity = capacity;
    // Use SharedArrayBuffer if available for threading support (Phase 7 preparation)
    if (typeof SharedArrayBuffer !== 'undefined') {
      this.buffer = new SharedArrayBuffer(capacity * 8);
    } else {
      this.buffer = new ArrayBuffer(capacity * 8);
    }
    this.view = new Float64Array(this.buffer);
    this.keyMap = new Map();
    this.nextIndex = 0;
  }

  /**
   * Allocates a slot in the heap for a key.
   * Returns the index.
   */
  public alloc(key: string, initialValue: number = 0): number {
    if (this.keyMap.has(key)) {
      const idx = this.keyMap.get(key)!;
      this.view[idx] = initialValue;
      return idx;
    }

    if (this.nextIndex >= this.capacity) {
      this.grow();
    }

    const idx = this.nextIndex++;
    this.keyMap.set(key, idx);
    this.view[idx] = initialValue;
    return idx;
  }

  /**
   * Gets the value from the heap.
   */
  public get(key: string): number | undefined {
    const idx = this.keyMap.get(key);
    return idx !== undefined ? this.view[idx] : undefined;
  }

  /**
   * Sets a value in the heap.
   */
  public set(key: string, value: number): void {
    const idx = this.keyMap.get(key);
    if (idx !== undefined) {
      this.view[idx] = value;
      // TODO: Trigger reactivity? 
      // The heap itself is just storage. Reactivity system must wrap this.
    } else {
      this.alloc(key, value);
    }
  }

  /**
   * Expands the heap capacity.
   */
  private grow() {
    const newCapacity = this.capacity * 2;
    const newBuffer = typeof SharedArrayBuffer !== 'undefined'
      ? new SharedArrayBuffer(newCapacity * 8)
      : new ArrayBuffer(newCapacity * 8);
    const newView = new Float64Array(newBuffer);

    newView.set(this.view);

    this.capacity = newCapacity;
    this.buffer = newBuffer;
    this.view = newView;
  }

  public getBuffer(): ArrayBufferLike {
    return this.buffer;
  }
}

// Global Heap Instance
export const heap = new BinaryHeap();
