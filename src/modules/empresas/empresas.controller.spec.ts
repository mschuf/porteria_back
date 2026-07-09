import "reflect-metadata";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { EmpresasController } from "./empresas.controller";

describe("EmpresasController authorization", () => {
  it("requires only the exact super_admin role", () => {
    expect(Reflect.getMetadata(ROLES_KEY, EmpresasController)).toEqual(["super_admin"]);
  });
});

