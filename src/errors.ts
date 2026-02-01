export function extractPosition(error: Error): number | undefined {
  const message = error?.message ?? ''
  
  // Try to extract position from SyntaxError message
  // JSON.parse error format: "Unexpected token X in JSON at position Y"
  const positionMatch = message.match(/position (\d+)/i)
  if (positionMatch?.[1]) {
    return parseInt(positionMatch?.[1], 10)
  }
  
  // Try to extract from "at line X column Y" format
  const lineMatch = message.match(/line (\d+)/i)
  if (lineMatch?.[1]) {
    // Approximate position (not exact, but better than nothing)
    const line = parseInt(lineMatch[1], 10)
    return (line - 1) * 80 // Rough estimate
  }
  
  return undefined
}

export function getContext(json: string, position: number, radius = 20): string {
  if (position < 0 || position >= json.length) {
    return json.slice(0, Math.min(json.length, 50))
  }
  
  const start = Math.max(0, position - radius)
  const end = Math.min(json.length, position + radius)
  
  return json.slice(start, end)
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

export function formatError(
  error: Error,
  position?: number,
  context?: string
): string {
  const baseMessage = error?.message ?? 'Unknown error'
  
  if (position !== undefined && context) {
    return `Invalid JSON at position ${position}: ${baseMessage}\nContext: ...${context}...`
  }
  
  if (position !== undefined) {
    return `Invalid JSON at position ${position}: ${baseMessage}`
  }
  
  return `Invalid JSON: ${baseMessage}`
}
