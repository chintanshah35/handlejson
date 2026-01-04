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
})

