# Envío de correos

> Estado documentado según el código y la configuración local al 15 de julio de 2026.

## Resumen

Actualmente el backend envía correos en estas situaciones:

| Momento | Destinatario principal | Asunto |
| --- | --- | --- |
| Al crear una visita | El usuario elegido como responsable de la visita | `Nueva visita asignada — Portería` |
| Al aprobar una visita | El creador de la visita | `Visita aprobada — Portería` |
| Al rechazar una visita | El creador de la visita | `Visita rechazada — Portería` |
| Al modificar una visita cambiando su responsable | El nuevo responsable | `Nueva visita asignada — Portería` |
| Al cambiar la propia contraseña, si el usuario tiene correo | El propio usuario | `Tu contraseña fue actualizada — Portería` |
| Al restablecer un administrador la contraseña de otro usuario con correo | El usuario afectado | `Un administrador restableció tu contraseña — Portería` |
| Al solicitar recuperar la contraseña, si el usuario tiene correo | El propio usuario | `Recuperación de contraseña — Portería` |
| Al solicitar recuperar la contraseña, si el usuario no tiene correo | Los superiores del nivel jerárquico más cercano que tengan correo | `Solicitud de reseteo de contraseña — Portería` |

Además de la aprobación o el rechazo, que también generan notificaciones internas de la aplicación (SSE), estos flujos envían un correo. Modificar una visita solo genera correo cuando cambia el responsable; los demás cambios (ingreso, salida, tarjeta, etc.) no envían correo. Todos los envíos son best-effort: si el destinatario no tiene correo o el SMTP falla, la operación se completa igual y solo se registra un aviso en el log.

## 1. Nueva visita asignada

### Cuándo se envía

El correo se programa inmediatamente después de crear correctamente una visita mediante `POST /visitas`. El envío SMTP se ejecuta en segundo plano para que la respuesta HTTP no espere al servidor de correo. Toda visita nueva queda inicialmente con estado `programada` y aprobación `pendiente`.

El envío ocurre solamente durante la creación. Cambiar posteriormente el responsable u otros datos de la visita no genera otro correo.

### A quién se envía

Al usuario activo seleccionado como responsable. Un usuario con rol `portero` no puede ser responsable. Si el responsable es un `encargado_visita`, además debe estar asignado a la sede de la visita.

La dirección se obtiene del correo del responsable en GLPI. Si no tiene correo, la visita se conserva pero el mensaje no se envía.

### Qué contiene

- Nombre del visitante.
- Documento.
- Sede.
- Motivo de la visita.
- Fecha y hora, expresadas en la zona horaria `America/Asuncion`.
- Usuario que creó la visita.
- Enlace a `/aprobacion-visitas` en el frontend.

### Ejemplo

**Para:** María González `<maria.gonzalez@ejemplo.com>`  
**Asunto:** Nueva visita asignada — Portería

```text
Hola María González, fuiste asignado como responsable de una visita.
Visitante: Juan Pérez
Documento: 4.567.890
Sede: Casa Matriz
Motivo: Reunión con administración
Fecha y hora: 15 de julio de 2026, 14:30
Creada por: Carlos López
Revisar visita: https://porteria.ejemplo.com/aprobacion-visitas
```

### Estado del envío en la respuesta

La creación de la visita no se revierte ni espera el resultado del servidor SMTP. La respuesta confirma que el correo fue programado, no que ya fue entregado:

```json
{
  "notificacionCorreo": {
    "requerida": true,
    "programada": true,
    "enviada": false,
    "advertencia": null
  }
}
```

Si el responsable no tiene correo o SMTP falla, el backend registra la causa en sus logs y emite por SSE un aviso al usuario que realizó la operación. El frontend muestra ese aviso como un toast de error sin bloquear la creación de la visita.

## 2. Recuperación de la propia contraseña

### Cuándo se envía

