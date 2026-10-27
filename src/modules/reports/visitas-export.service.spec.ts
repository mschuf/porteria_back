import ExcelJS from "exceljs";
import { VisitasExportService } from "./visitas-export.service";
import type { VisitaListRow } from "../visitas/visitas.types";

function makeRow(overrides: Partial<VisitaListRow> = {}): VisitaListRow {
  return {
    id: "12",
    persona_id: "2",
    sede_id: "10",
    usuario_creador_id: "7",
    motivo_visita_id: "3",
    motivo: "Reunión",
    responsable_usuario_id: "8",
    estado: "activa",
    estado_aprobacion: "aprobada",
    motivo_rechazo: null,
    estado_seguimiento: null,
    zonas_permitidas: ["administración"],
    credencial_numero: "1",
    tarjeta_color: "rojo",
    entrada_at: "2026-07-10T10:00:00.000Z",
    salida_at: null,
    observaciones: null,
    creado_en: "2026-07-10T10:00:00.000Z",
    actualizado_en: "2026-07-10T10:00:00.000Z",
    visitante: "Visitante",
    documento: "123",
    empresa: "Proveedor",
    sede_nombre: "Sede Central",
    responsable_nombre: "Responsable",
    usuario_creador_nombre: "Portero",
    has_foto: false,
    has_visita_foto: false,
    ...overrides,
  };
}

describe("VisitasExportService historial", () => {
  const service = new VisitasExportService();

  it("genera un PDF con las filas filtradas del historial", async () => {
    const result = await service.exportHistorialFromRows([makeRow()], "pdf");

    expect(result.filename).toMatch(/^historial-visitas-.+\.pdf$/);
    expect(result.mimeType).toBe("application/pdf");
    expect(result.buffer.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("genera un Excel con las filas filtradas del historial", async () => {
    const result = await service.exportHistorialFromRows(
      [makeRow(), makeRow({ id: "13", estado_aprobacion: "rechazada", motivo_rechazo: "Sin autorización" })],
      "xlsx",
    );

    expect(result.filename).toMatch(/^historial-visitas-.+\.xlsx$/);
    expect(result.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(result.buffer.subarray(0, 2).toString()).toBe("PK");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer);
    const sheet = workbook.worksheets[0];

    expect(sheet.getRow(1).values.slice(1)).toEqual([
      "Visita",
      "Entrada",
      "Salida",
      "Visitante",
      "Documento",
      "Empresa",
      "Motivo",
      "Responsable",
      "Aprobación",
      "Estado",
      "Zonas",
      "Tarjeta",
      "Credencial",
    ]);
    expect(sheet.getRow(2).values[1]).toBe("#12");
    expect(sheet.getRow(2).values[4]).toBe("Visitante");
    expect(sheet.getRow(2).values[9]).toBe("Aprobado");
    expect(sheet.getRow(2).values[10]).toBe("Activa");
    expect(sheet.getRow(2).values[11]).toBe("Administración");
    expect(sheet.getRow(2).values[12]).toBe("Rojo");
    expect(sheet.getRow(2).values[13]).toBe("1");
  });
});
