import PDFDocument from "pdfkit";
import puppeteer from "puppeteer";
import { reportesRepository } from "./reportes.repository";

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

const buildStyledPdfKitReport = (title: string, resumen: Resumen, narrative: string): Promise<Buffer> => {
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
      .text("Tienda Virtual | Reporte confidencial de uso interno", 42, 770, { width: 510, align: "center" });

    doc.end();
  });
};

export const reportesService = {
  kpis: reportesRepository.ventasResumen,

  generarOperacional: async (): Promise<Buffer> => {
    const resumen = await reportesRepository.ventasResumen();
    return buildStyledPdfKitReport(
      "Reporte Operacional",
      resumen,
      "El reporte operacional muestra estabilidad en el flujo de ordenes y una base de ingresos consistente. Se recomienda revisar diariamente la evolucion del ticket promedio y reforzar campanas en categorias de mayor margen para sostener el crecimiento de ventas durante el siguiente ciclo comercial."
    );
  },

  generarGestion: async (): Promise<Buffer> => {
    const resumen = await reportesRepository.ventasResumen();
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });
      const page = await browser.newPage();

      await page.setContent(`
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                font-family: 'Segoe UI', Arial, sans-serif;
                color: #0f172a;
                background: #f8fafc;
              }
              .header {
                background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
                color: #fff;
                padding: 32px 40px;
              }
              .title {
                font-size: 30px;
                font-weight: 700;
                margin: 0 0 6px;
              }
              .subtitle {
                margin: 0;
                color: #bfdbfe;
                font-size: 12px;
              }
              .container {
                padding: 26px 34px 30px;
              }
              .grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 14px;
                margin-bottom: 18px;
              }
              .card {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 14px;
              }
              .label {
                color: #64748b;
                font-size: 11px;
                margin-bottom: 8px;
              }
              .value {
                color: #0f172a;
                font-size: 23px;
                font-weight: 700;
                line-height: 1.2;
              }
              .section {
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 14px;
              }
              .section h3 {
                margin: 0 0 10px;
                font-size: 14px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th {
                background: #f1f5f9;
                color: #334155;
                text-align: left;
                font-size: 11px;
                padding: 9px 10px;
              }
              td {
                border-top: 1px solid #e2e8f0;
                font-size: 12px;
                padding: 10px;
              }
              .right { text-align: right; }
              .foot {
                font-size: 10px;
                text-align: center;
                color: #64748b;
                margin-top: 12px;
              }
            </style>
          </head>
          <body>
            <section class="header">
              <h1 class="title">Reporte de Gestion</h1>
              <p class="subtitle">Generado el ${formatDate()}</p>
            </section>

            <main class="container">
              <section class="grid">
                <article class="card">
                  <div class="label">Total de Ordenes</div>
                  <div class="value">${resumen.totalOrdenes}</div>
                </article>
                <article class="card">
                  <div class="label">Ventas Totales</div>
                  <div class="value">${formatMoney(resumen.ventasTotales)}</div>
                </article>
                <article class="card">
                  <div class="label">Ticket Promedio</div>
                  <div class="value">${formatMoney(resumen.ticketPromedio)}</div>
                </article>
              </section>

              <section class="section">
                <h3>Resumen de Indicadores</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th class="right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Ordenes procesadas en el periodo</td>
                      <td class="right">${resumen.totalOrdenes}</td>
                    </tr>
                    <tr>
                      <td>Ingresos consolidados</td>
                      <td class="right">${formatMoney(resumen.ventasTotales)}</td>
                    </tr>
                    <tr>
                      <td>Ingreso promedio por orden</td>
                      <td class="right">${formatMoney(resumen.ticketPromedio)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>

              <section class="section">
                <h3>Conclusiones de Gestion</h3>
                <p style="margin: 0; line-height: 1.55; color: #334155; font-size: 12px;">
                  Se observa un comportamiento comercial positivo con una relacion estable entre volumen de ordenes
                  y ticket promedio. Para el siguiente periodo, se recomienda reforzar estrategias de cross-selling
                  en categorias de mayor rotacion y monitorear semanalmente los cambios en el valor medio de compra.
                </p>
              </section>

              <div class="foot">Tienda Virtual | Reporte estrategico para direccion</div>
            </main>
          </body>
        </html>
      `);

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
      });
      await browser.close();
      return Buffer.from(pdf);
    } catch {
      return buildStyledPdfKitReport(
        "Reporte de Gestion",
        resumen,
        "Desde una perspectiva de direccion, los indicadores reflejan eficiencia comercial y buena respuesta del mercado. Se sugiere priorizar acciones sobre segmentacion de clientes y optimizacion de mix de productos para elevar rentabilidad sin comprometer volumen."
      );
    }
  }
};
