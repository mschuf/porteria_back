import { HttpStatus } from "@nestjs/common";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import {
  LOGIN_MAX_ATTEMPTS_IP,
  LOGIN_MAX_ATTEMPTS_USER,
  LOGIN_WINDOW_MINUTES,
  LoginThrottleService,
} from "./login-throttle.service";

describe("LoginThrottleService", () => {
  const loginIntentos = {
    findActiveLock: jest.fn(),
    recordFailure: jest.fn(),
    clear: jest.fn(),
  };

  let service: LoginThrottleService;

  beforeEach(() => {
    jest.clearAllMocks();
    loginIntentos.findActiveLock.mockResolvedValue(null);
    loginIntentos.recordFailure.mockResolvedValue({ intentos: 1, bloqueadoHasta: null });
    loginIntentos.clear.mockResolvedValue(undefined);
    service = new LoginThrottleService(loginIntentos as never);
  });

  it("permite el login cuando no hay bloqueo vigente", async () => {
    await expect(service.assertAllowed("portero.demo", "10.0.0.8")).resolves.toBeUndefined();
    expect(loginIntentos.findActiveLock).toHaveBeenCalledWith(["u:portero.demo", "ip:10.0.0.8"]);
  });

  it("bloquea con RATE_LIMITED si el usuario o la IP tienen lock vigente", async () => {
    loginIntentos.findActiveLock.mockResolvedValue("u:portero.demo");

    await expect(service.assertAllowed(" Portero.Demo ", "10.0.0.8")).rejects.toMatchObject({
      code: API_ERROR_CODE.RATE_LIMITED,
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it("registra fallo en usuario e IP y devuelve remaining del usuario", async () => {
    loginIntentos.recordFailure
      .mockResolvedValueOnce({ intentos: 16, bloqueadoHasta: null })
      .mockResolvedValueOnce({ intentos: 16, bloqueadoHasta: null });

    await expect(service.recordFailure("portero.demo", "10.0.0.8")).resolves.toBe(4);

    expect(loginIntentos.recordFailure).toHaveBeenNthCalledWith(
      1,
      "u:portero.demo",
      LOGIN_MAX_ATTEMPTS_USER,
      LOGIN_WINDOW_MINUTES,
    );
    expect(loginIntentos.recordFailure).toHaveBeenNthCalledWith(
      2,
      "ip:10.0.0.8",
      LOGIN_MAX_ATTEMPTS_IP,
      LOGIN_WINDOW_MINUTES,
    );
  });

  it("devuelve remaining 5 a partir del fallo 16 y 0 al alcanzar el umbral", async () => {
    loginIntentos.recordFailure.mockResolvedValue({ intentos: 15, bloqueadoHasta: null });
    await expect(service.recordFailure("portero.demo", "1.1.1.1")).resolves.toBe(5);

    loginIntentos.recordFailure.mockResolvedValue({
      intentos: LOGIN_MAX_ATTEMPTS_USER,
      bloqueadoHasta: new Date(),
    });
    await expect(service.recordFailure("portero.demo", "1.1.1.1")).resolves.toBe(0);
  });

  it("limpia solo la clave de usuario tras un login exitoso", async () => {
    await service.clear(" Portero.Demo ");
    expect(loginIntentos.clear).toHaveBeenCalledWith("u:portero.demo");
  });

  it("normaliza IP vacía como unknown", async () => {
    await service.assertAllowed("demo", "  ");
    expect(loginIntentos.findActiveLock).toHaveBeenCalledWith(["u:demo", "ip:unknown"]);
  });
});
