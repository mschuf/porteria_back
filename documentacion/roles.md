# Roles del sistema

> Estado documentado según el código al 15 de julio de 2026.

El sistema define **seis roles**. Este documento los describe de mayor a menor jerarquía e incluye, para cada uno: quién lo administra, a quién administra y qué puede hacer.

La jerarquía se centraliza en [`src/common/types/role-hierarchy.ts`](../src/common/types/role-hierarchy.ts). Las etiquetas visibles en la interfaz están en [`role.ts`](../../porteria_front/src/utils/role.ts).

## Jerarquía de un vistazo

| Nivel | Rol interno | Etiqueta en pantalla | Administra a | Es administrado por |
| --- | --- | --- | --- | --- |
| 4 | `super_admin` | Super Admin | Todos (incluido otros Super Admin) | Nadie |
| 3 | `admin_empresa` | Admin Empresa | Encargado de portería, Encargado de visita, Portero | Super Admin |
| 2 | `encargado_seguridad` | Encargado de seguridad | Encargado de portería, Portero | Super Admin |
| 1 | `encargado_porteria` | Encargado de portería | Portero | Encargado de seguridad → Admin Empresa → Super Admin |
| 1 | `encargado_visita` | Encargado de visita | Nadie | Admin Empresa → Super Admin |
| 0 | `portero` | Portero | Nadie | Encargado de portería → Encargado de seguridad → Admin Empresa → Super Admin |

> **Nota sobre los niveles 1:** `encargado_porteria` y `encargado_visita` comparten el mismo rango numérico, pero pertenecen a ramas distintas. El de portería opera dentro de una empresa de seguridad; el de visita solo aprueba/rechaza visitas asignadas a sus sedes y no administra a nadie.

La columna "Es administrado por" está ordenada del superior más cercano al más lejano. Ese orden es el que usa la recuperación de contraseña para elegir al superior directo (ver [`correos.md`](./correos.md)).

---

## 1. Super Admin (`super_admin`) — Nivel 4

El rol más alto. Tiene alcance **global**: no está limitado por empresa ni por sede.

### Quién lo administra
Nadie por encima. Solo otro Super Admin puede crear, editar, resetear la contraseña o desactivar a un Super Admin (`getManagedRoles("super_admin")` se incluye a sí mismo).

### A quién administra
A **todos** los roles del sistema, sin restricción de empresa o sede: Super Admin, Admin Empresa, Encargado de seguridad, Encargado de portería, Encargado de visita y Portero. Es el único rol que puede cambiar el rol de un usuario existente (`update` rechaza el cambio de rol a cualquiera que no sea Super Admin).

### Qué puede hacer
Acceso completo, incluidas las secciones exclusivas (rutas `StrictSuperAdminRoute`):

- **Administración global:** Empresas, Empresas de seguridad, Sedes.
- **Asignaciones:** Usuarios por empresa, Asignaciones sede-seguridad, Usuarios por empresa de seguridad.
- **Gestión de usuarios:** Usuarios (crear/editar/resetear/activar/desactivar cualquier rol), Áreas, Tarjetas.
- **Auditoría:** Reporte de portería y Auditoría de portería (sin filtro de sede).
- **Portería y visitas:** todos los módulos operativos y la aprobación de visitas sobre cualquier sede.

---

## 2. Admin Empresa (`admin_empresa`) — Nivel 3

Administra la operación de **una empresa**, limitado a las **sedes** que tiene asignadas.

### Quién lo administra
El **Super Admin**.

### A quién administra
Dentro de sus sedes autorizadas:

- **Encargado de portería**
- **Encargado de visita** (solo si el encargado está asignado a sedes que el Admin Empresa también tiene autorizadas)
- **Portero**

No puede crear ni tocar a Encargados de seguridad, otros Admin Empresa ni Super Admin, y no puede cambiar el rol de un usuario existente.

### Qué puede hacer
Ve la sección de **Administración**, pero acotada:

- **Usuarios:** gestiona los roles subordinados dentro de sus sedes.
- **Áreas:** acceso permitido (excepción explícita en el menú para `admin_empresa`).
- **Tarjetas.**
- **Asignaciones → Usuarios por empresa de seguridad.**
- **Auditoría:** Reporte y Auditoría de portería, filtrados a sus sedes.
- **Aprobación de visitas:** puede decidir sobre visitas de niveles inferiores dentro de sus sedes.

No ve Empresas, Empresas de seguridad ni Sedes (exclusivas de Super Admin).

---

## 3. Encargado de seguridad (`encargado_seguridad`) — Nivel 2

Responsable de una **empresa de seguridad**. Su alcance se resuelve por `empresaSeguridadId`: opera sobre las sedes cubiertas por esa empresa de seguridad.

### Quién lo administra
El **Super Admin**.

