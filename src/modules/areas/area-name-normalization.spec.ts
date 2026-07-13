import { normalizeAreaName } from "./area-name-normalization";

describe("normalizeAreaName", () => {
  it.each([
    "recepcion",
    "Recepción",
    "  RECEPCIÓN  ",
    "Recepción",
  ])("normaliza %s con la misma clave", (nombre) => {
    expect(normalizeAreaName(nombre)).toBe("recepcion");
  });

  it("colapsa los espacios internos", () => {
    expect(normalizeAreaName("Sala   de\tReunión")).toBe("sala de reunion");
  });
});
