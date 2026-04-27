import PDFDocument from "pdfkit";
import puppeteer from "puppeteer";
import { reportesRepository } from "./reportes.repository";

export const reportesService = {
  kpis: reportesRepository.ventasResumen,

  generarOperacional: async (): Promise<Buffer> => {
    const resumen = await reportesRepository.ventasResumen();
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    return new Promise((resolve) => {
      doc.on("data", (chunk) => chunks.push(chunk as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.fontSize(18).text("Reporte Operacional", { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Total Ordenes: ${resumen.totalOrdenes}`);
      doc.text(`Ventas Totales: ${resumen.ventasTotales.toFixed(2)}`);
      doc.text(`Ticket Promedio: ${resumen.ticketPromedio.toFixed(2)}`);
      doc.end();
    });
  },

  generarGestion: async (): Promise<Buffer> => {
    const resumen = await reportesRepository.ventasResumen();
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setContent(`
      <html>
        <body style="font-family: sans-serif; padding: 24px;">
          <h1>Reporte de Gestion</h1>
          <p>Total Ordenes: ${resumen.totalOrdenes}</p>
          <p>Ventas Totales: ${resumen.ventasTotales.toFixed(2)}</p>
          <p>Ticket Promedio: ${resumen.ticketPromedio.toFixed(2)}</p>
        </body>
      </html>
    `);

    const pdf = await page.pdf({ format: "A4" });
    await browser.close();
    return Buffer.from(pdf);
  }
};
