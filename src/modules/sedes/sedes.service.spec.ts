import { SedesService } from "./sedes.service";

describe("SedesService delete rules", () => {
  it("blocks deletion when the site has related catalogs", async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue({ id: "1" }),
      countBlockingRelations: jest.fn().mockResolvedValue(1),
      hardDelete: jest.fn(),
    };
    const service = new SedesService(repo as never);

    await expect(service.deletePermanent(1)).rejects.toMatchObject({ response: { code: "CONFLICT" }, status: 409 });
    expect(repo.hardDelete).not.toHaveBeenCalled();
  });
});
