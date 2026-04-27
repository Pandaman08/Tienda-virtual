import { usuariosRepository } from "./usuarios.repository";

export const usuariosService = {
  list: usuariosRepository.list
};
