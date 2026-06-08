export function blocks(...values: Array<string | undefined | null | false>): string {
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join('\n\n');
}

export function lines(...values: Array<string | undefined | null | false>): string {
  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .join('\n');
}
