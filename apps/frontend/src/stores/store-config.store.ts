import { useEffect, useState } from "react";
import { apiClient } from "../services/api-client";

const DEFAULTS = {
  nombre: "MI EMPRESA",
  logo: ""
};

function readConfig() {
  return {
    nombre: localStorage.getItem("emp_nombre") || DEFAULTS.nombre,
    logo: localStorage.getItem("emp_logo") || DEFAULTS.logo
  };
}

/** Guarda en localStorage todos los campos de configuración recibidos de la API */
export function applyRemoteConfig(data: Record<string, string | null | undefined>) {
  const map: Record<string, string> = {
    nombre:         "emp_nombre",
    logo:           "emp_logo",
    ruc:            "emp_ruc",
    direccion:      "emp_direccion",
    telefono:       "emp_telefono",
    email:          "emp_email",
    igv:            "emp_igv",
    moneda_simbolo: "emp_moneda_simbolo",
    moneda_nombre:  "emp_moneda_nombre",
    serie_boleta:   "emp_serie_boleta",
    serie_factura:  "emp_serie_factura",
  };
  for (const [apiKey, lsKey] of Object.entries(map)) {
    const val = data[apiKey];
    if (val != null) {
      localStorage.setItem(lsKey, String(val));
    }
  }
}

export function useStoreConfig() {
  const [config, setConfig] = useState(readConfig);

  useEffect(() => {
    // Carga configuración desde la API al montar (sincroniza entre navegadores)
    apiClient.get("/configuracion")
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          applyRemoteConfig(data);
          setConfig(readConfig());
        }
      })
      .catch(() => {
        // Fallback silencioso: se usa el valor ya en localStorage
      });

    // Detecta cambios desde otra pestaña (evento nativo de localStorage)
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("emp_")) {
        setConfig(readConfig());
      }
    };
    globalThis.addEventListener("storage", onStorage);

    // También escucha cambios dentro de la misma pestaña vía CustomEvent
    const onLocal = () => setConfig(readConfig());
    globalThis.addEventListener("store-config-updated", onLocal);

    return () => {
      globalThis.removeEventListener("storage", onStorage);
      globalThis.removeEventListener("store-config-updated", onLocal);
    };
  }, []);

  return config;
}

