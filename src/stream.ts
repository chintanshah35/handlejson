import type { StreamParseOptions, StreamParseResult } from './types'

/**
 * Parse large JSON in chunks. Supports ReadableStream or string input.
 */
export async function parseStream<T = unknown>(
  stream: ReadableStream<Uint8Array> | string,
  options?: StreamParseOptions
): Promise<StreamParseResult<T>> {
  // Browser/Node.js compatibility - ReadableStream and TextDecoder are available globally in modern environments
  const chunkSize = options?.chunkSize ?? 1024 * 1024 // 1MB default
  
  try {
    let text = ''
    
    if (typeof stream === 'string') {
      // Simple string parsing - split into chunks and process
      const chunks = stream.match(new RegExp(`.{1,${chunkSize}}`, 'gs')) || []
      for (const chunk of chunks) {
        text += chunk
        if (options?.onProgress) {
          try {
            const partial = JSON.parse(text)
            options.onProgress(partial)
          } catch {
            // Partial JSON, continue
          }
        }
      }
    } else {
      // ReadableStream processing
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          text += decoder.decode(value, { stream: true })
          
          if (options?.onProgress) {
            try {
              const partial = JSON.parse(text)
              options.onProgress(partial)
            } catch {
              // Partial JSON, continue
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    }
    
    const parsed = JSON.parse(text) as T
    
    return {
      data: parsed,
      error: null,
      complete: true
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    if (options?.onError) {
      options.onError(err)
    }
    return {
      data: null,
      error: err,
      complete: false
    }
  }
}

