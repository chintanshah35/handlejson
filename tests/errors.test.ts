import { describe, it, expect } from 'vitest'
import { extractPosition, getContext, formatError } from '../src/errors'

describe('extractPosition', () => {
  it('extracts position from standard JSON.parse error', () => {
    const error = new Error('Unexpected token } in JSON at position 42')
    expect(extractPosition(error)).toBe(42)
  })

  it('extracts position with case insensitive match', () => {
    const error = new Error('Error at POSITION 123')
    expect(extractPosition(error)).toBe(123)
  })

  it('extracts position from line format', () => {
    const error = new Error('Parse error at line 5')
    expect(extractPosition(error)).toBe(320)
  })

  it('extracts position from line format case insensitive', () => {
    const error = new Error('Error at LINE 3')
    expect(extractPosition(error)).toBe(160)
  })

  it('returns undefined for errors without position', () => {
    const error = new Error('Something went wrong')
    expect(extractPosition(error)).toBeUndefined()
  })

  it('handles error with empty message', () => {
    const error = new Error()
    expect(extractPosition(error)).toBeUndefined()
  })

  it('handles error with null message property', () => {
    const error = { message: null } as unknown as Error
    expect(extractPosition(error)).toBeUndefined()
  })

  it('handles error with undefined message property', () => {
    const error = { message: undefined } as unknown as Error
    expect(extractPosition(error)).toBeUndefined()
  })

  it('prioritizes position over line format', () => {
    const error = new Error('Error at line 5 at position 100')
    expect(extractPosition(error)).toBe(100)
  })
})

describe('getContext', () => {
  it('extracts context around position with default radius', () => {
    const json = '{"name":"John","age":30,"city":"NYC"}'
    const context = getContext(json, 15, 10)
    expect(context).toBe('e":"John","age":30,"')
  })

  it('extracts context at start of string', () => {
    const json = '{"name":"John"}'
    const context = getContext(json, 0, 5)
    expect(context).toBe('{"nam')
  })

  it('extracts context at end of string', () => {
    const json = '{"name":"John"}'
    const context = getContext(json, json.length - 1, 5)
    expect(context).toBe('John"}')
  })

  it('handles position beyond string length', () => {
    const json = '{"name":"John"}'
    const context = getContext(json, 1000, 5)
    expect(context).toBe('{"name":"John"}')
  })

  it('handles negative position', () => {
    const json = '{"name":"John"}'
    const context = getContext(json, -10, 5)
    expect(context).toBe('{"name":"John"}')
  })

  it('escapes newline characters', () => {
    const json = '{"name":"John\nDoe"}'
    const context = getContext(json, 10, 10)
    expect(context).toContain('\\n')
    expect(context).not.toContain('\n')
  })

  it('escapes carriage return characters', () => {
    const json = '{"name":"John\rDoe"}'
    const context = getContext(json, 10, 10)
    expect(context).toContain('\\r')
    expect(context).not.toContain('\r')
  })

  it('escapes tab characters', () => {
    const json = '{"name":"John\tDoe"}'
    const context = getContext(json, 10, 10)
    expect(context).toContain('\\t')
    expect(context).not.toContain('\t')
  })

  it('handles empty string', () => {
    const json = ''
    const context = getContext(json, 0, 5)
    expect(context).toBe('')
  })

  it('respects custom radius', () => {
    const json = '0123456789'
    const context = getContext(json, 5, 2)
    expect(context).toBe('3456')
  })

  it('handles very long strings efficiently', () => {
    const json = 'a'.repeat(10000)
    const context = getContext(json, 5000, 10)
    expect(context.length).toBe(20)
  })

  it('handles position at exact string length', () => {
    const json = '{"name":"John"}'
    const context = getContext(json, json.length, 5)
    expect(context).toBe('{"name":"John"}')
  })
})

describe('formatError', () => {
  it('formats error with position and context', () => {
    const error = new Error('Unexpected token }')
    const formatted = formatError(error, 42, '{"name":"Jo')
    expect(formatted).toContain('position 42')
    expect(formatted).toContain('Unexpected token }')
    expect(formatted).toContain('{"name":"Jo')
    expect(formatted).toContain('Context:')
  })

  it('formats error with position only', () => {
    const error = new Error('Unexpected token }')
    const formatted = formatError(error, 42)
    expect(formatted).toContain('position 42')
    expect(formatted).toContain('Unexpected token }')
    expect(formatted).not.toContain('Context')
  })

  it('formats error without position or context', () => {
    const error = new Error('Something failed')
    const formatted = formatError(error)
    expect(formatted).toBe('Invalid JSON: Something failed')
  })

  it('handles error with empty message', () => {
    const error = new Error()
    const formatted = formatError(error)
    expect(formatted).toBe('Invalid JSON: ')
  })

  it('handles error with null message property', () => {
    const error = { message: null } as unknown as Error
    const formatted = formatError(error)
    expect(formatted).toBe('Invalid JSON: Unknown error')
  })

  it('handles error with undefined message property', () => {
    const error = { message: undefined } as unknown as Error
    const formatted = formatError(error)
    expect(formatted).toBe('Invalid JSON: Unknown error')
  })

  it('formats error with position 0', () => {
    const error = new Error('Unexpected token')
    const formatted = formatError(error, 0)
    expect(formatted).toContain('position 0')
  })

  it('formats error with empty context string', () => {
    const error = new Error('Parse error')
    const formatted = formatError(error, 10, '')
    expect(formatted).toContain('position 10')
    expect(formatted).not.toContain('Context')
  })

  it('includes all parts when position and context provided', () => {
    const error = new Error('Invalid JSON')
    const formatted = formatError(error, 25, 'sample context')
    expect(formatted).toMatch(/Invalid JSON at position 25: Invalid JSON\nContext: \.\.\.sample context\.\.\./)
  })
})
