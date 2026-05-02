import PDFDocument from "pdfkit";
import puppeteer from "puppeteer";
import { prisma } from "../../config/prisma";
import { reportesRepository, type Periodo } from "./reportes.repository";

const BRAND = {
  primary: "#0F172A",
  soft: "#E2E8F0",
  muted: "#64748B"
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2
  }).format(value);

const formatDate = () =>
  new Intl.DateTimeFormat("es-PE", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(new Date());

type Resumen = {
  totalOrdenes: number;
  ventasTotales: number;
  ticketPromedio: number;
};

const renderKpiCard = (doc: PDFKit.PDFDocument, x: number, y: number, title: string, value: string) => {
  doc
    .roundedRect(x, y, 165, 92, 10)
    .lineWidth(1)
    .fillColor("#FFFFFF")
    .strokeColor(BRAND.soft)
    .fillAndStroke("#FFFFFF", BRAND.soft);

  doc.fillColor(BRAND.muted).fontSize(10).text(title, x + 12, y + 14, { width: 140 });
  doc.fillColor(BRAND.primary).font("Helvetica-Bold").fontSize(18).text(value, x + 12, y + 38, { width: 140 });
  doc.font("Helvetica");
};

const buildStyledPdfKitReport = (title: string, resumen: Resumen, narrative: string, empresa = "Tienda Virtual"): Promise<Buffer> => {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const chunks: Buffer[] = [];

  return new Promise((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.rect(0, 0, doc.page.width, 94).fill(BRAND.primary);
    doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(24).text(title, 42, 30);
    doc.font("Helvetica").fontSize(10).fillColor("#BAE6FD").text(`Emitido: ${formatDate()}`, 42, 64);

    const kpiTop = 120;
    renderKpiCard(doc, 42, kpiTop, "Total de Ordenes", `${resumen.totalOrdenes}`);
    renderKpiCard(doc, 217, kpiTop, "Ventas Totales", formatMoney(resumen.ventasTotales));
    renderKpiCard(doc, 392, kpiTop, "Ticket Promedio", formatMoney(resumen.ticketPromedio));

    const tableTop = 245;
    doc.roundedRect(42, tableTop, 510, 145, 8).lineWidth(1).strokeColor(BRAND.soft).stroke();

    doc.rect(42, tableTop, 510, 34).fill("#F8FAFC");
    doc.fillColor(BRAND.primary).font("Helvetica-Bold").fontSize(11);
    doc.text("Indicador", 58, tableTop + 11);
    doc.text("Valor", 360, tableTop + 11);

    const rows = [
      ["Total de ordenes registradas", `${resumen.totalOrdenes}`],
      ["Ventas acumuladas del periodo", formatMoney(resumen.ventasTotales)],
      ["Valor promedio por orden", formatMoney(resumen.ticketPromedio)]
    ];

    doc.font("Helvetica").fontSize(11).fillColor("#1E293B");
    rows.forEach((row, index) => {
      const y = tableTop + 44 + index * 30;
      if (index % 2 === 0) {
        doc.rect(43, y - 7, 508, 28).fill("#FFFFFF");
      }
      doc.fillColor("#1E293B").text(row[0], 58, y);
      doc.font("Helvetica-Bold").text(row[1], 360, y);
      doc.font("Helvetica");
    });

    doc.fillColor(BRAND.primary).font("Helvetica-Bold").fontSize(12).text("Analisis ejecutivo", 42, 420);
    doc
      .fillColor("#334155")
      .font("Helvetica")
      .fontSize(11)
      .text(narrative, 42, 442, { width: 510, lineGap: 4, align: "justify" });

    doc.moveTo(42, 760).lineTo(552, 760).lineWidth(1).strokeColor(BRAND.soft).stroke();
    doc
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(`${empresa} | Reporte confidencial de uso interno`, 42, 770, { width: 510, align: "center" });

    doc.end();
  });
};

export const reportesService = {
  kpis: reportesRepository.ventasResumen,

  graficos: async (periodo: Periodo = "todo") => ({
    topProductos: await reportesRepository.topProductos(periodo),
    ventasPorCategoria: await reportesRepository.ventasPorCategoria(periodo)
  }),

  generarOperacional: async (empresa = "Tienda Virtual"): Promise<Buffer> => {
    const [resumen, topProductos, stockItems] = await Promise.all([
      reportesRepository.ventasResumen(),
      reportesRepository.topProductos("todo", 8),
      prisma.inv_inventario.findMany({
        where: { activo: true },
        include: { producto: { select: { nombre: true, categoria: true, stock_minimo: true } } },
        orderBy: { stock_disponible: "asc" }
      })
    ]);

    const agotados  = stockItems.filter((i) => i.stock_disponible === 0).length;
    const criticos  = stockItems.filter((i) => i.stock_disponible > 0 && i.stock_disponible <= i.producto.stock_minimo).length;
    const normales  = stockItems.filter((i) => i.stock_disponible > i.producto.stock_minimo).length;

    const stockRows = stockItems.map((item) => {
      const disp = item.stock_disponible;
      const min  = item.producto.stock_minimo;
      const agotado = disp === 0;
      const critico = !agotado && disp <= min;

      let badge: string;
      if (agotado) {
        badge = `<span style="background:#fee2e2;color:#dc2626;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">AGOTADO</span>`;
      } else if (critico) {
        badge = `<span style="background:#fff7ed;color:#ea580c;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">CRITICO</span>`;
      } else {
        badge = `<span style="background:#f0fdf4;color:#16a34a;padding:2px 9px;border-radius:20px;font-size:10px;font-weight:700;white-space:nowrap">NORMAL</span>`;
      }

      let rowBg: string;
      if (agotado) { rowBg = "background:#fff5f5"; }
      else if (critico) { rowBg = "background:#fffbf5"; }
      else { rowBg = ""; }

      let dispColor: string;
      if (agotado) { dispColor = "#dc2626"; }
      else if (critico) { dispColor = "#ea580c"; }
      else { dispColor = "#0f172a"; }

      return `<tr style="${rowBg}">
        <td style="padding:7px 10px;font-size:12px">${item.producto.nombre}</td>
        <td style="padding:7px 10px;font-size:11px;color:#64748b">${item.producto.categoria}</td>
        <td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:700;color:${dispColor}">${disp}</td>
        <td style="padding:7px 10px;font-size:12px;text-align:right;color:#94a3b8">${min}</td>
        <td style="padding:7px 10px;text-align:center">${badge}</td>
      </tr>`;
    }).join("");

    const topRows = topProductos.map((p) =>
      `<tr>
        <td style="padding:7px 10px;font-size:12px">${p.nombre}</td>
        <td style="padding:7px 10px;font-size:11px;color:#64748b">${p.categoria}</td>
        <td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:700">${p.unidades}</td>
        <td style="padding:7px 10px;font-size:12px;text-align:right">${formatMoney(p.ingresos)}</td>
      </tr>`
    ).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#f8fafc}
.header{background:linear-gradient(135deg,#0369a1 0%,#0ea5e9 100%);color:#fff;padding:28px 36px}
.header h1{font-size:26px;font-weight:700;margin-bottom:4px}
.header p{color:#bae6fd;font-size:12px}
.header .badge{display:inline-block;background:rgba(255,255,255,.18);color:#e0f2fe;font-size:11px;font-weight:600;border-radius:6px;padding:2px 10px;margin-bottom:8px}
.body{padding:20px 32px 28px}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px}
.kpi{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px}
.kpi-label{color:#64748b;font-size:11px;margin-bottom:6px}
.kpi-value{font-size:21px;font-weight:700}
.alert-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}
.alert{border-radius:10px;padding:14px;text-align:center}
.a-red{background:#fee2e2;border:1px solid #fca5a5}.a-red .n{color:#dc2626}.a-red .l{color:#b91c1c}
.a-ora{background:#fff7ed;border:1px solid #fdba74}.a-ora .n{color:#ea580c}.a-ora .l{color:#c2410c}
.a-grn{background:#f0fdf4;border:1px solid #86efac}.a-grn .n{color:#16a34a}.a-grn .l{color:#15803d}
.n{font-size:28px;font-weight:800}.l{font-size:11px;margin-top:3px;font-weight:600}
.section{background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:14px;overflow:hidden}
.sh{background:#f8fafc;padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700}
table{width:100%;border-collapse:collapse}
thead th{background:#f1f5f9;color:#475569;text-align:left;font-size:10px;padding:8px 10px;text-transform:uppercase;letter-spacing:.04em}
tbody tr:nth-child(even):not([style]){background:#f8fafc}
td{border-top:1px solid #f1f5f9}
.foot{font-size:10px;text-align:center;color:#94a3b8;margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0}
</style>
</head><body>
<div class="header">
  <div class="badge">INFORME OPERACIONAL</div>
  <h1>Informe Operacional</h1>
  <p>Generado el ${formatDate()} &nbsp;&middot;&nbsp; Detalle operativo de ventas, stock critico y metricas del negocio</p>
</div>
<div class="body">
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Total Ordenes</div><div class="kpi-value">${resumen.totalOrdenes}</div></div>
    <div class="kpi"><div class="kpi-label">Ventas Totales</div><div class="kpi-value">${formatMoney(resumen.ventasTotales)}</div></div>
    <div class="kpi"><div class="kpi-label">Ticket Promedio</div><div class="kpi-value">${formatMoney(resumen.ticketPromedio)}</div></div>
  </div>
  <div class="alert-grid">
    <div class="alert a-red"><div class="n">${agotados}</div><div class="l">Productos Agotados</div></div>
    <div class="alert a-ora"><div class="n">${criticos}</div><div class="l">Stock Critico</div></div>
    <div class="alert a-grn"><div class="n">${normales}</div><div class="l">Stock Normal</div></div>
  </div>
  <div class="section">
    <div class="sh">Estado del Inventario</div>
    <table><thead><tr><th>Producto</th><th>Categoria</th><th style="text-align:right">Disponible</th><th style="text-align:right">Minimo</th><th style="text-align:center">Estado</th></tr></thead>
    <tbody>${stockRows}</tbody></table>
  </div>
  <div class="section">
    <div class="sh">Top Productos por Ventas</div>
    <table><thead><tr><th>Producto</th><th>Categoria</th><th style="text-align:right">Unidades</th><th style="text-align:right">Ingresos</th></tr></thead>
    <tbody>${topRows}</tbody></table>
  </div>
  <div class="foot">${empresa} &nbsp;|&nbsp; Informe Operacional &mdash; uso interno</div>
</div>
</body></html>`;

    try {
      const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      await browser.close();
      return Buffer.from(pdf);
    } catch {
      return buildStyledPdfKitReport(
        "Informe Operacional",
        resumen,
        `El informe operacional registra ${agotados} productos agotados y ${criticos} en stock critico. Se recomienda revisar el inventario de forma inmediata y gestionar ordenes de reposicion para los articulos con mayor rotacion.`,
        empresa
      );
    }
  },

  generarGestion: async (empresa = "Tienda Virtual"): Promise<Buffer> => {
    const [resumen, topProductos, ventasPorCategoria] = await Promise.all([
      reportesRepository.ventasResumen(),
      reportesRepository.topProductos("todo", 6),
      reportesRepository.ventasPorCategoria("todo")
    ]);

    // SVG chart — top productos (barras horizontales)
    const barColors = ["#4F46E5","#7C3AED","#2563EB","#0891B2","#059669","#D97706"];
    const maxUnits = Math.max(...topProductos.map((p) => p.unidades), 1);
    const prodSvgH = topProductos.length * 38 + 8;
    const prodBars = topProductos.map((p, i) => {
      const bw = Math.max(Math.round((p.unidades / maxUnits) * 260), 4);
      const y = i * 38;
      const label = p.nombre.length > 22 ? p.nombre.substring(0, 22) + "…" : p.nombre;
      return `<g transform="translate(0,${y})">
        <text x="0" y="14" font-size="11" fill="#334155" font-family="Arial,sans-serif">${label}</text>
        <rect x="0" y="20" width="${bw}" height="13" fill="${barColors[i % barColors.length]}" rx="3"/>
        <text x="${bw + 6}" y="31" font-size="10" fill="#64748b" font-family="Arial,sans-serif">${p.unidades} u</text>
      </g>`;
    }).join("");

    // SVG chart — ingresos por categoria
    const catColors = ["#0891B2","#059669","#D97706","#7C3AED","#DC2626","#2563EB","#9333EA"];
    const maxRev = Math.max(...ventasPorCategoria.map((c) => c.ingresos), 1);
    const cats = ventasPorCategoria.slice(0, 7);
    const catSvgH = cats.length * 38 + 8;
    const catBars = cats.map((c, i) => {
      const bw = Math.max(Math.round((c.ingresos / maxRev) * 260), 4);
      const y = i * 38;
      const label = c.categoria.length > 22 ? c.categoria.substring(0, 22) + "…" : c.categoria;
      return `<g transform="translate(0,${y})">
        <text x="0" y="14" font-size="11" fill="#334155" font-family="Arial,sans-serif">${label}</text>
        <rect x="0" y="20" width="${bw}" height="13" fill="${catColors[i % catColors.length]}" rx="3"/>
        <text x="${bw + 6}" y="31" font-size="10" fill="#64748b" font-family="Arial,sans-serif">${formatMoney(c.ingresos)}</text>
      </g>`;
    }).join("");

    try {
      const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(`
        <html>
          <head><meta charset="utf-8"/>
          <style>
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#f8fafc}
            .header{background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%);color:#fff;padding:30px 36px}
            .header h1{font-size:28px;font-weight:700;margin-bottom:4px}
            .header p{color:#bfdbfe;font-size:12px}
            .body{padding:22px 32px 28px}
            .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}
            .kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px}
            .kpi-label{color:#64748b;font-size:11px;margin-bottom:8px}
            .kpi-value{color:#0f172a;font-size:22px;font-weight:700;line-height:1.2}
            .chart-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
            .section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:14px}
            .section h3{font-size:13px;font-weight:700;margin-bottom:14px;color:#0f172a}
            table{width:100%;border-collapse:collapse}
            th{background:#f1f5f9;color:#475569;text-align:left;font-size:10px;padding:8px 10px;text-transform:uppercase;letter-spacing:.04em}
            td{border-top:1px solid #e2e8f0;font-size:12px;padding:9px 10px}
            .right{text-align:right}
            .foot{font-size:10px;text-align:center;color:#94a3b8;margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0}
          </style>
          </head>
          <body>
            <div class="header">
              <h1>Informe Ejecutivo</h1>
              <p>Generado el ${formatDate()} &nbsp;&middot;&nbsp; KPIs, graficos de ventas y analisis estrategico</p>
            </div>
            <div class="body">
              <div class="kpi-grid">
                <div class="kpi"><div class="kpi-label">Total Ordenes</div><div class="kpi-value">${resumen.totalOrdenes}</div></div>
                <div class="kpi"><div class="kpi-label">Ventas Totales</div><div class="kpi-value">${formatMoney(resumen.ventasTotales)}</div></div>
                <div class="kpi"><div class="kpi-label">Ticket Promedio</div><div class="kpi-value">${formatMoney(resumen.ticketPromedio)}</div></div>
              </div>

              <div class="chart-row">
                <div class="section">
                  <h3>Top Productos — Unidades</h3>
                  <svg width="100%" height="${prodSvgH}" viewBox="0 0 340 ${prodSvgH}" preserveAspectRatio="xMinYMin meet">${prodBars}</svg>
                </div>
                <div class="section">
                  <h3>Ingresos por Categoria</h3>
                  <svg width="100%" height="${catSvgH}" viewBox="0 0 340 ${catSvgH}" preserveAspectRatio="xMinYMin meet">${catBars}</svg>
                </div>
              </div>

              <div class="section">
                <h3>Resumen de Indicadores</h3>
                <table>
                  <thead><tr><th>Indicador</th><th class="right">Resultado</th></tr></thead>
                  <tbody>
                    <tr><td>Ordenes procesadas</td><td class="right">${resumen.totalOrdenes}</td></tr>
                    <tr><td>Ingresos consolidados</td><td class="right">${formatMoney(resumen.ventasTotales)}</td></tr>
                    <tr><td>Ingreso promedio por orden</td><td class="right">${formatMoney(resumen.ticketPromedio)}</td></tr>
                  </tbody>
                </table>
              </div>

              <div class="section">
                <h3>Conclusiones de Gestion</h3>
                <p style="line-height:1.6;color:#334155;font-size:12px">
                  Se observa un comportamiento comercial positivo con una relacion estable entre volumen de ordenes y ticket promedio.
                  Las categorias con mayor ingreso deben recibir atencion especial en estrategias de stock y marketing.
                  Para el siguiente periodo se recomienda reforzar cross-selling en las categorias lideres y revisar semanalmente el ticket promedio.
                </p>
              </div>
              <div class="foot">${empresa} &nbsp;|&nbsp; Informe Ejecutivo &mdash; uso estrategico para direccion</div>
            </div>
          </body>
        </html>
      `);
      const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      await browser.close();
      return Buffer.from(pdf);
    } catch {
      return buildStyledPdfKitReport(
        "Informe Ejecutivo",
        resumen,
        "Desde una perspectiva de direccion, los indicadores reflejan eficiencia comercial y buena respuesta del mercado. Se sugiere priorizar acciones sobre segmentacion de clientes y optimizacion del mix de productos.",
        empresa
      );
    }
  }
};