### A quién administra
Dentro de su empresa de seguridad:

- **Encargado de portería**
- **Portero**

No administra Encargados de visita ni roles de empresa/administración.

### Qué puede hacer
- **Usuarios:** gestiona porteros y encargados de portería de su empresa de seguridad.
- **Tarjetas** y **Asignaciones → Usuarios por empresa de seguridad.**
- **Auditoría:** Reporte y Auditoría de portería, dentro del alcance de su empresa de seguridad.
- **Aprobación de visitas:** decide sobre visitas de niveles inferiores en las sedes de su empresa de seguridad.

---

## 4. Encargado de portería (`encargado_porteria`) — Nivel 1

Opera la portería de una sede dentro de una empresa de seguridad. Combina tareas operativas (como el portero) con capacidad limitada de administración.

### Quién lo administra
En orden de cercanía: **Encargado de seguridad → Admin Empresa → Super Admin**.

### A quién administra
Únicamente al **Portero** (`getManagedRoles("encargado_porteria") = ["portero"]`).

### Qué puede hacer
- **Módulo de Portería completo:** Indicadores, Proveedores, Personas, Motivos de visita, Visitas e Historial (es un rol "de portería", `isPorteroRole`).
- **Usuarios:** puede gestionar porteros de su empresa de seguridad.
- **Auditoría** y **Tarjetas** dentro de su alcance de seguridad.
- **Aprobación de visitas:** decide sobre visitas de nivel inferior (portero) en su sede.

---

## 5. Encargado de visita (`encargado_visita`) — Nivel 1

Rol especializado y acotado: **aprueba o rechaza las visitas** que se le asignan. Está ligado a una o varias **sedes** (requiere al menos una).

### Quién lo administra
En orden de cercanía: **Admin Empresa → Super Admin**. El Admin Empresa solo puede administrarlo si comparte las sedes del encargado.

### A quién administra
A **nadie**.

### Qué puede hacer
Es el rol con menos superficie funcional además del portero:

- Su pantalla de inicio es **Aprobación de visitas** (`/aprobacion-visitas`).
- Puede **aprobar / rechazar** visitas asignadas a él en sus sedes. Rechazar exige un motivo (1–250 caracteres); una visita ya aprobada no se puede volver a cambiar.
- Ve un **Historial** de visitas propio (`EncargadoVisitaHistorialPage`).
- Puede ser designado como **responsable de una visita** (a diferencia del portero, que no puede serlo), siempre que esté asignado a la sede de la visita.
- **No** accede a los CRUD de Portería (Proveedores, Personas, Motivos, Visitas): las rutas están protegidas por `NonEncargadoVisitaRoute`. Tampoco entra a la sección de Administración.

---

## 6. Portero (`portero`) — Nivel 0

El rol base y operativo del día a día en la portería. Registra el movimiento de personas y visitas en su sede.

### Quién lo administra
Cualquiera de sus superiores, en orden de cercanía: **Encargado de portería → Encargado de seguridad → Admin Empresa → Super Admin**.

### A quién administra
A **nadie**.

### Qué puede hacer
- **Módulo de Portería:** Indicadores, Proveedores, Personas, Motivos de visita, Visitas e Historial de su sede.
- Registra ingresos/salidas y opera las visitas del día.

### Qué NO puede hacer
- No accede a la sección de **Administración** ni a **Aprobación de visitas** (el menú y `EncargadoVisitaGuard` lo bloquean explícitamente).
- **No puede ser responsable de una visita.**
- No administra a ningún usuario.

---

## Referencias en el código

- [`src/common/types/role-hierarchy.ts`](../src/common/types/role-hierarchy.ts): jerarquía de gestión (`getManagedRoles`, `getManagerRoles`) y de aprobación de visitas (`getVisitaApprovalSubordinateRoles`).
- [`src/modules/usuarios-admin/usuarios-admin.service.ts`](../src/modules/usuarios-admin/usuarios-admin.service.ts): reglas de quién puede administrar a quién y validaciones de asignación por sede / empresa de seguridad.
- [`src/modules/visitas/encargado-visita-visitas.service.ts`](../src/modules/visitas/encargado-visita-visitas.service.ts): alcance y decisión de aprobación de visitas.
- [`src/common/guards/encargado-visita.guard.ts`](../src/common/guards/encargado-visita.guard.ts): bloqueo del portero en el módulo de aprobación.
- [`porteria_front/src/utils/auth-access.ts`](../../porteria_front/src/utils/auth-access.ts) y [`role.ts`](../../porteria_front/src/utils/role.ts): acceso a módulos y etiquetas por rol.
- [`porteria_front/src/App.tsx`](../../porteria_front/src/App.tsx) y [`AppShell.tsx`](../../porteria_front/src/components/layout/AppShell.tsx): rutas y menú según rol.
