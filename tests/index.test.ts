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

  it('applies reviver function', () => {
    const result = parse('{"date":"2023-01-01"}', {
      reviver: (key, value) => key === 'date' ? new Date(value as string) : value
    })
    expect(result).toHaveProperty('date')
    expect((result as { date: Date }).date).toBeInstanceOf(Date)
  })

  it('deserializes ISO date strings when dates enabled', () => {
    const result = parse('{"createdAt":"2023-01-01T10:00:00Z"}', { dates: true })
    expect(result).toHaveProperty('createdAt')
    expect((result as { createdAt: Date }).createdAt).toBeInstanceOf(Date)
  })

  it('deserializes ISO date strings with milliseconds', () => {
    const result = parse('{"createdAt":"2023-01-01T10:00:00.123Z"}', { dates: true })
    expect(result).toHaveProperty('createdAt')
    expect((result as { createdAt: Date }).createdAt).toBeInstanceOf(Date)
  })

  it('does not deserialize non-date strings when dates enabled', () => {
    const result = parse('{"name":"John","email":"john@example.com"}', { dates: true })
    expect((result as { name: string }).name).toBe('John')
    expect((result as { email: string }).email).toBe('john@example.com')
  })

  it('handles date deserialization with custom reviver', () => {
    const result = parse('{"date":"2023-01-01T10:00:00Z"}', {
      dates: true,
      reviver: (key, value) => key === 'date' && value instanceof Date ? new Date(value.getTime() + 1000) : value
    })
    expect((result as { date: Date }).date).toBeInstanceOf(Date)
  })

  it('does not deserialize dates when dates disabled', () => {
    const result = parse('{"createdAt":"2023-01-01T10:00:00Z"}', { dates: false })
    expect((result as { createdAt: string }).createdAt).toBe('2023-01-01T10:00:00Z')
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

  it('handles circular ref', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    expect(stringify(obj)).toBe('{"a":1,"self":"[Circular]"}')
  })

  it('handles BigInt values', () => {
    expect(stringify({ value: BigInt(123) })).toBe('{"value":"123n"}')
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

  it('omits functions', () => {
    expect(stringify({ fn: () => {}, a: 1 })).toBe('{"a":1}')
  })

  it('omits undefined values', () => {
    expect(stringify({ a: 1, b: undefined })).toBe('{"a":1}')
  })

  it('serializes Date objects to ISO strings when dates enabled', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const result = stringify({ createdAt: date }, { dates: true })
    expect(result).toBe('{"createdAt":"2023-01-01T10:00:00.000Z"}')
  })

  it('serializes Date objects to timestamps when dates is timestamp', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const expectedTimestamp = date.getTime()
    const result = stringify({ createdAt: date }, { dates: 'timestamp' })
    expect(result).toContain('"createdAt":')
    const parsed = JSON.parse(result!)
    expect(typeof parsed.createdAt).toBe('number')
    expect(parsed.createdAt).toBe(expectedTimestamp)
  })

  it('serializes Date objects as ISO strings when dates disabled', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const result = stringify({ createdAt: date }, { dates: false })
    // When dates is false, JSON.stringify handles Date objects (serializes to ISO string)
    expect(result).toContain('"createdAt":"2023-01-01T10:00:00.000Z"')
  })

  it('handles Date objects in arrays', () => {
    const dates = [new Date('2023-01-01T10:00:00Z'), new Date('2023-01-02T10:00:00Z')]
    const result = stringify({ dates }, { dates: true })
    expect(result).toContain('"dates":["2023-01-01T10:00:00.000Z","2023-01-02T10:00:00.000Z"]')
  })

  it('handles Date with custom replacer', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    // Date serialization happens, then custom replacer can modify the string
    const result = stringify({ createdAt: date }, {
      dates: true,
      replacer: (key, value) => key === 'createdAt' && typeof value === 'string' && value.includes('2023') ? 'custom' : value
    })
    // Custom replacer can modify the serialized string
    expect(result).toBe('{"createdAt":"custom"}')
  })
})

