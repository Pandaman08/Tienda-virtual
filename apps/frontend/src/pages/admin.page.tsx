import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "../services/api-client";

type Kpi = {
  totalOrdenes: number;
  ventasTotales: number;
  ticketPromedio: number;
};

export const AdminPage = () => {
  const { data } = useQuery({
    queryKey: ["kpis"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Kpi }>("/reportes/kpis");
      return response.data.data;
    }
  });

  const chartData = [
    { name: "Ventas", value: Number(data?.ventasTotales || 0) },
    { name: "Ticket", value: Number(data?.ticketPromedio || 0) },
    { name: "Ordenes", value: Number(data?.totalOrdenes || 0) }
  ];

  return (
    <div className="container">
      <h1>Dashboard Admin</h1>
      <div className="grid">
        <div className="card">
          <h3>Ventas Totales</h3>
          <strong>S/ {Number(data?.ventasTotales || 0).toFixed(2)}</strong>
        </div>
        <div className="card">
          <h3>Ticket Promedio</h3>
          <strong>S/ {Number(data?.ticketPromedio || 0).toFixed(2)}</strong>
        </div>
        <div className="card">
          <h3>Total Ordenes</h3>
          <strong>{Number(data?.totalOrdenes || 0)}</strong>
        </div>
      </div>
      <div className="card" style={{ marginTop: "1rem", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#0f766e" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
        <a className="btn btn-primary" href="http://localhost:4000/api/v1/reportes/operacional" target="_blank" rel="noreferrer">
          Reporte Operacional PDF
        </a>
        <a className="btn" href="http://localhost:4000/api/v1/reportes/gestion" target="_blank" rel="noreferrer">
          Reporte Gestion PDF
        </a>
      </div>
    </div>
  );
};
