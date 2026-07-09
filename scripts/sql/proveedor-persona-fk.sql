-- Proveedores y FK en personas (portería).
-- Ejecutar después de persona-drop-glpi-user-id.sql si aplica:
-- psql -h HOST -U USER -d asistia_back -f scripts/sql/proveedor-persona-fk.sql

CREATE TABLE IF NOT EXISTS public.proveedor (
  id              BIGSERIAL PRIMARY KEY,
  nombre          TEXT NOT NULL,
  ruc             TEXT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT proveedor_ruc_unique UNIQUE (ruc)
);

CREATE INDEX IF NOT EXISTS idx_proveedor_nombre
  ON public.proveedor (nombre);

CREATE INDEX IF NOT EXISTS idx_proveedor_activo
  ON public.proveedor (activo);

CREATE INDEX IF NOT EXISTS idx_proveedor_ruc
  ON public.proveedor (ruc);

-- Migrar empresas distintas existentes
INSERT INTO public.proveedor (nombre)
SELECT DISTINCT TRIM(p.empresa)
FROM public.prt_persona p
WHERE p.empresa IS NOT NULL
  AND TRIM(p.empresa) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.proveedor pr
    WHERE pr.nombre = TRIM(p.empresa)
  );

ALTER TABLE public.prt_persona
  ADD COLUMN IF NOT EXISTS proveedor_id BIGINT REFERENCES public.proveedor (id);

UPDATE public.prt_persona p
SET proveedor_id = pr.id
FROM public.proveedor pr
WHERE p.proveedor_id IS NULL
  AND p.empresa IS NOT NULL
  AND TRIM(p.empresa) <> ''
  AND TRIM(p.empresa) = pr.nombre;

-- Placeholder para personas sin empresa asignada
INSERT INTO public.proveedor (nombre)
SELECT 'Sin asignar'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.proveedor
  WHERE nombre = 'Sin asignar'
);

UPDATE public.prt_persona p
SET proveedor_id = pr.id
FROM public.proveedor pr
WHERE p.proveedor_id IS NULL
  AND pr.nombre = 'Sin asignar';

ALTER TABLE public.prt_persona
  ALTER COLUMN proveedor_id SET NOT NULL;

DROP INDEX IF EXISTS idx_persona_empresa;

ALTER TABLE public.prt_persona
  DROP COLUMN IF EXISTS empresa;

CREATE INDEX IF NOT EXISTS idx_persona_proveedor_id
  ON public.prt_persona (proveedor_id);