describe('tryParse', () => {
  it('works with valid JSON', () => {
    const [result, error] = tryParse('{"a":1}')
    expect(result).toEqual({ a: 1 })
    expect(error).toBe(null)
  })

  it('returns error for invalid JSON', () => {
    const [result, error] = tryParse('invalid')
    expect(result).toBe(null)
    expect(error).toBeInstanceOf(Error)
  })

  it('applies reviver function', () => {
    const [result] = tryParse('{"date":"2023-01-01"}', (key, value) => 
      key === 'date' ? new Date(value as string) : value
    )
    expect(result).toHaveProperty('date')
    expect((result as { date: Date }).date).toBeInstanceOf(Date)
  })

  it('deserializes ISO date strings with dates option', () => {
    const [result] = tryParse('{"createdAt":"2023-01-01T10:00:00Z"}', undefined, true)
    expect((result as { createdAt: Date }).createdAt).toBeInstanceOf(Date)
  })

  it('preserves original error message', () => {
    const [result, error] = tryParse('{"invalid":}')
    expect(result).toBe(null)
    expect(error?.message).toBeTruthy()
    expect(error?.message.length).toBeGreaterThan(0)
  })
})

describe('tryStringify', () => {
  it('works with valid values', () => {
    const [result, error] = tryStringify({ a: 1 })
    expect(result).toBe('{"a":1}')
    expect(error).toBe(null)
  })

  it('handles circular refs', () => {
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

  it('handles BigInt values', () => {
    const [result, error] = tryStringify({ value: BigInt(123) })
    expect(result).toBe('{"value":"123n"}')
    expect(error).toBe(null)
  })

  it('accepts StringifyOptions', () => {
    const [result] = tryStringify({ a: 1 }, { space: 2 })
    expect(result).toBe('{\n  "a": 1\n}')
  })

  it('applies custom replacer via options', () => {
    const [result] = tryStringify(
      { password: 'secret', name: 'John' },
      { replacer: (key, val) => key === 'password' ? '[REDACTED]' : val }
    )
    expect(result).toBe('{"password":"[REDACTED]","name":"John"}')
  })

  it('serializes Date objects with dates option', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const [result] = tryStringify({ createdAt: date }, { dates: true })
    expect(result).toContain('"createdAt":"2023-01-01T10:00:00.000Z"')
  })

  it('handles nested circular refs', () => {
    const a: Record<string, unknown> = { x: 1 }
    const b: Record<string, unknown> = { y: 2 }
    const c: Record<string, unknown> = { z: 3 }
    a.b = b
    b.c = c
    c.a = a
    const [result] = tryStringify(a)
    expect(result).toContain('[Circular]')
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

  it('handles unicode characters', () => {
    expect(isValid('{"emoji":"😀"}')).toBe(true)
    expect(isValid('{"text":"café"}')).toBe(true)
    expect(isValid('{"text":"日本語"}')).toBe(true)
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

describe('schema validation', () => {
  it('validates simple schema', () => {
    const schema = { name: 'string', age: 'number' }
    const result = parse('{"name":"John","age":30}', { schema })
    expect(result).toEqual({ name: 'John', age: 30 })
  })

  it('returns null when schema validation fails', () => {
    const schema = { name: 'string', age: 'number' }
    const result = parse('{"name":"John","age":"30"}', { schema })
    expect(result).toBe(null)
  })

  it('returns default when schema validation fails', () => {
    const schema = { name: 'string', age: 'number' }
    const result = parse('{"name":"John","age":"30"}', { schema, default: {} })
    expect(result).toEqual({})
  })

  it('validates nested schema', () => {
    const schema = {
      name: 'string',
      address: {
        street: 'string',
        zip: 'number'
      }
    }
    const result = parse('{"name":"John","address":{"street":"Main St","zip":12345}}', { schema })
    expect(result).toEqual({ name: 'John', address: { street: 'Main St', zip: 12345 } })
  })

  it('validates array type', () => {
    const schema = { tags: 'array' }
    const result = parse('{"tags":["a","b","c"]}', { schema })
    expect(result).toEqual({ tags: ['a', 'b', 'c'] })
  })

  it('validates boolean type', () => {
    const schema = { active: 'boolean' }
    const result = parse('{"active":true}', { schema })
    expect(result).toEqual({ active: true })
  })

  it('validates object type', () => {
    const schema = { metadata: 'object' }
    const result = parse('{"metadata":{"key":"value"}}', { schema })
    expect(result).toEqual({ metadata: { key: 'value' } })
  })

  it('fails validation for wrong array type', () => {
    const schema = { tags: 'array' }
    const result = parse('{"tags":"not-array"}', { schema })
    expect(result).toBe(null)
  })

  it('fails validation for nested schema errors', () => {
    const schema = {
      name: 'string',
      address: {
        street: 'string',
        zip: 'number'
      }
    }
    const result = parse('{"name":"John","address":{"street":"Main St","zip":"12345"}}', { schema })
    expect(result).toBe(null)
  })

  describe('optional fields', () => {
    it('validates optional field when present', () => {
      const schema = { name: 'string', age: '?number' }
      const result = parse('{"name":"John","age":30}', { schema })
      expect(result).toEqual({ name: 'John', age: 30 })
    })

    it('validates optional field when missing', () => {
      const schema = { name: 'string', age: '?number' }
      const result = parse('{"name":"John"}', { schema })
      expect(result).toEqual({ name: 'John' })
    })

    it('fails validation for wrong optional field type', () => {
      const schema = { name: 'string', age: '?number' }
      const result = parse('{"name":"John","age":"30"}', { schema })
      expect(result).toBe(null)
    })

    it('validates multiple optional fields', () => {
      const schema = { name: 'string', age: '?number', email: '?string' }
      const result = parse('{"name":"John"}', { schema })
      expect(result).toEqual({ name: 'John' })
    })
  })

  describe('array item validation', () => {
    it('validates array of strings', () => {
      const schema = { tags: ['string'] }
      const result = parse('{"tags":["a","b","c"]}', { schema })
      expect(result).toEqual({ tags: ['a', 'b', 'c'] })
    })

    it('validates array of numbers', () => {
      const schema = { scores: ['number'] }
      const result = parse('{"scores":[1,2,3]}', { schema })
      expect(result).toEqual({ scores: [1, 2, 3] })
    })

    it('validates empty array', () => {
      const schema = { tags: ['string'] }
      const result = parse('{"tags":[]}', { schema })
      expect(result).toEqual({ tags: [] })
    })

    it('fails validation for wrong array item type', () => {
      const schema = { tags: ['string'] }
      const result = parse('{"tags":["a",1,"c"]}', { schema })
      expect(result).toBe(null)
    })

    it('validates array of objects', () => {
      const schema = { users: [{ name: 'string', age: 'number' }] }
      const result = parse('{"users":[{"name":"John","age":30},{"name":"Jane","age":25}]}', { schema })
      expect(result).toEqual({ users: [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }] })
    })

    it('fails validation for wrong object in array', () => {
      const schema = { users: [{ name: 'string', age: 'number' }] }
      const result = parse('{"users":[{"name":"John","age":30},{"name":"Jane","age":"25"}]}', { schema })
      expect(result).toBe(null)
    })

    it('validates nested arrays', () => {
      const schema = { matrix: [['number']] }
      const result = parse('{"matrix":[[1,2],[3,4]]}', { schema })
      expect(result).toEqual({ matrix: [[1, 2], [3, 4]] })
    })

    it('fails validation for non-array when array expected', () => {
      const schema = { tags: ['string'] }
      const result = parse('{"tags":"not-array"}', { schema })
      expect(result).toBe(null)
    })
  })
})

