import { ordenesRepository } from "./ordenes.repository";

export const ordenesService = {
  checkout: (clienteId: number, metodoPago: string) =>
    ordenesRepository.createOrdenDesdeCarrito(clienteId, metodoPago),
  mine: (clienteId: number) => ordenesRepository.listByCliente(clienteId),
  all: ordenesRepository.listAll,
  changeEstado: ordenesRepository.updateEstado
};
