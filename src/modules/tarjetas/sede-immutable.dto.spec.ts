import { ValidationPipe } from "@nestjs/common";
import { UpdateAreaDto } from "../areas/dto/update-area.dto";
import { UpdateTarjetaDto } from "./dto/update-tarjeta.dto";

describe("sede immutable update contracts", () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

  it.each([UpdateAreaDto, UpdateTarjetaDto])("rejects sedeId in %p", async (metatype) => {
    await expect(pipe.transform({ sedeId: 99 }, { type: "body", metatype, data: "" })).rejects.toBeDefined();
  });
});