Cuando alguien solicita una recuperación mediante `POST /auth/recuperar-contrasena` usando el login o correo de una cuenta activa y esa cuenta tiene un correo registrado.

El endpoint siempre devuelve una respuesta genérica para no revelar si la cuenta existe. Antes del envío se invalidan los enlaces propios pendientes del usuario y se crea un token nuevo, válido durante una hora.

### A quién se envía

Al correo registrado en la cuenta del propio usuario.

### Ejemplo

**Para:** Juan Pérez `<juan.perez@ejemplo.com>`  
**Asunto:** Recuperación de contraseña — Portería

```text
Hola Juan Pérez,

Recibimos una solicitud para restablecer tu contraseña. Abrí el siguiente
enlace (válido por 1 hora):
https://porteria.ejemplo.com/restablecer-contrasena?token=TOKEN_DE_EJEMPLO

Si no lo solicitaste, ignorá este correo.
```

El enlace permite que el usuario defina una contraseña nueva. El token se guarda en la base de datos únicamente como hash y queda inutilizable después de usarlo.

## 3. Recuperación por medio de un superior

### Cuándo se envía

Se usa el mismo endpoint `POST /auth/recuperar-contrasena`, pero este flujo se activa cuando la cuenta existe, está activa y no tiene correo registrado.

El sistema busca superiores activos con correo, empezando por el nivel jerárquico más cercano. Se detiene en el primer nivel que tenga destinatarios; no envía simultáneamente a todos los niveles superiores. El ámbito de la búsqueda respeta, según el rol, la empresa de seguridad y/o la sede del usuario.

Si hay varios superiores válidos en el nivel elegido, todos reciben el mensaje como destinatarios principales del mismo correo y comparten el mismo enlace.

Orden de búsqueda por rol del usuario que pide la recuperación:

| Rol del usuario | Niveles que se prueban, en orden |
| --- | --- |
| `portero` | `encargado_porteria` → `encargado_seguridad` → `admin_empresa` → `super_admin` |
| `encargado_visita` | `admin_empresa` → `super_admin` |
| `encargado_porteria` | `encargado_seguridad` → `admin_empresa` → `super_admin` |
| `encargado_seguridad` | `super_admin` |
| `admin_empresa` | `super_admin` |
| `super_admin` | No tiene un nivel superior; no se envía correo |

### Ejemplo

**Para:** Laura Benítez `<laura.benitez@ejemplo.com>`  
**Asunto:** Solicitud de reseteo de contraseña — Portería

```text
El usuario Pedro Gómez (pgomez) no tiene correo y solicitó recuperar su contraseña.

Como superior directo, podés restablecer su contraseña a la temporal (deberá
cambiarla al ingresar) desde el siguiente enlace (válido por 24 horas):
https://porteria.ejemplo.com/restablecer-subordinado?token=TOKEN_DE_EJEMPLO
```

Al confirmar desde el enlace, la contraseña del subordinado se establece temporalmente como `12345` y el sistema obliga a cambiarla en el siguiente ingreso. El enlace vence a las 24 horas y queda inutilizable después de usarlo.

Si no existe ningún superior válido con correo, no se envía ningún mensaje y la situación queda registrada en el log del backend.

## 4. Decisión de una visita (aprobada o rechazada)

Se envía inmediatamente después de que un encargado aprueba o rechaza una visita mediante `PATCH /encargado-visita/visitas/:id/aprobacion`.

### A quién se envía

Al creador de la visita (el usuario que la registró, normalmente un `portero`), siempre que esté activo y tenga correo. Es quien opera la portería y necesita saber si dejar pasar o no al visitante.

### Qué contiene

- Decisión (aprobada o rechazada) y quién la tomó (responsable).
- Visitante, documento, sede, motivo y número de tarjeta.
- **Motivo del rechazo**, solo cuando la visita fue rechazada.
- Enlace a `/visitas` en el frontend.

