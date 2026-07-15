/**
 * @file configuration.ts
 * @description Lee variables de entorno y construye el objeto tipado de configuración de la aplicación.
 */
import "dotenv/config";

/**
 * Estructura completa de configuración cargada desde el entorno.
 */
export interface AppConfig {
  server: {
    port: number;
    host: string;
    nodeEnv: "development" | "production" | "test";
    corsOrigin: string[];
    globalPrefix: string;
    apiVersion: string;
  };
  frontend: {
    /** URL base pública del frontend, usada para construir enlaces en correos salientes. */
    baseUrl: string;
  };
  logging: {
    level: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  auth: {
    rsa: {
      privateKey: string;
      publicKey: string;
    };
    cookie: {
      name: string;
      secure: boolean;
      sameSite: "lax" | "strict" | "none";
      maxAgeMs: number;
    };
  };
  glpi: {
    baseUrl: string;
    appToken: string;
    bootstrapLogin: string;
    bootstrapPassword: string;
    bootstrapUserToken: string;
    catalogBootstrapLogin: string;
    catalogBootstrapPassword: string;
    catalogBootstrapUserToken: string;
    defaultEntity: number;
    requestTimeoutMs: number;
    sessionTtlSeconds: number;
    techniciansSource: "api" | "sql";
    usersSource: "api" | "sql";
  };
  mysql: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionLimit: number;
    connectTimeoutMs: number;
  };
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    connectionLimit: number;
    connectTimeoutMs: number;
    ssl: boolean;
  };
  cache: {
    defaultTtlSeconds: number;
    catalogTtlSeconds: number;
  };
  smtp: {
    host: string;
    port: number;
    secure: "ssl" | "tls" | "none";
    auth: boolean;
    user: string;
    password: string;
    from: string;
    fromName: string;
    rejectUnauthorized: boolean;
  };
  mail: {
    /** CC incluido en todos los correos salientes. */
    defaultCc: string;
  };
  attachments: {
    storagePath: string;
    maxBytes: number;
    allowedMime: string[];
  };
}

/**
 * Lee una variable de entorno como cadena.
 * @param name - Nombre de la variable.
 * @param fallback - Valor por defecto si no está definida o está vacía.
 * @returns Valor leído o fallback/cadena vacía.
 */
function readString(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    return "";
  }
  return value;
}

/**
 * Lee una variable de entorno y elimina espacios al inicio y al final.
 * @param name - Nombre de la variable.
 * @param fallback - Valor por defecto opcional.
 * @returns Cadena recortada.
 */
function readTrimmedString(name: string, fallback?: string): string {
  return readString(name, fallback).trim();
}

/**
 * Lee un secreto del entorno, recortando espacios y comillas envolventes opcionales.
 * @param name - Nombre de la variable.
 * @param fallback - Valor por defecto si no está definida.
 * @returns Secreto normalizado.
 */
function readSecretString(name: string, fallback = ""): string {
  let value = readTrimmedString(name, fallback);
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

/**
 * Lee una variable de entorno numérica.
 * @param name - Nombre de la variable.
 * @param fallback - Valor por defecto si no es un número válido.
 * @returns Número parseado o fallback.
 */
function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Lee una variable de entorno booleana (1/true/yes/si/on).
 * @param name - Nombre de la variable.
 * @param fallback - Valor por defecto si no está definida.
 * @returns Valor booleano interpretado.
 */
function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "si", "on"].includes(value.toLowerCase());
}

/**
 * Lee el atributo SameSite de la cookie de autenticación.
 * @param name - Nombre de la variable de entorno.
 * @param fallback - Valor por defecto si el valor no es válido.
 * @returns Política SameSite (`lax`, `strict` o `none`).
 */
function readSameSite(
  name: string,
  fallback: AppConfig["auth"]["cookie"]["sameSite"],
): AppConfig["auth"]["cookie"]["sameSite"] {
  const value = readString(name, fallback).toLowerCase();
  if (value === "strict" || value === "none" || value === "lax") return value;
  return fallback;
}

/**
 * Lee una lista separada por comas desde el entorno.
 * @param name - Nombre de la variable.
 * @param fallback - Lista por defecto si no está definida.
 * @returns Arreglo de cadenas no vacías.
 */
