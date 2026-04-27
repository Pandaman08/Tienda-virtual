import { clientesRepository } from "./clientes.repository";

export const clientesService = {
  list: clientesRepository.list,
  getById: clientesRepository.getById,
  update: clientesRepository.update,
  remove: clientesRepository.remove
};
