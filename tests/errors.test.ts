import { describe, it, expect } from 'vitest'
import { extractPosition, getContext, formatError } from '../src/errors'

describe('extractPosition', () => {
  it('extracts position from JSON.parse errors', () => {
    const error = new Error('Unexpected token } in JSON at position 42')
    expect(extractPosition(error)).toBe(42)
  })

  it('extracts position case insensitive', () => {
    const error = new Error('Error at POSITION 123')
    expect(extractPosition(error)).toBe(123)
  })

  it('falls back to line number estimation', () => {
    const error = new Error('Parse error at line 5')
    expect(extractPosition(error)).toBe(320)
  })

  it('returns undefined when no position found', () => {
    const error = new Error('Something went wrong')
    expect(extractPosition(error)).toBeUndefined()
  })

  it('prioritizes position over line format', () => {
    const error = new Error('Error at line 5 at position 100')
    expect(extractPosition(error)).toBe(100)
  })
})

describe('getContext', () => {
  it('extracts context around position', () => {
    const json = '{"name":"John","age":30,"city":"NYC"}'
    const context = getContext(json, 15, 10)
    expect(context).toBe('e":"John","age":30,"')
  })

  it('handles position at boundaries', () => {
    const json = '{"name":"John"}'
    expect(getContext(json, 0, 5)).toBe('{"nam')
    expect(getContext(json, json.length - 1, 5)).toBe('John"}')
  })

  it('returns fallback for invalid positions', () => {
    const json = '{"name":"John"}'
    expect(getContext(json, 1000, 5)).toBe('{"name":"John"}')
    expect(getContext(json, -10, 5)).toBe('{"name":"John"}')
  })

  it('escapes special characters', () => {
    const json = '{"name":"John\nDoe\tTest"}'
    const context = getContext(json, 10, 15)
    expect(context).toContain('\\n')
    expect(context).toContain('\\t')
  })

  it('respects custom radius', () => {
    const json = '0123456789'
    expect(getContext(json, 5, 2)).toBe('3456')
  })
})

describe('formatError', () => {
  it('formats error with position and context', () => {
    const error = new Error('Unexpected token }')
    const formatted = formatError(error, 42, '{"name":"Jo')
    
    expect(formatted).toContain('position 42')
    expect(formatted).toContain('Unexpected token }')
    expect(formatted).toContain('Context:')
    expect(formatted).toContain('{"name":"Jo')
  })

  it('formats error with position only', () => {
    const error = new Error('Unexpected token }')
    const formatted = formatError(error, 42)
    
    expect(formatted).toContain('position 42')
    expect(formatted).not.toContain('Context')
  })

  it('formats error without position', () => {
    const error = new Error('Something failed')
    expect(formatError(error)).toBe('Invalid JSON: Something failed')
  })

  it('handles position 0', () => {
    const error = new Error('Unexpected token')
    const formatted = formatError(error, 0)
    expect(formatted).toContain('position 0')
  })
})
