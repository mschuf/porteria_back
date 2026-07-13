export const TARJETA_ICONOS = [
  "Badge", "BadgeCheck", "Building", "Building2", "CircleUserRound", "Contact",
  "CreditCard", "DoorClosed", "DoorOpen", "Factory", "Fingerprint", "IdCard",
  "KeyRound", "Landmark", "LockKeyhole", "MapPin", "ScanFace", "Shield",
  "ShieldCheck", "Tag", "TicketCheck", "UserRoundCheck", "Warehouse",
] as const;

export type TarjetaIcono = (typeof TARJETA_ICONOS)[number];
