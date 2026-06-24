// node muhitida localStorage/window yo'q — zustand persist uchun oddiy mock.
class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? (this.m.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  clear(): void {
    this.m.clear();
  }
  key(i: number): string | null {
    return Array.from(this.m.keys())[i] ?? null;
  }
  get length(): number {
    return this.m.size;
  }
}

const storage = new MemoryStorage() as unknown as Storage;
const g = globalThis as unknown as {
  localStorage: Storage;
  window: { localStorage: Storage };
};
g.localStorage = storage;
g.window = { localStorage: storage };
