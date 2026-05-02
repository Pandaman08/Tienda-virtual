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

// ─── PDFKit visual: Informe Ejecutivo ──────────────────────────────────────
const buildGestionPdfKit = (
  resumen: Resumen,
  topProductos: Array<{ nombre: string; categoria: string; unidades: number; ingresos: number }>,
  ventasPorCategoria: Array<{ categoria: string; ingresos: number }>,
  empresa: string
): Promise<Buffer> => {
  const doc    = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  const PW = 595.28, BX = 32, BW = PW - 64;

  return new Promise((resolve) => {
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));

    // ── Header ────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 86).fill("#0f172a");
    doc.rect(0, 0, PW, 3).fill("#3b82f6");
    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(22).text("Informe Ejecutivo", BX, 18);
    doc.fillColor("#93c5fd").font("Helvetica").fontSize(10)
       .text("KPIs · Graficos de ventas · Analisis estrategico del periodo", BX, 48);
    doc.fillColor("#64748b").fontSize(8).text(`Emitido: ${formatDate()} · ${empresa}`, BX, 64);

    // ── KPI cards ──────────────────────────────────────────────────
    const KY = 100, KW = 157, KH = 66;
    ([
      { label: "TOTAL ORDENES",   value: `${resumen.totalOrdenes}`,             color: "#2563eb" },
      { label: "VENTAS TOTALES",  value: formatMoney(resumen.ventasTotales),    color: "#059669" },
      { label: "TICKET PROMEDIO", value: formatMoney(resumen.ticketPromedio),   color: "#7c3aed" }
    ] as const).forEach((k, i) => {
      const x = BX + i * (KW + 11);
      doc.roundedRect(x, KY, KW, KH, 8).fill("#fff");
      doc.rect(x, KY + 8, 4, KH - 16).fill(k.color);
      doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(k.label, x + 12, KY + 13, { width: KW - 18 });
      doc.fillColor(k.color).font("Helvetica-Bold").fontSize(16).text(k.value, x + 12, KY + 31, { width: KW - 18 });
    });

    let Y = KY + KH + 16;
    const chartMaxW = 215;

    // ── Barchart: Top Productos ────────────────────────────────────
    const prodColors = ["#6366f1","#8b5cf6","#3b82f6","#0891b2","#10b981","#f59e0b","#ef4444"];
    const maxU       = Math.max(...topProductos.map(p => p.unidades), 1);
    const prodList   = topProductos.slice(0, 6);
    const cardH1     = 18 + prodList.length * 20 + 10;
    doc.rect(BX, Y, BW, cardH1).fill("#fff");
    doc.rect(BX, Y, 3, cardH1).fill("#6366f1");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Top Productos — Unidades Vendidas", BX + 10, Y + 6);
    Y += 20;
    prodList.forEach((p, i) => {
      const bw  = Math.max(Math.round((p.unidades / maxU) * chartMaxW), 4);
      const lbl = p.nombre.length > 23 ? p.nombre.substring(0, 23) + "…" : p.nombre;
      doc.fillColor("#334155").font("Helvetica").fontSize(9).text(lbl, BX + 10, Y + 2, { width: 145 });
      doc.roundedRect(BX + 160, Y, bw, 13, 2).fill(prodColors[i % prodColors.length]);
      doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(`${p.unidades}`, BX + 164 + bw, Y + 2);
      Y += 20;
    });
    Y += 14;

    // ── Barchart: Ingresos por Categoría ──────────────────────────
    const catColors2 = ["#0891b2","#10b981","#f59e0b","#8b5cf6","#ef4444","#3b82f6","#ec4899"];
    const cats6      = ventasPorCategoria.slice(0, 6);
    const maxR       = Math.max(...cats6.map(c => c.ingresos), 1);
    const cardH2     = 18 + cats6.length * 20 + 10;
    doc.rect(BX, Y, BW, cardH2).fill("#fff");
    doc.rect(BX, Y, 3, cardH2).fill("#0891b2");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Ingresos por Categoria", BX + 10, Y + 6);
    Y += 20;
    cats6.forEach((c, i) => {
      const bw  = Math.max(Math.round((c.ingresos / maxR) * chartMaxW), 4);
      const lbl = c.categoria.length > 23 ? c.categoria.substring(0, 23) + "…" : c.categoria;
      doc.fillColor("#334155").font("Helvetica").fontSize(9).text(lbl, BX + 10, Y + 2, { width: 145 });
      doc.roundedRect(BX + 160, Y, bw, 13, 2).fill(catColors2[i % catColors2.length]);
      doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(formatMoney(c.ingresos), BX + 164 + bw, Y + 2);
      Y += 20;
    });
    Y += 14;

    // ── Ranking table ──────────────────────────────────────────────
    doc.rect(BX, Y, BW, 18).fill("#f1f5f9");
    doc.rect(BX, Y, 3, 18).fill("#f59e0b");
    doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8);
    (["#", "Producto", "Categoria", "Unid.", "Ingresos"] as const).forEach((h, ci) => {
      const cols = [BX + 6, BX + 22, BX + 196, BX + 310, BX + 370];
      doc.text(h, cols[ci], Y + 5);
    });
    Y += 18;
    const rankColors2 = ["#f59e0b","#94a3b8","#b45309","#cbd5e1","#cbd5e1","#cbd5e1","#cbd5e1"];
    topProductos.slice(0, 7).forEach((p, i) => {
      if (Y > 798) return;
      doc.rect(BX, Y, BW, 18).fill(i % 2 === 0 ? "#fff" : "#f8fafc");
      doc.roundedRect(BX + 4, Y + 3, 13, 13, 2).fill(rankColors2[i] || "#cbd5e1");
      doc.fillColor("#fff").font("Helvetica-Bold").fontSize(7).text(`${i + 1}`, BX + 4, Y + 5, { width: 13, align: "center" });
      const nm  = p.nombre.length > 25   ? p.nombre.substring(0, 25) + "…"   : p.nombre;
      const cat = p.categoria.length > 15 ? p.categoria.substring(0, 15) + "…" : p.categoria;
      doc.fillColor("#334155").font("Helvetica").fontSize(9).text(nm,  BX + 22,  Y + 4, { width: 168 });
      doc.fillColor("#64748b").text(cat,                                BX + 196, Y + 4, { width: 108 });
      doc.fillColor("#0f172a").text(`${p.unidades}`,                    BX + 310, Y + 4, { width: 54  });
      doc.fillColor("#059669").font("Helvetica-Bold").text(formatMoney(p.ingresos), BX + 365, Y + 4, { width: 116, align: "right" });
      Y += 18;
    });

    // ── Footer ────────────────────────────────────────────────────
    const FY = Math.min(Y + 8, 825);
    doc.moveTo(BX, FY).lineTo(PW - BX, FY).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(8)
       .text(`${empresa}  ·  Informe Ejecutivo — estrategico para direccion  ·  ${formatDate()}`,
             BX, FY + 6, { width: BW, align: "center" });
    doc.end();
  });
};

