/** Escape user input before embedding it in a RegExp. */
export const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
