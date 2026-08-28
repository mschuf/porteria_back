-- Contadores de intentos fallidos de login por usuario e IP (anti fuerza bruta).
-- Idempotente: puede ejecutarse varias veces sin efectos secundarios.
--
-- clave = 'u:{username}'  -> umbral 20 fallos / 15 min
-- clave = 'ip:{ip}'       -> umbral 40 fallos / 15 min
BEGIN;

CREATE TABLE IF NOT EXISTS public.login_intento (
  clave text PRIMARY KEY,
  intentos integer NOT NULL DEFAULT 0,
  ventana_inicia_en timestamptz NOT NULL DEFAULT now(),
  bloqueado_hasta timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT login_intento_intentos_check CHECK (intentos >= 0)
);

COMMIT;
