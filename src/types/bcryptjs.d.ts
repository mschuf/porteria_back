declare module "bcryptjs" {
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hashSync(data: string, saltOrRounds?: string | number): string;
}
