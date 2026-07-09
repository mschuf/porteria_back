/**
 * @file glpi.constants.ts
 * @description Constantes de cabeceras HTTP, endpoints REST, estados y campos de búsqueda de GLPI.
 */
export const GLPI_HEADERS = {
  APP_TOKEN: "App-Token",
  SESSION_TOKEN: "Session-Token",
  AUTHORIZATION: "Authorization",
  CONTENT_TYPE: "Content-Type",
  CONTENT_RANGE: "Content-Range",
  RANGE: "Range",
} as const;

export const GLPI_ENDPOINTS = {
  INIT_SESSION: "initSession",
  KILL_SESSION: "killSession",
  GET_MY_PROFILES: "getMyProfiles",
  GET_FULL_SESSION: "getFullSession",
  USER: "User",
  USER_EMAIL: "UserEmail",
  USER_TITLE: "UserTitle",
  GROUP: "Group",
  GROUP_USER: "Group_User",
  PROFILE: "Profile",
  PROFILE_USER: "Profile_User",
  LOCATION: "Location",
  ENTITY: "Entity",
  ITIL_CATEGORY: "ITILCategory",
  DOCUMENT: "Document",
  DOCUMENT_ITEM: "Document_Item",
  SEARCH: "search",
} as const;
