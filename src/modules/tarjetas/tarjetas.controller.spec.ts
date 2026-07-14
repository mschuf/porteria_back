import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { TarjetasController } from "./tarjetas.controller";

describe("TarjetasController authorization", () => {
  it("permite administrar tarjetas a roles encargados", () => {
    expect(Reflect.getMetadata(ROLES_KEY, TarjetasController)).toEqual(["super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria"]);
  });
});
