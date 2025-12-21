import { describe, it, expect } from 'vitest'
import { 
  parse, 
  stringify, 
  tryParse, 
  tryStringify, 
  isValid, 
  format, 
  minify 
} from '../src/index'

describe('parse', () => {
  it('parses valid JSON', () => {
    expect(parse('{"a":1}')).toEqual({ a: 1 })
    expect(parse('[1,2,3]')).toEqual([1, 2, 3])
    expect(parse('"hello"')).toBe('hello')
    expect(parse('123')).toBe(123)
    expect(parse('true')).toBe(true)
    expect(parse('null')).toBe(null)
  })

  it('returns null for invalid JSON', () => {
    expect(parse('invalid')).toBe(null)
    expect(parse('{a:1}')).toBe(null)
    expect(parse('')).toBe(null)
    expect(parse('undefined')).toBe(null)
  })

  it('returns default value for invalid JSON', () => {
    expect(parse('invalid', { default: {} })).toEqual({})
    expect(parse('invalid', { default: [] })).toEqual([])
    expect(parse('invalid', { default: 'fallback' })).toBe('fallback')
  })

  it('preserves types with generics', () => {
    type User = { name: string; age: number }
    const user = parse<User>('{"name":"John","age":30}')
    expect(user).toEqual({ name: 'John', age: 30 })
  })
})

describe('stringify', () => {
  it('stringifies values', () => {
    expect(stringify({ a: 1 })).toBe('{"a":1}')
    expect(stringify([1, 2, 3])).toBe('[1,2,3]')
    expect(stringify('hello')).toBe('"hello"')
    expect(stringify(123)).toBe('123')
    expect(stringify(true)).toBe('true')
    expect(stringify(null)).toBe('null')
  })

  it('handles circular references', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(stringify(obj)).toBe('{"a":1,"self":"[Circular]"}')
  })

  it('applies custom spacing', () => {
    expect(stringify({ a: 1 }, { space: 2 })).toBe('{\n  "a": 1\n}')
  })

  it('applies custom replacer', () => {
    const result = stringify(
      { password: 'secret', name: 'John' },
      { replacer: (key, val) => key === 'password' ? '[REDACTED]' : val }
    )
    expect(result).toBe('{"password":"[REDACTED]","name":"John"}')
  })
})

describe('tryParse', () => {
  it('returns [result, null] for valid JSON', () => {
    const [result, error] = tryParse('{"a":1}')
    expect(result).toEqual({ a: 1 })
    expect(error).toBe(null)
  })

  it('returns [null, error] for invalid JSON', () => {
    const [result, error] = tryParse('invalid')
    expect(result).toBe(null)
    expect(error).toBeInstanceOf(Error)
  })
})

describe('tryStringify', () => {
  it('returns [result, null] for valid values', () => {
    const [result, error] = tryStringify({ a: 1 })
    expect(result).toBe('{"a":1}')
    expect(error).toBe(null)
  })

  it('handles circular references', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    const [result, error] = tryStringify(obj)
    expect(result).toBe('{"a":1,"self":"[Circular]"}')
    expect(error).toBe(null)
  })

  it('applies spacing', () => {
    const [result] = tryStringify({ a: 1 }, 2)
    expect(result).toBe('{\n  "a": 1\n}')
  })
})

describe('isValid', () => {
  it('returns true for valid JSON', () => {
    expect(isValid('{"a":1}')).toBe(true)
    expect(isValid('[1,2,3]')).toBe(true)
    expect(isValid('"hello"')).toBe(true)
    expect(isValid('123')).toBe(true)
    expect(isValid('true')).toBe(true)
    expect(isValid('null')).toBe(true)
  })

  it('returns false for invalid JSON', () => {
    expect(isValid('invalid')).toBe(false)
    expect(isValid('{a:1}')).toBe(false)
    expect(isValid('')).toBe(false)
    expect(isValid('undefined')).toBe(false)
    expect(isValid("{'a':1}")).toBe(false)
  })
})

describe('format', () => {
  it('formats objects with default spacing', () => {
    expect(format({ a: 1 })).toBe('{\n  "a": 1\n}')
  })

  it('formats with custom spacing', () => {
    expect(format({ a: 1 }, 4)).toBe('{\n    "a": 1\n}')
    expect(format({ a: 1 }, { space: 4 })).toBe('{\n    "a": 1\n}')
  })

  it('formats JSON strings', () => {
    expect(format('{"a":1}')).toBe('{\n  "a": 1\n}')
  })

  it('returns null for invalid JSON strings', () => {
    expect(format('invalid')).toBe(null)
  })
})

describe('minify', () => {
  it('minifies objects', () => {
    expect(minify({ a: 1, b: 2 })).toBe('{"a":1,"b":2}')
  })

  it('minifies JSON strings', () => {
    expect(minify('{\n  "a": 1,\n  "b": 2\n}')).toBe('{"a":1,"b":2}')
  })

  it('returns null for invalid JSON strings', () => {
    expect(minify('invalid')).toBe(null)
  })
})

