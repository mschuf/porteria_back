import {
  mayHoldTarjetaEnUso,
  requiresTarjetaDisponibilidad,
} from "./visita-tarjeta-disponibilidad";

describe("visita-tarjeta-disponibilidad", () => {
  describe("requiresTarjetaDisponibilidad", () => {
    it("requiere disponibilidad para programada y activa", () => {
      expect(requiresTarjetaDisponibilidad("programada")).toBe(true);
      expect(requiresTarjetaDisponibilidad("activa")).toBe(true);
    });

    it("no requiere disponibilidad para otros estados", () => {
      expect(requiresTarjetaDisponibilidad("sin_salida")).toBe(false);
      expect(requiresTarjetaDisponibilidad("finalizada")).toBe(false);
      expect(requiresTarjetaDisponibilidad("cancelada")).toBe(false);
    });
  });

  describe("mayHoldTarjetaEnUso", () => {
    it("incluye programada, activa y sin_salida para liberar legado", () => {
      expect(mayHoldTarjetaEnUso("programada")).toBe(true);
      expect(mayHoldTarjetaEnUso("activa")).toBe(true);
      expect(mayHoldTarjetaEnUso("sin_salida")).toBe(true);
    });

    it("excluye estados cerrados", () => {
      expect(mayHoldTarjetaEnUso("finalizada")).toBe(false);
      expect(mayHoldTarjetaEnUso("cancelada")).toBe(false);
    });
  });
});
