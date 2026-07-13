/**
 * @file authenticated-user.ts
 * @description Tipos del usuario autenticado, perfil de sesión y payload JWT.
 */

/** Rol funcional del usuario en Portería. */
export type UserRole = "super_admin" | "admin_empresa" | "portero";

/**
 * Identidad mínima del usuario extraída del JWT o sesión.
 */
export interface AuthenticatedUser {
  id: number;
  role: UserRole;
  sedeId: number | null;
}

/**
 * Perfil enriquecido del usuario obtenido desde la tabla `usuario`.
 */
export interface UserProfile {
  login: string;
  name: string;
  email: string | null;
  sedeName: string | null;
  empresaName: string | null;
  empresaPorteriaName: string | null;
}

/**
 * Claims del token JWT de acceso.
 */
export interface JwtPayload {
  sub: number;
  role: UserRole;
  sedeId: number | null;
  iat?: number;
  exp?: number;
}

/** Usuario de sesión con identidad y perfil combinados. */
export type SessionUser = AuthenticatedUser & UserProfile;
