export function errorMessage(
  error: unknown,
  fallback = 'Não foi possível falar com a planilha.',
): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
