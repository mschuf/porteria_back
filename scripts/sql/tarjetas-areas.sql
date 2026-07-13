-- Catalogos administrativos de areas y tarjetas vinculados a sedes.
-- Es idempotente y admite las tablas de la primera version siempre que no tengan filas sin sede.

CREATE TABLE IF NOT EXISTS public.areas (
  id              BIGSERIAL PRIMARY KEY,
  sede_id         BIGINT NOT NULL REFERENCES public.sede(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  nombre          TEXT NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS sede_id BIGINT;
ALTER TABLE public.areas ALTER COLUMN sede_id SET NOT NULL;
DROP INDEX IF EXISTS public.uq_areas_nombre_normalizado;
DROP INDEX IF EXISTS public.uq_areas_sede_nombre_normalizado;
CREATE UNIQUE INDEX uq_areas_sede_nombre_normalizado
  ON public.areas (
    sede_id,
    regexp_replace(
      translate(lower(btrim(nombre)), 'áéíóúüñ', 'aeiouun'),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
CREATE INDEX IF NOT EXISTS idx_areas_sede_id ON public.areas (sede_id);
CREATE INDEX IF NOT EXISTS idx_areas_activo ON public.areas (activo);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'areas_sede_id_fkey') THEN
    ALTER TABLE public.areas ADD CONSTRAINT areas_sede_id_fkey
      FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_areas_id_sede') THEN
    ALTER TABLE public.areas ADD CONSTRAINT uq_areas_id_sede UNIQUE (id, sede_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tarjetas (
  id              BIGSERIAL PRIMARY KEY,
  sede_id         BIGINT NOT NULL REFERENCES public.sede(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  numero          INTEGER NOT NULL CHECK (numero > 0),
  color           VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  icono           VARCHAR(80) NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  en_uso          BOOLEAN NOT NULL DEFAULT false,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_tarjetas_en_uso_activa CHECK (NOT en_uso OR activo)
);

ALTER TABLE public.tarjetas ADD COLUMN IF NOT EXISTS sede_id BIGINT;
ALTER TABLE public.tarjetas ALTER COLUMN sede_id SET NOT NULL;
ALTER TABLE public.tarjetas DROP CONSTRAINT IF EXISTS uq_tarjetas_numero;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tarjetas_sede_numero ON public.tarjetas (sede_id, numero);
CREATE INDEX IF NOT EXISTS idx_tarjetas_sede_id ON public.tarjetas (sede_id);
CREATE INDEX IF NOT EXISTS idx_tarjetas_activo ON public.tarjetas (activo);
CREATE INDEX IF NOT EXISTS idx_tarjetas_en_uso ON public.tarjetas (en_uso);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tarjetas_sede_id_fkey') THEN
    ALTER TABLE public.tarjetas ADD CONSTRAINT tarjetas_sede_id_fkey
      FOREIGN KEY (sede_id) REFERENCES public.sede(id) ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_tarjetas_id_sede') THEN
    ALTER TABLE public.tarjetas ADD CONSTRAINT uq_tarjetas_id_sede UNIQUE (id, sede_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tarjeta_area (
  tarjeta_id BIGINT NOT NULL,
  area_id    BIGINT NOT NULL,
  sede_id    BIGINT NOT NULL,
  PRIMARY KEY (tarjeta_id, area_id)
);

ALTER TABLE public.tarjeta_area ADD COLUMN IF NOT EXISTS sede_id BIGINT;
ALTER TABLE public.tarjeta_area DROP CONSTRAINT IF EXISTS tarjeta_area_tarjeta_id_fkey;
ALTER TABLE public.tarjeta_area DROP CONSTRAINT IF EXISTS tarjeta_area_area_id_fkey;
ALTER TABLE public.tarjeta_area ALTER COLUMN sede_id SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tarjeta_area_tarjeta_sede_fkey') THEN
    ALTER TABLE public.tarjeta_area ADD CONSTRAINT tarjeta_area_tarjeta_sede_fkey
      FOREIGN KEY (tarjeta_id, sede_id) REFERENCES public.tarjetas(id, sede_id)
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tarjeta_area_area_sede_fkey') THEN
    ALTER TABLE public.tarjeta_area ADD CONSTRAINT tarjeta_area_area_sede_fkey
      FOREIGN KEY (area_id, sede_id) REFERENCES public.areas(id, sede_id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tarjeta_area_area_id ON public.tarjeta_area (area_id);
CREATE INDEX IF NOT EXISTS idx_tarjeta_area_sede_id ON public.tarjeta_area (sede_id);
