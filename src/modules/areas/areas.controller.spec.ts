import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { AreasController } from "./areas.controller";

describe("AreasController authorization", () => {
  it("requires exact super_admin role", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AreasController)).toEqual(["super_admin"]);
  });
});