## 5. Modificación de una visita (cambio de responsable)

Al modificar una visita mediante `PATCH /visitas/:id`, solo se envía correo cuando cambia el responsable. En ese caso el flujo de aprobación se reinicia (`pendiente`) y se notifica al **nuevo responsable** con el mismo correo y contenido que la asignación al crear una visita (asunto `Nueva visita asignada — Portería`). Cambiar otros campos (ingreso, salida, tarjeta, observaciones, etc.) no genera correo.

## 6. Cambio de la propia contraseña

Cuando un usuario autenticado cambia su contraseña mediante `POST /auth/cambiar-contrasena`, se le envía un aviso de seguridad a su propio correo (si tiene uno registrado) confirmando el cambio e invitándolo a contactar a su administrador si no fue él. No incluye enlaces ni la contraseña.

## 7. Reseteo de contraseña por un administrador

Cuando un administrador o superior restablece la contraseña de otro usuario mediante `PATCH /usuarios-admin/:id/reset-password`, se avisa por correo al usuario afectado (si tiene correo) de que un administrador restableció su contraseña y que debe ingresar con la nueva credencial proporcionada. Por seguridad, el correo **no** incluye la contraseña.

## Destinatarios adicionales y remitente

Todos los flujos anteriores pasan por el mismo servicio SMTP:

- El remitente se toma de `SMTP_FROM`; el nombre visible se toma de `SMTP_FROM_NAME`.
- Si `MAIL_DEFAULT_CC` está definido, esa dirección recibe copia de **todos** los correos. No se duplica si ya figura como destinatario principal.
- En la configuración local revisada, SMTP está habilitado, el nombre visible del remitente es `Asistia` y `MAIL_DEFAULT_CC` no está definido. Por lo tanto, actualmente no hay una copia global adicional configurada en este entorno.
- Si `SMTP_HOST` está vacío, todos los envíos se omiten.
- Ante un error SMTP se realizan hasta tres intentos: el segundo después de 1 segundo y el tercero después de 2 segundos.

Tener SMTP configurado habilita los intentos de envío, pero la entrega final también depende de las credenciales, la conectividad y la aceptación del servidor de correo.

## Plantillas existentes que no se envían actualmente

El archivo `src/modules/mail/templates/mail-request.template.ts` contiene plantillas para confirmar al solicitante que una solicitud fue registrada y para avisar al equipo de soporte. Actualmente ningún servicio importa esas funciones ni llama al servicio de correo con ellas, por lo que esas plantillas no representan envíos activos.

## Referencias en el código

- `src/modules/visitas/visitas.service.ts`: envío al crear una visita y al cambiar su responsable (`notifyResponsableAssignment`).
- `src/modules/visitas/encargado-visita-visitas.service.ts`: envío al aprobar o rechazar una visita (`notifyCreador`).
- `src/modules/mail/templates/visita-assignment.template.ts`: contenido del correo de asignación de visita.
- `src/modules/mail/templates/visita-decision.template.ts`: contenido del correo de aprobación/rechazo.
- `src/modules/mail/templates/password-changed.template.ts`: aviso de cambio de la propia contraseña.
- `src/modules/mail/templates/password-reset-admin.template.ts`: aviso de reseteo por administrador.
- `src/modules/usuarios-admin/usuarios-admin.service.ts`: aviso al resetear la contraseña de otro usuario (`notifyPasswordReset`).
- `src/modules/auth/password-reset.service.ts`: ambos flujos de recuperación y aviso de cambio propio (`notifyPasswordChanged`).
- `src/modules/auth/repositories/password-reset.sql-repository.ts`: selección de superiores por rol y ámbito.
- `src/common/types/role-hierarchy.ts`: jerarquía de roles.
- `src/modules/mail/mail.service.ts`: destinatarios, CC, remitente y reintentos SMTP.
- `src/config/configuration.ts`: variables de configuración de correo.
