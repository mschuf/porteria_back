import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { AreasController } from "./areas.controller";

describe("AreasController authorization", () => {
  it("permite lectura a roles encargados", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AreasController)).toEqual(["super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria"]);
  });
});
