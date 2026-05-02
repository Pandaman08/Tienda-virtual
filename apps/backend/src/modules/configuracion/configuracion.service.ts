import { configuracionRepository } from "./configuracion.repository";

export const configuracionService = {
  async get() {
    return configuracionRepository.get();
  },

  async save(data: Parameters<typeof configuracionRepository.save>[0]) {
    return configuracionRepository.save(data);
  },
};