function readList(name: string, fallback: string[] = []): string[] {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Lee la fuente de lectura GLPI (`api` o `sql`) desde el entorno.
 * @param name - Nombre de la variable.
 * @param fallback - Fuente por defecto.
 * @returns `"api"` o `"sql"`.
 */
function readGlpiReadSource(
  name: string,
  fallback: "api" | "sql",
): "api" | "sql" {
  const raw = readString(name, fallback).trim();
  const value = raw.split(/\s+/)[0]?.toLowerCase() ?? fallback;
  return value === "sql" ? "sql" : "api";
}

/**
 * Normaliza la URL base de GLPI aceptando rutas con o sin `apirest.php`.
 * @param raw - URL cruda del entorno.
 * @returns URL terminada en `/apirest.php` o cadena vacía.
 */
function normalizeGlpiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/\/apirest\.php$/i.test(trimmed)) return trimmed;
  return `${trimmed}/apirest.php`;
}

/**
 * Construye el objeto de configuración completo a partir de `process.env`.
 * @returns Configuración tipada de la aplicación.
 */
export function buildConfig(): AppConfig {
  const nodeEnv = readString("NODE_ENV", "development") as AppConfig["server"]["nodeEnv"];
  const corsOrigin = readList("CORS_ORIGIN", ["*"]);
  const firstCorsOrigin = corsOrigin.find((origin) => origin && origin !== "*") ?? "";
  // Fallback del enlace de correos: primer origen CORS concreto o, en desarrollo, el frontend local.
  const frontendFallback = firstCorsOrigin || (nodeEnv === "development" ? "http://localhost:5173" : "");

  const dbgSmtpHost = readTrimmedString("SMTP_HOST", "");
  const dbgSmtpUser = readTrimmedString("SMTP_USER", "");
  const dbgSmtpPassword = readSecretString("SMTP_PASSWORD", "");
  if (dbgSmtpHost) {
    // eslint-disable-next-line no-console
    console.log(
      `[config] SMTP host=${dbgSmtpHost} port=${readNumber("SMTP_PORT", 587)} ` +
        `secure=${readString("SMTP_SECURE", "tls")} user='${dbgSmtpUser}' ` +
        `password=${dbgSmtpPassword ? `set(${dbgSmtpPassword.length})` : "<empty>"}`,
    );
    if (!dbgSmtpUser) {
      // eslint-disable-next-line no-console
      console.warn("[config] SMTP_HOST is set but SMTP_USER is empty");
    }
    if (!dbgSmtpPassword && readBoolean("SMTP_AUTH", true)) {
      // eslint-disable-next-line no-console
      console.warn("[config] SMTP_HOST is set but SMTP_PASSWORD is empty (auth will fail)");
    }
  }

  return {
    server: {
      port: readNumber("SERVER_PORT", 1001),
      host: readString("SERVER_HOST", "0.0.0.0"),
      nodeEnv,
      corsOrigin,
      globalPrefix: readString("API_GLOBAL_PREFIX", "api"),
      apiVersion: readString("API_VERSION", "v1"),
    },
    frontend: {
      baseUrl: readTrimmedString("FRONTEND_BASE_URL", frontendFallback).replace(/\/+$/, ""),
    },
    logging: {
      level: (readString("LOG_LEVEL", nodeEnv === "production" ? "error" : "info") as AppConfig["logging"]["level"]),
    },
    jwt: {
      secret: readString("JWT_SECRET", ".+.+.¿000hjklhjkl9hjkl90jkgj0987kghjk+sfdg"),
      expiresIn: readString("JWT_EXPIRES_IN", "365d"),
    },
    auth: {
      rsa: {
        privateKey: readString("AUTH_RSA_PRIVATE_KEY", ""),
        publicKey: readString("AUTH_RSA_PUBLIC_KEY", ""),
      },
      cookie: {
        name: readString("AUTH_COOKIE_NAME", "porteria_access_token"),
        secure: readBoolean("AUTH_COOKIE_SECURE", nodeEnv === "production"),
        sameSite: readSameSite("AUTH_COOKIE_SAME_SITE", "lax"),
        maxAgeMs: readNumber("AUTH_COOKIE_MAX_AGE", 0),
      },
    },
    glpi: {
      baseUrl: normalizeGlpiBaseUrl(readString("GLPI_BASE_URL", "")),
      appToken: readString("GLPI_APP_TOKEN", ""),
      bootstrapLogin: readString("GLPI_BOOTSTRAP_LOGIN", ""),
      bootstrapPassword: readString("GLPI_BOOTSTRAP_PASSWORD", ""),
      bootstrapUserToken: readString("GLPI_BOOTSTRAP_USER_TOKEN", ""),
      catalogBootstrapLogin: readString("GLPI_CATALOG_BOOTSTRAP_LOGIN", ""),
      catalogBootstrapPassword: readString("GLPI_CATALOG_BOOTSTRAP_PASSWORD", ""),
      catalogBootstrapUserToken: readString("GLPI_CATALOG_BOOTSTRAP_USER_TOKEN", ""),
      defaultEntity: readNumber("GLPI_DEFAULT_ENTITY", 0),
      requestTimeoutMs: readNumber("GLPI_REQUEST_TIMEOUT_MS", 15000),
      sessionTtlSeconds: readNumber("GLPI_SESSION_TTL_SECONDS", 8 * 3600),
      techniciansSource: readGlpiReadSource("GLPI_TECHNICIANS_SOURCE", "sql"),
      usersSource: readGlpiReadSource("GLPI_USERS_SOURCE", "sql"),
    },
    mysql: {
      host: readString("MYSQL_HOST", ""),
      port: readNumber("MYSQL_PORT", 3306),
      database: readString("MYSQL_DATABASE", ""),
      user: readString("MYSQL_USER", ""),
      password: readString("MYSQL_PASSWORD", ""),
      connectionLimit: readNumber("MYSQL_CONNECTION_LIMIT", 5),
      connectTimeoutMs: readNumber("MYSQL_CONNECT_TIMEOUT_MS", 5000),
    },
    postgres: {
      host: readString("POSTGRES_HOST", ""),
      port: readNumber("POSTGRES_PORT", 5432),
      database: readString("POSTGRES_DATABASE", ""),
      user: readString("POSTGRES_USER", ""),
      password: readString("POSTGRES_PASSWORD", ""),
      connectionLimit: readNumber("POSTGRES_CONNECTION_LIMIT", 5),
      connectTimeoutMs: readNumber("POSTGRES_CONNECT_TIMEOUT_MS", 5000),
      ssl: readBoolean("POSTGRES_SSL", false),
    },
    cache: {
      defaultTtlSeconds: readNumber("CACHE_TTL_DEFAULT_SECONDS", 600),
      catalogTtlSeconds: readNumber("CACHE_TTL_CATALOG_SECONDS", 3600),
    },
    smtp: {
      host: readTrimmedString("SMTP_HOST", ""),
      port: readNumber("SMTP_PORT", 587),
      secure: (readString("SMTP_SECURE", "tls").toLowerCase() as AppConfig["smtp"]["secure"]),
      auth: readBoolean("SMTP_AUTH", true),
      user: readTrimmedString("SMTP_USER", ""),
      password: readSecretString("SMTP_PASSWORD", ""),
      from: readTrimmedString("SMTP_FROM", readTrimmedString("SMTP_USER", "")),
      fromName: readTrimmedString("SMTP_FROM_NAME", "Portería"),
      rejectUnauthorized: readBoolean("SMTP_REJECT_UNAUTHORIZED", true),
    },
    mail: {
      defaultCc: readTrimmedString("MAIL_DEFAULT_CC"),
    },
    attachments: {
      storagePath: readString("ATTACHMENTS_STORAGE_PATH", "./data/attachments"),
      maxBytes: readNumber("ATTACHMENTS_MAX_BYTES", 50 * 1024 * 1024),
      allowedMime: readList("ATTACHMENTS_ALLOWED_MIME", [
        "image/png",
        "image/jpeg",
        "image/webp",
        "text/plain",
        "text/markdown",
        "text/x-markdown",
        "application/pdf",
      ]),
    },
  };
}
