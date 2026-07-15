BEGIN;

ALTER TABLE public.usuario DROP CONSTRAINT IF EXISTS usuario_rol_check;
ALTER TABLE public.usuario ADD CONSTRAINT usuario_rol_check CHECK (
  rol = ANY (ARRAY['super_admin','admin_empresa','encargado_seguridad','encargado_porteria','encargado_visita','portero']::text[])
);

CREATE OR REPLACE FUNCTION public.fn_validar_usuario_sede_empresa()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rol_usuario text; empresa_nueva bigint; empresa_existente bigint;
BEGIN
  IF NEW.activo = false THEN RETURN NEW; END IF;
  SELECT rol INTO rol_usuario FROM public.usuario WHERE id = NEW.usuario_id FOR UPDATE;
  IF rol_usuario IS NULL OR rol_usuario NOT IN ('admin_empresa', 'encargado_visita') THEN
    RAISE EXCEPTION 'usuario_sede solo admite usuarios admin_empresa o encargado_visita';
  END IF;
  SELECT empresa_id INTO empresa_nueva FROM public.sede WHERE id = NEW.sede_id;
  SELECT s.empresa_id INTO empresa_existente
    FROM public.usuario_sede us JOIN public.sede s ON s.id = us.sede_id
   WHERE us.usuario_id = NEW.usuario_id AND us.activo = true
     AND (TG_OP = 'INSERT' OR us.id <> NEW.id) LIMIT 1;
  IF empresa_existente IS NOT NULL AND empresa_existente <> empresa_nueva THEN
    RAISE EXCEPTION 'todas las sedes del usuario deben pertenecer a la misma empresa';
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.visita
  ADD COLUMN IF NOT EXISTS estado_aprobacion TEXT NOT NULL DEFAULT 'aprobada';
ALTER TABLE public.visita DROP CONSTRAINT IF EXISTS visita_estado_aprobacion_check;
ALTER TABLE public.visita ADD CONSTRAINT visita_estado_aprobacion_check
  CHECK (estado_aprobacion IN ('pendiente', 'aprobada', 'rechazada'));

CREATE INDEX IF NOT EXISTS idx_visita_responsable_fecha_aprobacion
  ON public.visita (responsable_usuario_id, entrada_at DESC, estado_aprobacion);

COMMIT;
