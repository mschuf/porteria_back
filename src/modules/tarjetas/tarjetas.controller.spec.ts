import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { TarjetasController } from "./tarjetas.controller";

describe("TarjetasController authorization", () => {
  it("requires exact super_admin role", () => {
    expect(Reflect.getMetadata(ROLES_KEY, TarjetasController)).toEqual(["super_admin"]);
  });
});
