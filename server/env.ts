export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada.`)
  }
  return value
}

export function envOrNull(name: string): string | null {
  const value = process.env[name]
  return value ? value : null
}
