import { ordenesRepository } from "./ordenes.repository";

type PasarelaInput = {
  metodoPago: "TARJETA" | "YAPE" | "PLIN" | "TRANSFERENCIA";
  tarjetaNumero?: string;
  titular?: string;
  cvv?: string;
  expiracion?: string;
  telefonoYape?: string;
  numeroOperacion?: string;
};

const procesarPasarela = (input: PasarelaInput) => {
  if (input.metodoPago === "TARJETA") {
    if (!input.tarjetaNumero || !input.titular || !input.cvv || !input.expiracion) {
      throw new Error("Datos de tarjeta incompletos");
    }
    if (input.tarjetaNumero.replaceAll(" ", "").length < 12) {
      throw new Error("Numero de tarjeta invalido");
    }
    if (input.tarjetaNumero.endsWith("0000")) {
      throw new Error("Pago rechazado por la pasarela");
    }
  }

  if ((input.metodoPago === "YAPE" || input.metodoPago === "PLIN") && !input.telefonoYape) {
    throw new Error(`Telefono ${input.metodoPago} requerido`);
  }

  if (input.metodoPago === "TRANSFERENCIA" && !input.numeroOperacion) {
    throw new Error("Numero de operacion requerido");
  }

  const transaccionId = `TX-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
  return { transaccionId };
};

export const ordenesService = {
  checkout: (clienteId: number, payload: PasarelaInput) => {
    const pago = procesarPasarela(payload);
    return ordenesRepository.createOrdenDesdeCarrito(clienteId, payload.metodoPago, pago.transaccionId);
  },
  mine: (clienteId: number) => ordenesRepository.listByCliente(clienteId),
  all: (filters?: { desde?: string; hasta?: string; cliente?: string; clienteId?: number }) => {
    const desde = filters?.desde ? new Date(`${filters.desde}T00:00:00`) : undefined;
    const hasta = filters?.hasta ? new Date(`${filters.hasta}T23:59:59`) : undefined;
    return ordenesRepository.listAll({
      desde: desde && !Number.isNaN(desde.getTime()) ? desde : undefined,
      hasta: hasta && !Number.isNaN(hasta.getTime()) ? hasta : undefined,
      cliente: filters?.cliente?.trim() || undefined,
      clienteId: filters?.clienteId
    });
  },
  detail: (id: number) => ordenesRepository.findByIdWithDetail(id),
  anular: (id: number) => ordenesRepository.revertirVenta(id),
  devolucion: (id: number) => ordenesRepository.registrarDevolucion(id),
  changeEstado: ordenesRepository.updateEstado
};
