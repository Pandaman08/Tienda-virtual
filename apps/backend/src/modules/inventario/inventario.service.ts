import { inventarioRepository } from "./inventario.repository";

export const inventarioService = {
  list: inventarioRepository.list,
  adjust: inventarioRepository.adjust
};
