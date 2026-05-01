import { useEffect, useState } from "react";
import { UseMutationResult } from "@tanstack/react-query";
import { Ban, Save, X } from "lucide-react";

type ClienteUsuario = {
  id: number;
  email: string;
  activo: boolean;
  cliente?: {
    nombre: string;
    apellido: string;
    telefono?: string | null;
  } | null;
};

type UpdatePayload = {
  id: number;
  email?: string;
  password?: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
  activo?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteUsuario | null;
  mutation: UseMutationResult<unknown, Error, UpdatePayload, unknown>;
};

export const ClientCredentialsModal = ({ isOpen, onClose, cliente, mutation }: Props) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (cliente) {
      setEmail(cliente.email);
      setPassword("");
      setNombre(cliente.cliente?.nombre || "");
      setApellido(cliente.cliente?.apellido || "");
      setTelefono(cliente.cliente?.telefono || "");
      setActivo(cliente.activo);
    }
  }, [cliente]);

  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Editar credenciales de cliente</h3>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700 inline-flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <form
          className="p-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({
              id: cliente.id,
              email,
              password: password || undefined,
              nombre,
              apellido,
              telefono: telefono || undefined,
              activo
            });
          }}
        >
          <input className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" type="email" required />
          <input className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña (opcional)" type="password" />
          <div className="grid grid-cols-2 gap-2">
            <input className="input-field" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
            <input className="input-field" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" />
          </div>
          <input className="input-field" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" />

          <label htmlFor="cliente-activo" className="flex items-center gap-2 text-sm text-slate-700">
            <input
              id="cliente-activo"
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
            />
            Cliente activo
          </label>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={mutation.isPending}>
              <Save className="w-4 h-4" />
              {mutation.isPending ? "Guardando..." : "Guardar cambios"}
            </button>
            <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={onClose}>
              <Ban className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