// ─── PDFKit visual: Informe Operacional ────────────────────────────────────
const buildOperacionalPdfKit = (
  resumen: Resumen,
  topProductos: Array<{ nombre: string; categoria: string; unidades: number; ingresos: number }>,
  stockItems: Array<{ stock_disponible: number; producto: { nombre: string; categoria: string; stock_minimo: number } }>,
  agotados: number,
  criticos: number,
  normales: number,
  empresa: string
): Promise<Buffer> => {
  const doc    = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  const PW = 595.28, BX = 32, BW = PW - 64;
  const total = stockItems.length || 1;

  return new Promise((resolve) => {
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));

    // ── Header ────────────────────────────────────────────────────
    doc.rect(0, 0, PW, 86).fill("#0c4a6e");
    doc.rect(0, 0, PW, 3).fill("#0ea5e9");
    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(22).text("Informe Operacional", BX, 18);
    doc.fillColor("#bae6fd").font("Helvetica").fontSize(10)
       .text("Detalle operativo de ventas, stock critico y metricas del negocio", BX, 48);
    doc.fillColor("#64748b").fontSize(8).text(`Emitido: ${formatDate()} · ${empresa}`, BX, 64);

    // ── KPI cards ──────────────────────────────────────────────────
    const KY = 100, KW = 157, KH = 66;
    ([
      { label: "TOTAL ORDENES",   value: `${resumen.totalOrdenes}`,             color: "#2563eb" },
      { label: "VENTAS TOTALES",  value: formatMoney(resumen.ventasTotales),    color: "#059669" },
      { label: "TICKET PROMEDIO", value: formatMoney(resumen.ticketPromedio),   color: "#7c3aed" }
    ] as const).forEach((k, i) => {
      const x = BX + i * (KW + 11);
      doc.roundedRect(x, KY, KW, KH, 8).fill("#fff");
      doc.rect(x, KY + 8, 4, KH - 16).fill(k.color);
      doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(k.label, x + 12, KY + 13, { width: KW - 18 });
      doc.fillColor(k.color).font("Helvetica-Bold").fontSize(16).text(k.value, x + 12, KY + 31, { width: KW - 18 });
    });

    let Y = KY + KH + 14;

    // ── Semáforo de inventario ──────────────────────────────────────
    const semH = 72;
    doc.rect(BX, Y, BW, semH).fill("#fff");
    doc.rect(BX, Y, 3, semH).fill("#0369a1");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Estado del Inventario", BX + 10, Y + 9);
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(`${total} productos activos`, BX + 10, Y + 22);
    const semCols = [
      { label: "Agotados", count: agotados, color: "#dc2626" },
      { label: "Criticos", count: criticos, color: "#f97316" },
      { label: "Normales", count: normales, color: "#22c55e" }
    ];
    const semSlot = (BW - 20) / 3;
    semCols.forEach((s, i) => {
      const sx  = BX + 10 + i * semSlot;
      const sy  = Y + 36;
      const pct = Math.round((s.count / total) * 100);
      const bW  = Math.round(semSlot * 0.72);
      doc.roundedRect(sx, sy - 2, 22, 22, 3).fill(s.color);
      doc.fillColor("#fff").font("Helvetica-Bold").fontSize(10)
         .text(`${s.count}`, sx, sy + 3, { width: 22, align: "center" });
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(9).text(s.label, sx + 27, sy + 3);
      doc.roundedRect(sx + 27, sy + 15, bW, 5, 2).fill("#e2e8f0");
      if (pct > 0) doc.roundedRect(sx + 27, sy + 15, Math.max(Math.round(bW * pct / 100), 2), 5, 2).fill(s.color);
      doc.fillColor("#64748b").font("Helvetica").fontSize(7)
         .text(`${pct}%`, sx + 27 + bW + 3, sy + 14);
    });
    Y += semH + 12;

    // ── Tabla de inventario ────────────────────────────────────────
    doc.rect(BX, Y, BW, 18).fill("#f1f5f9");
    doc.rect(BX, Y, 3, 18).fill("#0369a1");
    doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8);
    doc.text("Producto",  BX + 8,   Y + 5);
    doc.text("Categoria", BX + 178, Y + 5);
    doc.text("Stock",     BX + 308, Y + 5);
    doc.text("Estado",    BX + 442, Y + 5);
    Y += 18;
    stockItems.slice(0, 18).forEach((item, i) => {
      if (Y > 776) return;
      const disp    = item.stock_disponible;
      const min     = item.producto.stock_minimo;
      const agotado = disp === 0;
      const critico = !agotado && disp <= min;
      const rowBg   = agotado ? "#fff5f5" : critico ? "#fff9f0" : i % 2 === 0 ? "#fff" : "#f8fafc";
      doc.rect(BX, Y, BW, 18).fill(rowBg);
      if (agotado || critico) doc.rect(BX, Y, 3, 18).fill(agotado ? "#dc2626" : "#f97316");
      const dispColor = agotado ? "#dc2626" : critico ? "#f97316" : "#22c55e";
      const pNombre   = item.producto.nombre.length > 21 ? item.producto.nombre.substring(0, 21) + "…" : item.producto.nombre;
      doc.fillColor("#0f172a").font("Helvetica").fontSize(9).text(pNombre, BX + 8, Y + 4, { width: 163 });
      doc.fillColor("#64748b").text(item.producto.categoria, BX + 178, Y + 4, { width: 122 });
      // Mini progress bar
      const maxBar = Math.max(disp, min, 1);
      doc.roundedRect(BX + 308, Y + 4, 60, 7, 2).fill("#e2e8f0");
      if (disp > 0) doc.roundedRect(BX + 308, Y + 4, Math.max(Math.round(60 * (disp / maxBar)), 2), 7, 2).fill(dispColor);
      doc.fillColor(dispColor).font("Helvetica-Bold").fontSize(8).text(`${disp}/${min}`, BX + 374, Y + 4, { width: 60 });
      const badgeText = agotado ? "AGOTADO" : critico ? "CRITICO" : "NORMAL";
      doc.fillColor(dispColor).font("Helvetica-Bold").fontSize(8).text(badgeText, BX + 442, Y + 5, { width: 80 });
      Y += 18;
    });

    // ── Top productos (barras) ─────────────────────────────────────
    Y += 10;
    if (Y < 760) {
      const topList  = topProductos.slice(0, 5);
      const maxI     = Math.max(...topList.map(p => p.ingresos), 1);
      const tpColors = ["#6366f1","#8b5cf6","#3b82f6","#0891b2","#10b981"];
      const tpH      = 18 + topList.length * 18 + 8;
      doc.rect(BX, Y, BW, tpH).fill("#fff");
      doc.rect(BX, Y, 3, tpH).fill("#6366f1");
      doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(10).text("Top Productos — Ingresos", BX + 10, Y + 6);
      Y += 20;
      topList.forEach((p, i) => {
        const bw  = Math.max(Math.round((p.ingresos / maxI) * 210), 4);
        const lbl = p.nombre.length > 22 ? p.nombre.substring(0, 22) + "…" : p.nombre;
        doc.fillColor("#334155").font("Helvetica").fontSize(9).text(lbl, BX + 10, Y + 2, { width: 143 });
        doc.roundedRect(BX + 158, Y, bw, 11, 2).fill(tpColors[i % tpColors.length]);
        doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(formatMoney(p.ingresos), BX + 162 + bw, Y + 2);
        Y += 18;
      });
    }

    // ── Footer ────────────────────────────────────────────────────
    const FY = Math.min(Y + 8, 825);
    doc.moveTo(BX, FY).lineTo(PW - BX, FY).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(8)
       .text(`${empresa}  ·  Informe Operacional — uso interno  ·  ${formatDate()}`,
             BX, FY + 6, { width: BW, align: "center" });
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
      reportesRepository.topProductos("todo", 10),
      prisma.inv_inventario.findMany({
        where: { activo: true },
        include: { producto: { select: { nombre: true, categoria: true, stock_minimo: true } } },
        orderBy: { stock_disponible: "asc" }
      })
    ]);

    const totalItems = stockItems.length || 1;
    const agotados  = stockItems.filter((i) => i.stock_disponible === 0).length;
    const criticos  = stockItems.filter((i) => i.stock_disponible > 0 && i.stock_disponible <= i.producto.stock_minimo).length;
    const normales  = stockItems.filter((i) => i.stock_disponible > i.producto.stock_minimo).length;
    const pctAgotado = Math.round((agotados / totalItems) * 100);
    const pctCritico = Math.round((criticos / totalItems) * 100);
    const pctNormal  = Math.round((normales / totalItems) * 100);

    // Donut SVG de estado de inventario
    const donutTotal = agotados + criticos + normales || 1;
    const angAgotado = (agotados / donutTotal) * 360;
    const angCritico = (criticos / donutTotal) * 360;
    const polarToCart = (deg: number, r: number) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return { x: 60 + r * Math.cos(rad), y: 60 + r * Math.sin(rad) };
    };
    const donutArc = (startDeg: number, sweepDeg: number, color: string) => {
      if (sweepDeg <= 0) return "";
      if (sweepDeg >= 360) sweepDeg = 359.99;
      const p1 = polarToCart(startDeg, 44);
      const p2 = polarToCart(startDeg + sweepDeg, 44);
      const p3 = polarToCart(startDeg + sweepDeg, 28);
      const p4 = polarToCart(startDeg, 28);
      const lg = sweepDeg > 180 ? 1 : 0;
      return `<path d="M${p1.x},${p1.y} A44,44 0 ${lg},1 ${p2.x},${p2.y} L${p3.x},${p3.y} A28,28 0 ${lg},0 ${p4.x},${p4.y} Z" fill="${color}"/>`;
    };
    const donutSvg = `<svg width="120" height="120" viewBox="0 0 120 120">
      ${donutArc(0, angAgotado, "#dc2626")}
      ${donutArc(angAgotado, angCritico, "#f97316")}
      ${donutArc(angAgotado + angCritico, 360 - angAgotado - angCritico, "#22c55e")}
      <circle cx="60" cy="60" r="22" fill="#fff"/>
      <text x="60" y="55" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a" font-family="Arial">${totalItems}</text>
      <text x="60" y="68" text-anchor="middle" font-size="8" fill="#64748b" font-family="Arial">items</text>
    </svg>`;

    const stockRows = stockItems.map((item) => {
      const disp = item.stock_disponible;
      const min  = item.producto.stock_minimo;
      const agotado = disp === 0;
      const critico = !agotado && disp <= min;
      const maxBar  = Math.max(disp, min, 1);
      const barPct  = Math.min(Math.round((disp / maxBar) * 100), 100);
      const barColor = agotado ? "#dc2626" : critico ? "#f97316" : "#22c55e";

      const badge = agotado
        ? `<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.04em">&#9679; AGOTADO</span>`
        : critico
        ? `<span style="background:#fff7ed;color:#ea580c;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.04em">&#9650; CRITICO</span>`
        : `<span style="background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.04em">&#10003; NORMAL</span>`;

      const rowBg = agotado ? "#fff8f8" : critico ? "#fffaf5" : "";

      return `<tr style="background:${rowBg}">
        <td style="padding:6px 10px;font-size:11px;font-weight:600">${item.producto.nombre}</td>
        <td style="padding:6px 10px;font-size:10px;color:#64748b">${item.producto.categoria}</td>
        <td style="padding:6px 10px;width:90px">
          <div style="background:#e2e8f0;border-radius:4px;height:7px;overflow:hidden">
            <div style="background:${barColor};height:7px;width:${barPct}%;border-radius:4px"></div>
          </div>
          <div style="font-size:9px;color:#64748b;margin-top:2px">${disp} / min ${min}</div>
        </td>
        <td style="padding:6px 10px;text-align:center">${badge}</td>
      </tr>`;
    }).join("");

    // Barras horizontales SVG para top productos
    const maxIngresos = Math.max(...topProductos.map((p) => p.ingresos), 1);
    const topBarColors = ["#6366f1","#8b5cf6","#3b82f6","#0891b2","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#f97316"];
    const topProdSvgH = topProductos.length * 34 + 4;
    const topProdBars = topProductos.map((p, i) => {
      const bw = Math.max(Math.round((p.ingresos / maxIngresos) * 230), 4);
      const y  = i * 34;
      const label = p.nombre.length > 20 ? p.nombre.substring(0, 20) + "…" : p.nombre;
      const color = topBarColors[i % topBarColors.length];
      return `<g transform="translate(0,${y})">
        <text x="0" y="13" font-size="10" fill="#334155" font-family="Arial">${i + 1}. ${label}</text>
        <rect x="0" y="17" width="${bw}" height="11" fill="${color}" rx="3" opacity="0.85"/>
        <rect x="0" y="17" width="4" height="11" fill="${color}" rx="2"/>
        <text x="${bw + 5}" y="27" font-size="9" fill="#64748b" font-family="Arial">${formatMoney(p.ingresos)}</text>
      </g>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0284c7 100%);color:#fff;padding:26px 36px 22px;position:relative;overflow:hidden}
.header::after{content:'';position:absolute;right:-40px;top:-40px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.07)}
.header::before{content:'';position:absolute;right:80px;bottom:-30px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,.05)}
.header-top{display:flex;justify-content:space-between;align-items:flex-start}
.header-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.18);color:#e0f2fe;font-size:10px;font-weight:700;border-radius:20px;padding:3px 12px;margin-bottom:8px;letter-spacing:.06em}
.header h1{font-size:26px;font-weight:800;margin-bottom:4px;letter-spacing:-.3px}
.header p{color:#bae6fd;font-size:11px}
.header-meta{background:rgba(255,255,255,.12);border-radius:10px;padding:8px 14px;font-size:11px;text-align:right;min-width:140px}
.header-meta .val{font-size:18px;font-weight:800;display:block}
.body{padding:18px 28px 24px}
.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.kpi{background:#fff;border-radius:12px;padding:14px 16px;border-left:4px solid var(--c);box-shadow:0 1px 4px rgba(0,0,0,.06)}
.kpi-icon{font-size:18px;margin-bottom:6px}
.kpi-label{color:#64748b;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.kpi-value{font-size:20px;font-weight:800;color:var(--c);line-height:1}
.kpi-sub{font-size:9px;color:#94a3b8;margin-top:3px}
.semaforo-row{display:grid;grid-template-columns:auto 1fr;gap:16px;background:#fff;border-radius:12px;padding:16px;margin-bottom:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);align-items:center}
.semaforo-legend{display:flex;flex-direction:column;gap:8px;flex:1}
.leg-item{display:flex;align-items:center;gap:8px;font-size:11px}
.leg-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.leg-bar-wrap{flex:1;background:#e2e8f0;border-radius:4px;height:8px;overflow:hidden}
.leg-bar{height:8px;border-radius:4px}
.leg-pct{font-weight:700;font-size:11px;min-width:36px;text-align:right}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.section{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.sh{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:2px solid #f1f5f9;font-size:12px;font-weight:700}
.sh-dot{width:8px;height:8px;border-radius:50%}
table{width:100%;border-collapse:collapse}
thead th{background:#f8fafc;color:#475569;text-align:left;font-size:9px;padding:7px 10px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e2e8f0}
tbody tr:hover{background:#f8fafc}
td{border-top:1px solid #f8fafc;vertical-align:middle}
.foot{font-size:9px;text-align:center;color:#94a3b8;margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:center;gap:16px}
.foot span{display:inline-flex;align-items:center;gap:4px}
</style>
</head><body>
<div class="header">
  <div class="header-top">
    <div>
      <div class="header-badge">&#9654; INFORME OPERACIONAL</div>
      <h1>Informe Operacional</h1>
      <p>Detalle operativo de ventas, stock critico y metricas del negocio</p>
    </div>
    <div class="header-meta">
      <span style="color:#bae6fd;font-size:9px;text-transform:uppercase;letter-spacing:.06em">Ordenes totales</span>
      <span class="val">${resumen.totalOrdenes}</span>
      <span style="color:#7dd3fc;font-size:10px">${formatMoney(resumen.ventasTotales)}</span>
    </div>
  </div>
</div>
<div class="body">
  <div class="kpi-grid">
    <div class="kpi" style="--c:#2563eb">
      <div class="kpi-label">Total Ordenes</div>
      <div class="kpi-value">${resumen.totalOrdenes}</div>
      <div class="kpi-sub">ordenes procesadas</div>
    </div>
    <div class="kpi" style="--c:#059669">
      <div class="kpi-label">Ventas Totales</div>
      <div class="kpi-value">${formatMoney(resumen.ventasTotales)}</div>
      <div class="kpi-sub">ingresos acumulados</div>
    </div>
    <div class="kpi" style="--c:#7c3aed">
      <div class="kpi-label">Ticket Promedio</div>
      <div class="kpi-value">${formatMoney(resumen.ticketPromedio)}</div>
      <div class="kpi-sub">por orden</div>
    </div>
  </div>

  <div class="semaforo-row">
    ${donutSvg}
    <div class="semaforo-legend">
      <div style="font-size:11px;font-weight:700;color:#0f172a;margin-bottom:4px">Estado del Inventario — ${totalItems} productos activos</div>
      <div class="leg-item">
        <div class="leg-dot" style="background:#dc2626"></div>
        <span style="width:80px;color:#dc2626;font-weight:600">Agotados (${agotados})</span>
        <div class="leg-bar-wrap"><div class="leg-bar" style="background:#dc2626;width:${pctAgotado}%"></div></div>
        <span class="leg-pct" style="color:#dc2626">${pctAgotado}%</span>
      </div>
      <div class="leg-item">
        <div class="leg-dot" style="background:#f97316"></div>
        <span style="width:80px;color:#ea580c;font-weight:600">Criticos (${criticos})</span>
        <div class="leg-bar-wrap"><div class="leg-bar" style="background:#f97316;width:${pctCritico}%"></div></div>
        <span class="leg-pct" style="color:#f97316">${pctCritico}%</span>
      </div>
      <div class="leg-item">
        <div class="leg-dot" style="background:#22c55e"></div>
        <span style="width:80px;color:#16a34a;font-weight:600">Normales (${normales})</span>
        <div class="leg-bar-wrap"><div class="leg-bar" style="background:#22c55e;width:${pctNormal}%"></div></div>
        <span class="leg-pct" style="color:#16a34a">${pctNormal}%</span>
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="section">
      <div class="sh"><div class="sh-dot" style="background:#dc2626"></div>Inventario por Estado</div>
      <table>
        <thead><tr><th>Producto</th><th>Categoria</th><th>Stock</th><th>Estado</th></tr></thead>
        <tbody>${stockRows}</tbody>
      </table>
    </div>
    <div class="section">
      <div class="sh"><div class="sh-dot" style="background:#6366f1"></div>Top Productos — Ingresos</div>
      <div style="padding:12px 14px">
        <svg width="100%" height="${topProdSvgH}" viewBox="0 0 310 ${topProdSvgH}" preserveAspectRatio="xMinYMin meet">${topProdBars}</svg>
      </div>
    </div>
  </div>

  <div class="foot">
    <span>&#128197; Generado el ${formatDate()}</span>
    <span>&#127970; ${empresa}</span>
    <span>&#128274; Informe Operacional — uso interno</span>
  </div>
</div>
</body></html>`;

    try {
      const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      await browser.close();
      return Buffer.from(pdf);
    } catch {
      return buildOperacionalPdfKit(resumen, topProductos, stockItems, agotados, criticos, normales, empresa);
    }
  },

  generarGestion: async (empresa = "Tienda Virtual"): Promise<Buffer> => {
    const [resumen, topProductos, ventasPorCategoria] = await Promise.all([
      reportesRepository.ventasResumen(),
      reportesRepository.topProductos("todo", 7),
      reportesRepository.ventasPorCategoria("todo")
    ]);

    // ── Paletas ──────────────────────────────────────────────────
    const paletaProd = ["#6366f1","#8b5cf6","#3b82f6","#0891b2","#10b981","#f59e0b","#ef4444"];
    const paletaCat  = ["#0891b2","#10b981","#f59e0b","#8b5cf6","#ef4444","#3b82f6","#ec4899"];

    // ── SVG barras horizontales — top productos (unidades) ───────
    const maxUnits  = Math.max(...topProductos.map((p) => p.unidades), 1);
    const prodSvgH  = topProductos.length * 36 + 4;
    const prodBars  = topProductos.map((p, i) => {
      const bw    = Math.max(Math.round((p.unidades / maxUnits) * 240), 4);
      const y     = i * 36;
      const label = p.nombre.length > 21 ? p.nombre.substring(0, 21) + "…" : p.nombre;
      const color = paletaProd[i % paletaProd.length];
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      return `<g transform="translate(0,${y})">
        <text x="0" y="13" font-size="10" fill="#334155" font-family="Arial,sans-serif">${medal} ${label}</text>
        <rect x="0" y="18" width="${bw}" height="12" fill="${color}" rx="3" opacity="0.9"/>
        <text x="${bw + 5}" y="28" font-size="9" fill="#64748b" font-family="Arial,sans-serif">${p.unidades} u</text>
      </g>`;
    }).join("");

    // ── SVG barras horizontales — ingresos por categoria ─────────
    const cats    = ventasPorCategoria.slice(0, 7);
    const maxRev  = Math.max(...cats.map((c) => c.ingresos), 1);
    const catSvgH = cats.length * 36 + 4;
    const catBars = cats.map((c, i) => {
      const bw    = Math.max(Math.round((c.ingresos / maxRev) * 240), 4);
      const y     = i * 36;
      const label = c.categoria.length > 21 ? c.categoria.substring(0, 21) + "…" : c.categoria;
      const color = paletaCat[i % paletaCat.length];
      return `<g transform="translate(0,${y})">
        <text x="0" y="13" font-size="10" fill="#334155" font-family="Arial,sans-serif">${label}</text>
        <rect x="0" y="18" width="${bw}" height="12" fill="${color}" rx="3" opacity="0.9"/>
        <text x="${bw + 5}" y="28" font-size="9" fill="#64748b" font-family="Arial,sans-serif">${formatMoney(c.ingresos)}</text>
      </g>`;
    }).join("");

    // ── SVG donut — distribución ingresos por categoría ──────────
    const catTotal = cats.reduce((s, c) => s + c.ingresos, 0) || 1;
    let donutStart = -90;
    const donutSlices = cats.map((c, i) => {
      const sweep = (c.ingresos / catTotal) * 360;
      const path  = sweep < 0.5 ? "" : (() => {
        if (sweep >= 359.99) {
          return `<circle cx="70" cy="70" r="50" fill="${paletaCat[i % paletaCat.length]}" opacity="0.9"/>
                  <circle cx="70" cy="70" r="30" fill="#fff"/>`;
        }
        const toRad  = (d: number) => ((d - 90) * Math.PI) / 180;
        const p1x = 70 + 50 * Math.cos(toRad(donutStart));
        const p1y = 70 + 50 * Math.sin(toRad(donutStart));
        const p2x = 70 + 50 * Math.cos(toRad(donutStart + sweep));
        const p2y = 70 + 50 * Math.sin(toRad(donutStart + sweep));
        const i1x = 70 + 30 * Math.cos(toRad(donutStart));
        const i1y = 70 + 30 * Math.sin(toRad(donutStart));
        const i2x = 70 + 30 * Math.cos(toRad(donutStart + sweep));
        const i2y = 70 + 30 * Math.sin(toRad(donutStart + sweep));
        const lg  = sweep > 180 ? 1 : 0;
        return `<path d="M${p1x},${p1y} A50,50 0 ${lg},1 ${p2x},${p2y} L${i2x},${i2y} A30,30 0 ${lg},0 ${i1x},${i1y} Z" fill="${paletaCat[i % paletaCat.length]}" opacity="0.9"/>`;
      })();
      donutStart += sweep;
      return path;
    }).join("");

    // ── Tabla de top productos con ranking coloreado ──────────────
    const topTableRows = topProductos.map((p, i) => {
      const rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#cbd5e1";
      const pct = Math.round((p.ingresos / (topProductos.reduce((s, x) => s + x.ingresos, 0) || 1)) * 100);
      return `<tr>
        <td style="padding:7px 10px;font-size:11px">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${rankColor};color:#fff;text-align:center;line-height:20px;font-size:9px;font-weight:800;margin-right:6px">${i + 1}</span>
          ${p.nombre}
        </td>
        <td style="padding:7px 10px;font-size:10px;color:#64748b">${p.categoria}</td>
        <td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700">${p.unidades}</td>
        <td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700;color:#059669">${formatMoney(p.ingresos)}</td>
        <td style="padding:7px 10px;width:60px">
          <div style="background:#e2e8f0;border-radius:3px;height:5px">
            <div style="background:${paletaProd[i % paletaProd.length]};height:5px;width:${pct}%;border-radius:3px"></div>
          </div>
          <div style="font-size:8px;color:#94a3b8;text-align:right">${pct}%</div>
        </td>
      </tr>`;
    }).join("");

    try {
      const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
      const page    = await browser.newPage();
      await page.setContent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 60%,#1d4ed8 100%);color:#fff;padding:26px 36px 22px;position:relative;overflow:hidden}
.header::after{content:'';position:absolute;right:-40px;top:-40px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.06)}
.header-top{display:flex;justify-content:space-between;align-items:flex-start}
.header-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.15);color:#bfdbfe;font-size:10px;font-weight:700;border-radius:20px;padding:3px 12px;margin-bottom:8px;letter-spacing:.06em}
.header h1{font-size:27px;font-weight:800;margin-bottom:3px;letter-spacing:-.4px}
.header p{color:#93c5fd;font-size:11px}
.kpi-strip{display:flex;gap:12px;margin-top:16px}
.kpi-pill{background:rgba(255,255,255,.12);border-radius:10px;padding:8px 16px;flex:1;text-align:center}
.kpi-pill .lbl{color:#bfdbfe;font-size:9px;text-transform:uppercase;letter-spacing:.06em}
.kpi-pill .val{font-size:18px;font-weight:800;color:#fff;display:block;margin-top:1px}
.body{padding:16px 28px 20px}
.chart-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.card{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.card-head{display:flex;align-items:center;gap:7px;padding:10px 14px;border-bottom:2px solid #f1f5f9;font-size:12px;font-weight:700}
.card-dot{width:8px;height:8px;border-radius:50%}
.card-body{padding:12px 14px}
.donut-row{display:grid;grid-template-columns:140px 1fr;gap:12px;align-items:center}
.legend-list{display:flex;flex-direction:column;gap:5px}
.legend-item{display:flex;align-items:center;gap:7px;font-size:10px}
.legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
table{width:100%;border-collapse:collapse}
thead th{background:#f8fafc;color:#475569;text-align:left;font-size:9px;padding:6px 10px;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e2e8f0}
tbody tr:nth-child(even){background:#f8fafc}
.insight-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.insight{background:#fff;border-radius:10px;padding:12px;border-left:3px solid var(--ic);box-shadow:0 1px 3px rgba(0,0,0,.06)}
.insight-label{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.insight-val{font-size:16px;font-weight:800;color:var(--ic)}
.insight-desc{font-size:9px;color:#94a3b8;margin-top:2px}
.foot{font-size:9px;text-align:center;color:#94a3b8;margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:center;gap:14px}
</style>
</head><body>
<div class="header">
  <div class="header-top">
    <div>
      <div class="header-badge">&#9733; INFORME EJECUTIVO</div>
      <h1>Informe Ejecutivo</h1>
      <p>KPIs, graficos de ventas y analisis estrategico del periodo</p>
    </div>
  </div>
  <div class="kpi-strip">
    <div class="kpi-pill">
      <div class="lbl">&#128203; Total Ordenes</div>
      <span class="val">${resumen.totalOrdenes}</span>
    </div>
    <div class="kpi-pill">
      <div class="lbl">&#128176; Ventas Totales</div>
      <span class="val">${formatMoney(resumen.ventasTotales)}</span>
    </div>
    <div class="kpi-pill">
      <div class="lbl">&#127919; Ticket Promedio</div>
      <span class="val">${formatMoney(resumen.ticketPromedio)}</span>
    </div>
  </div>
</div>
<div class="body">
  <div class="insight-grid">
    <div class="insight" style="--ic:#2563eb">
      <div class="insight-label">Ordenes procesadas</div>
      <div class="insight-val">${resumen.totalOrdenes}</div>
      <div class="insight-desc">total acumulado</div>
    </div>
    <div class="insight" style="--ic:#059669">
      <div class="insight-label">Ingresos totales</div>
      <div class="insight-val">${formatMoney(resumen.ventasTotales)}</div>
      <div class="insight-desc">ventas consolidadas</div>
    </div>
    <div class="insight" style="--ic:#7c3aed">
      <div class="insight-label">Ticket promedio</div>
      <div class="insight-val">${formatMoney(resumen.ticketPromedio)}</div>
      <div class="insight-desc">por orden</div>
    </div>
  </div>

  <div class="chart-row">
    <div class="card">
      <div class="card-head"><div class="card-dot" style="background:#6366f1"></div>Top Productos — Unidades vendidas</div>
      <div class="card-body">
        <svg width="100%" height="${prodSvgH}" viewBox="0 0 290 ${prodSvgH}" preserveAspectRatio="xMinYMin meet">${prodBars}</svg>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-dot" style="background:#0891b2"></div>Ingresos por Categoria</div>
      <div class="card-body">
        <svg width="100%" height="${catSvgH}" viewBox="0 0 290 ${catSvgH}" preserveAspectRatio="xMinYMin meet">${catBars}</svg>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:12px">
    <div class="card-head"><div class="card-dot" style="background:#f59e0b"></div>Distribucion de Ingresos + Ranking de Productos</div>
    <div class="card-body">
      <div class="donut-row">
        <div>
          <svg width="140" height="140" viewBox="0 0 140 140">
            ${donutSlices}
            <circle cx="70" cy="70" r="24" fill="#fff"/>
            <text x="70" y="67" text-anchor="middle" font-size="10" font-weight="800" fill="#0f172a" font-family="Arial">${formatMoney(resumen.ventasTotales).split('.')[0]}</text>
            <text x="70" y="80" text-anchor="middle" font-size="8" fill="#64748b" font-family="Arial">ingresos</text>
          </svg>
        </div>
        <div class="legend-list">
          ${cats.map((c, i) => `<div class="legend-item">
            <div class="legend-dot" style="background:${paletaCat[i % paletaCat.length]}"></div>
            <span style="flex:1;color:#334155">${c.categoria}</span>
            <span style="font-weight:700;color:#0f172a">${formatMoney(c.ingresos)}</span>
            <span style="color:#94a3b8;font-size:9px;margin-left:5px">${Math.round((c.ingresos / catTotal) * 100)}%</span>
          </div>`).join("")}
        </div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:12px">
    <div class="card-head"><div class="card-dot" style="background:#f59e0b"></div>Ranking de Productos por Ingresos</div>
    <table>
      <thead><tr><th>Producto</th><th>Categoria</th><th style="text-align:right">Unidades</th><th style="text-align:right">Ingresos</th><th style="text-align:center">Participacion</th></tr></thead>
      <tbody>${topTableRows}</tbody>
    </table>
  </div>

  <div class="foot">
    <span>&#128197; Generado el ${formatDate()}</span>
    <span>&#127970; ${empresa}</span>
    <span>&#128274; Informe Ejecutivo — estrategico para direccion</span>
  </div>
</div>
</body></html>`, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
      await browser.close();
      return Buffer.from(pdf);
    } catch {
      return buildGestionPdfKit(resumen, topProductos, ventasPorCategoria, empresa);
    }
  }
};

