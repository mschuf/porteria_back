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

  it("passes the authorized site scope to the listing repository", async () => {
    const repo = {
      findAll: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 15 }),
    };
    const service = new SedesService(repo as never);

    await service.list({}, [2, 5]);

    expect(repo.findAll).toHaveBeenCalledWith(expect.objectContaining({
      page: 1,
      limit: 15,
      sedeIds: [2, 5],
    }));
  });
});
