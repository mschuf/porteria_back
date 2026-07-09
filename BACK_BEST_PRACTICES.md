# Porteria Backend - Buenas practicas

## Seguridad y autenticacion

- Usar JWT en todos los endpoints protegidos con `JwtAuthGuard`.
- Cuando el token expira, responder 401 con codigo estable de autenticacion.
- Login local/LDAP: `POST /auth/login` con `username` y credencial cifrada.
- No usar registro publico en este proyecto.

## GLPI

- Mantener la integracion GLPI en `modules/glpi/`.
- Usar cuenta de servicio (`GLPI_CATALOG_BOOTSTRAP_*`) solo para catalogos y usuarios.

## Calidad de codigo

- Validar DTOs con `class-validator` y `ValidationPipe` global.
- Centralizar errores de negocio en `BusinessException`.
- No usar `synchronize=true`.

## Modulo IA

- El modulo `ai/` es scaffold: `GET /ai/health` operativo, `POST /ai/chat` reservado.

## Documentacion en codigo

- Todo archivo `.ts` de logica debe iniciar con cabecera `@file` y `@description` en espanol.
- Toda funcion y metodo publico o privado debe tener JSDoc en espanol con `@param`, `@returns` y `@throws` cuando aplique.
- No duplicar texto de Swagger (`@ApiOperation`, `@ApiProperty`); complementar con contexto de negocio.
- En archivos grandes, usar JSDoc conciso.
