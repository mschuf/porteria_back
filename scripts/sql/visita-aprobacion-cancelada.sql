BEGIN;

ALTER TABLE public.visita DROP CONSTRAINT IF EXISTS visita_estado_aprobacion_check;
ALTER TABLE public.visita ADD CONSTRAINT visita_estado_aprobacion_check
  CHECK (estado_aprobacion IN ('pendiente', 'aprobada', 'rechazada', 'cancelada'));

UPDATE public.visita
   SET estado_aprobacion = 'cancelada',
       motivo_rechazo = NULL
 WHERE estado = 'cancelada'
   AND estado_aprobacion <> 'rechazada';

COMMIT;
