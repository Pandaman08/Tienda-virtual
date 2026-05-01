import { create } from "zustand";

type Item = {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
};

type CartState = {
  items: Item[];
  hydrate: () => void;
  add: (item: Item) => void;
  remove: (id: number) => void;
  updateQty: (id: number, cantidad: number) => void;
  increment: (id: number) => void;
  decrement: (id: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "tienda-cart";

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  hydrate: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      set({ items: JSON.parse(raw) as Item[] });
    }
  },
  add: (item) => {
    const current = get().items;
    const found = current.find((x) => x.id === item.id);
    const next = found
      ? current.map((x) => (x.id === item.id ? { ...x, cantidad: x.cantidad + item.cantidad } : x))
      : [...current, item];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ items: next });
  },
  remove: (id) => {
    const next = get().items.filter((x) => x.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ items: next });
  },
  updateQty: (id, cantidad) => {
    const qty = Math.max(1, Math.floor(cantidad));
    const next = get().items.map((x) => (x.id === id ? { ...x, cantidad: qty } : x));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ items: next });
  },
  increment: (id) => {
    const next = get().items.map((x) => (x.id === id ? { ...x, cantidad: x.cantidad + 1 } : x));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ items: next });
  },
  decrement: (id) => {
    const next = get().items
      .map((x) => (x.id === id ? { ...x, cantidad: x.cantidad - 1 } : x))
      .filter((x) => x.cantidad > 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    set({ items: next });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ items: [] });
  }
}));
