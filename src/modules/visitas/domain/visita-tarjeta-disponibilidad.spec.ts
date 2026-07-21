import { requiresTarjetaDisponibilidad } from "./visita-tarjeta-disponibilidad";

describe("visita-tarjeta-disponibilidad", () => {
  describe("requiresTarjetaDisponibilidad", () => {
    it("requiere disponibilidad para programada, activa y sin_salida", () => {
      expect(requiresTarjetaDisponibilidad("programada")).toBe(true);
      expect(requiresTarjetaDisponibilidad("activa")).toBe(true);
      expect(requiresTarjetaDisponibilidad("sin_salida")).toBe(true);
    });

    it("no requiere disponibilidad para otros estados", () => {
      expect(requiresTarjetaDisponibilidad("finalizada")).toBe(false);
      expect(requiresTarjetaDisponibilidad("cancelada")).toBe(false);
    });
  });
});
