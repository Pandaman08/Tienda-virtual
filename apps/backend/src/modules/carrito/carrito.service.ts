import { carritoRepository } from "./carrito.repository";

export const carritoService = {
  getMine: async (clienteId: number) => {
    const carrito = await carritoRepository.getOrCreateCarrito(clienteId);
    const items = await carritoRepository.listItems(carrito.id);
    const subtotal = items.reduce((acc, item) => acc + Number(item.precio_unitario) * item.cantidad, 0);
    return { carrito, items, subtotal };
  },

  addItem: async (clienteId: number, productoId: number, cantidad: number) => {
    const carrito = await carritoRepository.getOrCreateCarrito(clienteId);
    return carritoRepository.upsertItem(carrito.id, productoId, cantidad);
  },

  removeItem: carritoRepository.removeItem,
  clear: async (clienteId: number) => {
    const carrito = await carritoRepository.getOrCreateCarrito(clienteId);
    return carritoRepository.clearCarrito(carrito.id);
  }
};
