import { describe, it, expect } from 'vitest'
import { parseStream } from '../src/stream'

describe('parseStream', () => {
  it('parses string input', async () => {
    const result = await parseStream('{"name":"John","age":30}')
    expect(result.complete).toBe(true)
    expect(result.error).toBe(null)
    expect(result.data).toEqual({ name: 'John', age: 30 })
  })

  it('handles invalid JSON in string input', async () => {
    const result = await parseStream('invalid json')
    expect(result.complete).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
    expect(result.data).toBe(null)
  })

  it('calls onProgress callback', async () => {
    const progress: unknown[] = []
    const result = await parseStream('{"name":"John","age":30}', {
      onProgress: (parsed) => progress.push(parsed)
    })
    expect(result.complete).toBe(true)
    expect(progress.length).toBeGreaterThan(0)
  })

  it('calls onError callback on parse error', async () => {
    let errorCallback: Error | null = null
    const result = await parseStream('invalid', {
      onError: (error) => {
        errorCallback = error
      }
    })
    expect(result.complete).toBe(false)
    expect(errorCallback).toBeInstanceOf(Error)
  })

  it('handles empty string', async () => {
    const result = await parseStream('')
    expect(result.complete).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
  })

  it('handles large JSON strings', async () => {
    const largeObj = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i })) }
    const jsonString = JSON.stringify(largeObj)
    const result = await parseStream(jsonString)
    expect(result.complete).toBe(true)
    expect(result.data).toEqual(largeObj)
  })

  it('handles nested objects', async () => {
    const nested = { user: { name: 'John', address: { city: 'NYC' } } }
    const result = await parseStream(JSON.stringify(nested))
    expect(result.complete).toBe(true)
    expect(result.data).toEqual(nested)
  })

  it('handles arrays', async () => {
    const array = [1, 2, 3, { name: 'test' }]
    const result = await parseStream(JSON.stringify(array))
    expect(result.complete).toBe(true)
    expect(result.data).toEqual(array)
  })

  it('handles empty object', async () => {
    const result = await parseStream('{}')
    expect(result.complete).toBe(true)
    expect(result.data).toEqual({})
  })

  it('handles empty array', async () => {
    const result = await parseStream('[]')
    expect(result.complete).toBe(true)
    expect(result.data).toEqual([])
  })

  it('handles null value', async () => {
    const result = await parseStream('null')
    expect(result.complete).toBe(true)
    expect(result.data).toBe(null)
  })

  it('handles primitive values', async () => {
    expect((await parseStream('"string"')).data).toBe('string')
    expect((await parseStream('123')).data).toBe(123)
    expect((await parseStream('true')).data).toBe(true)
    expect((await parseStream('false')).data).toBe(false)
  })

  it('handles unicode characters', async () => {
    const result = await parseStream('{"emoji":"😀","text":"café"}')
    expect(result.complete).toBe(true)
    expect(result.data).toEqual({ emoji: '😀', text: 'café' })
  })

  it('handles special characters', async () => {
    const result = await parseStream('{"text":"line1\\nline2"}')
    expect(result.complete).toBe(true)
    expect((result.data as { text: string }).text).toBe('line1\nline2')
  })

  it('handles deeply nested structures', async () => {
    const deep = { a: { b: { c: { d: { e: 1 } } } } }
    const result = await parseStream(JSON.stringify(deep))
    expect(result.complete).toBe(true)
    expect(result.data).toEqual(deep)
  })

  it('handles arrays with mixed types', async () => {
    const array = [1, 'two', true, null, {}]
    const result = await parseStream(JSON.stringify(array))
    expect(result.complete).toBe(true)
    expect(result.data).toEqual(array)
  })

  it('handles custom chunk size', async () => {
    const largeObj = { items: Array.from({ length: 100 }, (_, i) => ({ id: i })) }
    const jsonString = JSON.stringify(largeObj)
    const result = await parseStream(jsonString, { chunkSize: 100 })
    expect(result.complete).toBe(true)
    expect(result.data).toEqual(largeObj)
  })

  it('calls onProgress multiple times for large input', async () => {
    const progress: unknown[] = []
    const largeObj = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i })) }
    const jsonString = JSON.stringify(largeObj)
    await parseStream(jsonString, {
      chunkSize: 100,
      onProgress: (parsed) => progress.push(parsed)
    })
    expect(progress.length).toBeGreaterThan(0)
  })

  it('handles malformed JSON in chunks', async () => {
    const result = await parseStream('{"name":"John", invalid}', {
      chunkSize: 10
    })
    expect(result.complete).toBe(false)
    expect(result.error).toBeInstanceOf(Error)
  })

  it('handles ReadableStream input', async () => {
    const json = '{"name":"John","age":30}'
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(json))
        controller.close()
      }
    })
    
    const result = await parseStream(stream)
    expect(result.complete).toBe(true)
    expect(result.data).toEqual({ name: 'John', age: 30 })
  })

  it('handles ReadableStream with multiple chunks', async () => {
    const json = '{"name":"John","age":30}'
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('{"name":"John"'))
        controller.enqueue(encoder.encode(',"age":30}'))
        controller.close()
      }
    })
    
    const result = await parseStream(stream)
    expect(result.complete).toBe(true)
    expect(result.data).toEqual({ name: 'John', age: 30 })
  })

  it('calls onError callback for ReadableStream errors', async () => {
    let errorCallback: Error | null = null
    const stream = new ReadableStream({
      start(controller) {
        controller.error(new Error('Stream error'))
      }
    })
    
    const result = await parseStream(stream, {
      onError: (error) => {
        errorCallback = error
      }
    })
    expect(result.complete).toBe(false)
    expect(errorCallback).toBeInstanceOf(Error)
  })

  it('handles ReadableStream with onProgress', async () => {
    const progress: unknown[] = []
    const json = '{"name":"John","age":30}'
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode(json))
        controller.close()
      }
    })
    
    const result = await parseStream(stream, {
      onProgress: (parsed) => progress.push(parsed)
    })
    expect(result.complete).toBe(true)
  })

  it('handles very large JSON strings', async () => {
    const largeObj = { data: 'x'.repeat(10000) }
    const jsonString = JSON.stringify(largeObj)
    const result = await parseStream(jsonString)
    expect(result.complete).toBe(true)
    expect((result.data as { data: string }).data.length).toBe(10000)
  })

  it('handles nested arrays in stream', async () => {
    const nested = { matrix: [[1, 2], [3, 4]] }
    const result = await parseStream(JSON.stringify(nested))
    expect(result.complete).toBe(true)
    expect(result.data).toEqual(nested)
  })

  it('handles complex nested structures', async () => {
    const complex = {
      users: [
        { name: 'John', age: 30, tags: ['admin'] },
        { name: 'Jane', age: 25, tags: ['user'] }
      ]
    }
    const result = await parseStream(JSON.stringify(complex))
    expect(result.complete).toBe(true)
    expect(result.data).toEqual(complex)
  })
})

