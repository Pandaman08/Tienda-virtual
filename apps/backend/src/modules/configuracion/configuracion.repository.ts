import { prisma } from "../../config/prisma";

const STORE_ID = 1;

export const configuracionRepository = {
  async get() {
    return prisma.cfg_tienda.upsert({
      where: { id: STORE_ID },
      update: {},
      create: { id: STORE_ID, nombre: "MI EMPRESA" },
    });
  },

  async save(data: {
    nombre?: string;
    logo?: string | null;
    ruc?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    igv?: string;
    moneda_simbolo?: string;
    moneda_nombre?: string;
    serie_boleta?: string;
    serie_factura?: string;
  }) {
    return prisma.cfg_tienda.upsert({
      where: { id: STORE_ID },
      update: data,
      create: { id: STORE_ID, nombre: "MI EMPRESA", ...data },
    });
  },
};
