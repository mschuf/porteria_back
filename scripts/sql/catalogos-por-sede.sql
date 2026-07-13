BEGIN;

ALTER TABLE public.proveedor ADD COLUMN IF NOT EXISTS sede_id bigint NULL REFERENCES public.sede(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.persona ADD COLUMN IF NOT EXISTS sede_id bigint NULL REFERENCES public.sede(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.motivo_visita ADD COLUMN IF NOT EXISTS sede_id bigint NULL REFERENCES public.sede(id) ON UPDATE CASCADE ON DELETE RESTRICT;

-- Liberar unicidad global antes de duplicar historicos entre sedes.
ALTER TABLE public.proveedor DROP CONSTRAINT IF EXISTS proveedor_ruc_unique;
ALTER TABLE public.motivo_visita DROP CONSTRAINT IF EXISTS motivo_visita_nombre_unique;
DROP INDEX IF EXISTS public.idx_persona_documento_unique_nonempty;

-- Los originales quedan sin sede para clasificacion manual. Se crean copias por cada
-- sede inferida de las visitas y luego se reconectan las visitas a esas copias.
CREATE TEMP TABLE proveedor_sede_map(proveedor_original bigint, sede_id bigint, proveedor_nuevo bigint, PRIMARY KEY(proveedor_original, sede_id));
DO $$ DECLARE r record; nuevo bigint; BEGIN
  FOR r IN SELECT DISTINCT p.proveedor_id, v.sede_id FROM public.visita v JOIN public.persona p ON p.id = v.persona_id LOOP
    INSERT INTO public.proveedor(nombre, ruc, activo, creado_en, actualizado_en, sede_id)
      SELECT nombre, ruc, activo, creado_en, actualizado_en, r.sede_id FROM public.proveedor WHERE id = r.proveedor_id RETURNING id INTO nuevo;
    INSERT INTO proveedor_sede_map VALUES (r.proveedor_id, r.sede_id, nuevo);
  END LOOP;
END $$;

CREATE TEMP TABLE persona_sede_map(persona_original bigint, sede_id bigint, persona_nueva bigint, PRIMARY KEY(persona_original, sede_id));
DO $$ DECLARE r record; nuevo bigint; BEGIN
  FOR r IN SELECT DISTINCT v.persona_id, v.sede_id FROM public.visita v LOOP
    INSERT INTO public.persona(nombre, documento, email, telefono, activo, foto, foto_mime_type, proveedor_id,
      ultimo_motivo_visita_id, ultimo_responsable_usuario_id, creado_en, actualizado_en, sede_id)
      SELECT p.nombre, p.documento, p.email, p.telefono, p.activo, p.foto, p.foto_mime_type, pm.proveedor_nuevo,
        NULL, p.ultimo_responsable_usuario_id, p.creado_en, p.actualizado_en, r.sede_id
      FROM public.persona p JOIN proveedor_sede_map pm ON pm.proveedor_original = p.proveedor_id AND pm.sede_id = r.sede_id
      WHERE p.id = r.persona_id RETURNING id INTO nuevo;
    INSERT INTO persona_sede_map VALUES (r.persona_id, r.sede_id, nuevo);
  END LOOP;
END $$;

CREATE TEMP TABLE motivo_sede_map(motivo_original bigint, sede_id bigint, motivo_nuevo bigint, PRIMARY KEY(motivo_original, sede_id));
DO $$ DECLARE r record; nuevo bigint; BEGIN
  FOR r IN SELECT DISTINCT motivo_visita_id, sede_id FROM public.visita WHERE motivo_visita_id IS NOT NULL LOOP
    INSERT INTO public.motivo_visita(nombre, activo, creado_en, actualizado_en, sede_id)
      SELECT nombre, activo, creado_en, actualizado_en, r.sede_id FROM public.motivo_visita WHERE id = r.motivo_visita_id RETURNING id INTO nuevo;
    INSERT INTO motivo_sede_map VALUES (r.motivo_visita_id, r.sede_id, nuevo);
  END LOOP;
END $$;

UPDATE public.visita v SET persona_id = m.persona_nueva
FROM persona_sede_map m WHERE m.persona_original = v.persona_id AND m.sede_id = v.sede_id;
UPDATE public.visita v SET motivo_visita_id = m.motivo_nuevo
FROM motivo_sede_map m WHERE m.motivo_original = v.motivo_visita_id AND m.sede_id = v.sede_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_proveedor_sede_ruc ON public.proveedor(sede_id, ruc) WHERE sede_id IS NOT NULL AND ruc IS NOT NULL AND btrim(ruc) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_persona_sede_documento ON public.persona(sede_id, documento) WHERE sede_id IS NOT NULL AND documento <> '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_motivo_sede_nombre ON public.motivo_visita(sede_id, lower(btrim(nombre))) WHERE sede_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proveedor_sede_id ON public.proveedor(sede_id);
CREATE INDEX IF NOT EXISTS idx_persona_sede_id ON public.persona(sede_id);
CREATE INDEX IF NOT EXISTS idx_motivo_visita_sede_id ON public.motivo_visita(sede_id);
ALTER TABLE public.proveedor ADD CONSTRAINT uq_proveedor_id_sede UNIQUE(id, sede_id);
ALTER TABLE public.persona ADD CONSTRAINT uq_persona_id_sede UNIQUE(id, sede_id);
ALTER TABLE public.motivo_visita ADD CONSTRAINT uq_motivo_id_sede UNIQUE(id, sede_id);
ALTER TABLE public.persona ADD CONSTRAINT fk_persona_proveedor_sede FOREIGN KEY(proveedor_id, sede_id) REFERENCES public.proveedor(id, sede_id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.visita ADD CONSTRAINT fk_visita_persona_sede FOREIGN KEY(persona_id, sede_id) REFERENCES public.persona(id, sede_id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE public.visita ADD CONSTRAINT fk_visita_motivo_sede FOREIGN KEY(motivo_visita_id, sede_id) REFERENCES public.motivo_visita(id, sede_id) ON UPDATE CASCADE ON DELETE RESTRICT;

COMMIT;
