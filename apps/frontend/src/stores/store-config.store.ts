import { useEffect, useState } from "react";

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

export function useStoreConfig() {
  const [config, setConfig] = useState(readConfig);

  useEffect(() => {
    // Detecta cambios desde otra pestaña (evento nativo)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "emp_nombre" || e.key === "emp_logo") {
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
