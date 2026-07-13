/** Clave usada para comparar nombres de área sin distinguir tildes, mayúsculas o espacios repetidos. */
export function normalizeAreaName(value: string): string {
  return value
    .trim()
    .normalize("NFC")
    .toLocaleLowerCase("es")
    .replace(/[áéíóúüñ]/g, (character) => ({
      á: "a",
      é: "e",
      í: "i",
      ó: "o",
      ú: "u",
      ü: "u",
      ñ: "n",
    })[character] ?? character)
    .replace(/\s+/g, " ");
}
