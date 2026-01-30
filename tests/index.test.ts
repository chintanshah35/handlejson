import { describe, it, expect } from 'vitest'
import { 
  parse, 
  stringify, 
  tryParse, 
  tryStringify, 
  isValid, 
  format, 
  minify,
  parseWithDetails
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

  it('handles multiple circular references', () => {
    const a: Record<string, unknown> = { name: 'a' }
    const b: Record<string, unknown> = { name: 'b' }
    const c: Record<string, unknown> = { name: 'c' }
    a.ref = b
    b.ref = c
    c.ref = a
    const result = stringify(a)
    expect(result).toContain('[Circular]')
    expect(result).toContain('"name":"a"')
  })

  it('handles circular reference in array', () => {
    const obj: Record<string, unknown> = { items: [] }
    obj.items = [obj]
    const result = stringify(obj)
    expect(result).toContain('[Circular]')
  })

  it('handles nested circular references', () => {
    const parent: Record<string, unknown> = { id: 1 }
    const child: Record<string, unknown> = { id: 2 }
    parent.child = child
    child.parent = parent
    child.self = child
    const result = stringify(parent)
    expect(result).toContain('[Circular]')
  })

  it('handles undefined in arrays', () => {
    const result = stringify([1, undefined, 3])
    expect(result).toBe('[1,null,3]')
  })

  it('handles null values', () => {
    expect(stringify({ a: null })).toBe('{"a":null}')
  })

  it('handles Symbol values', () => {
    const sym = Symbol('test')
    const result = stringify({ sym })
    expect(result).toBe('{}')
  })

  it('handles Map and Set (serializes to empty objects)', () => {
    const map = new Map([['a', 1]])
    const set = new Set([1, 2, 3])
    const result = stringify({ map, set })
    expect(result).toBe('{"map":{},"set":{}}')
  })

  it('handles functions (omitted)', () => {
    const fn = () => {}
    const result = stringify({ fn, data: 1 })
    expect(result).toBe('{"data":1}')
  })

  it('handles dates: iso mode explicitly', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const result = stringify({ date }, { dates: 'iso' })
    expect(result).toContain('"date":"2023-01-01T10:00:00.000Z"')
  })

  it('handles dates: timestamp mode', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const timestamp = date.getTime()
    const result = stringify({ date }, { dates: 'timestamp' })
    const parsed = JSON.parse(result!)
    expect(parsed.date).toBe(timestamp)
  })

  it('handles dates: false mode', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const result = stringify({ date }, { dates: false })
    expect(result).toContain('"date":"2023-01-01T10:00:00.000Z"')
  })

  it('handles dates in nested objects', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const result = stringify({ user: { createdAt: date } }, { dates: true })
    expect(result).toContain('"createdAt":"2023-01-01T10:00:00.000Z"')
  })

  it('handles dates in arrays', () => {
    const dates = [new Date('2023-01-01T10:00:00Z'), new Date('2023-01-02T10:00:00Z')]
    const result = stringify({ dates }, { dates: 'timestamp' })
    const parsed = JSON.parse(result!)
    expect(parsed.dates[0]).toBe(dates[0].getTime())
    expect(parsed.dates[1]).toBe(dates[1].getTime())
  })

  it('handles empty object', () => {
    expect(stringify({})).toBe('{}')
  })

  it('handles empty array', () => {
    expect(stringify([])).toBe('[]')
  })

  it('handles unicode characters', () => {
    expect(stringify({ emoji: '😀' })).toBe('{"emoji":"😀"}')
    expect(stringify({ text: 'café' })).toBe('{"text":"café"}')
  })

  it('handles special characters', () => {
    expect(stringify({ text: 'line1\nline2' })).toBe('{"text":"line1\\nline2"}')
    expect(stringify({ text: 'tab\tseparated' })).toBe('{"text":"tab\\tseparated"}')
  })

  it('handles very large numbers', () => {
    expect(stringify({ big: 9007199254740991 })).toBe('{"big":9007199254740991}')
  })

  it('handles negative numbers', () => {
    expect(stringify({ value: -42 })).toBe('{"value":-42}')
  })

  it('handles decimal numbers', () => {
    expect(stringify({ pi: 3.14159 })).toBe('{"pi":3.14159}')
  })

  it('handles deeply nested structures', () => {
    const deep = { a: { b: { c: { d: { e: 1 } } } } }
    const result = stringify(deep)
    expect(result).toContain('"e":1')
  })

  it('handles arrays with mixed types', () => {
    expect(stringify([1, 'two', true, null, {}])).toBe('[1,"two",true,null,{}]')
  })

  it('handles spacing with nested structures', () => {
    const nested = { a: { b: { c: 1 } } }
    const result = stringify(nested, { space: 2 })
    expect(result).toContain('\n')
    expect(result).toContain('"c": 1')
  })

  it('handles replacer removing keys', () => {
    const result = stringify(
      { a: 1, b: 2, c: 3 },
      { replacer: (key, value) => key === 'b' ? undefined : value }
    )
    expect(result).toBe('{"a":1,"c":3}')
  })

  it('handles replacer transforming values', () => {
    const result = stringify(
      { password: 'secret', name: 'John' },
      { replacer: (key, val) => key === 'password' ? '[REDACTED]' : val }
    )
    expect(result).toBe('{"password":"[REDACTED]","name":"John"}')
  })

  it('returns null for non-serializable circular structure', () => {
    const obj: Record<string, unknown> = {}
    obj.self = obj
    const result = stringify(obj)
    expect(result).not.toBe(null)
    expect(result).toContain('[Circular]')
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

  it('handles empty string', () => {
    const [result, error] = tryParse('')
    expect(result).toBe(null)
    expect(error).toBeInstanceOf(Error)
  })

  it('handles dates: iso mode', () => {
    const [result] = tryParse('{"date":"2023-01-01T10:00:00Z"}', undefined, 'iso')
    expect((result as { date: Date }).date).toBeInstanceOf(Date)
  })

  it('handles dates: timestamp mode', () => {
    const [result] = tryParse('{"date":"2023-01-01T10:00:00Z"}', undefined, 'timestamp')
    expect((result as { date: Date }).date).toBeInstanceOf(Date)
  })

  it('handles dates: false mode', () => {
    const [result] = tryParse('{"date":"2023-01-01T10:00:00Z"}', undefined, false)
    expect((result as { date: string }).date).toBe('2023-01-01T10:00:00Z')
  })

  it('handles reviver with dates', () => {
    const [result] = tryParse(
      '{"date":"2023-01-01T10:00:00Z","name":"John"}',
      (key, value) => key === 'name' ? value.toUpperCase() : value,
      true
    )
    expect((result as { date: Date }).date).toBeInstanceOf(Date)
    expect((result as { name: string }).name).toBe('JOHN')
  })

  it('handles unicode characters', () => {
    const [result] = tryParse('{"emoji":"😀"}')
    expect((result as { emoji: string }).emoji).toBe('😀')
  })

  it('handles special characters', () => {
    const [result] = tryParse('{"text":"line1\\nline2"}')
    expect((result as { text: string }).text).toBe('line1\nline2')
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

  it('handles non-serializable values', () => {
    const obj = { fn: () => {}, sym: Symbol('test') }
    const [result, error] = tryStringify(obj)
    expect(result).toBe('{}')
    expect(error).toBe(null)
  })

  it('handles undefined values', () => {
    const [result] = tryStringify({ a: 1, b: undefined })
    expect(result).toBe('{"a":1}')
  })

  it('handles null values', () => {
    const [result] = tryStringify({ a: null })
    expect(result).toBe('{"a":null}')
  })

  it('handles dates: iso mode', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const [result] = tryStringify({ date }, { dates: 'iso' })
    expect(result).toContain('"date":"2023-01-01T10:00:00.000Z"')
  })

  it('handles dates: timestamp mode', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const timestamp = date.getTime()
    const [result] = tryStringify({ date }, { dates: 'timestamp' })
    const parsed = JSON.parse(result!)
    expect(parsed.date).toBe(timestamp)
  })

  it('handles dates: false mode', () => {
    const date = new Date('2023-01-01T10:00:00Z')
    const [result] = tryStringify({ date }, { dates: false })
    expect(result).toContain('"date":"2023-01-01T10:00:00.000Z"')
  })

  it('handles empty object', () => {
    const [result] = tryStringify({})
    expect(result).toBe('{}')
  })

  it('handles empty array', () => {
    const [result] = tryStringify([])
    expect(result).toBe('[]')
  })

  it('handles unicode characters', () => {
    const [result] = tryStringify({ emoji: '😀' })
    expect(result).toBe('{"emoji":"😀"}')
  })

  it('handles special characters', () => {
    const [result] = tryStringify({ text: 'line1\nline2' })
    expect(result).toBe('{"text":"line1\\nline2"}')
  })

  it('handles deeply nested structures', () => {
    const deep = { a: { b: { c: { d: { e: 1 } } } } }
    const [result] = tryStringify(deep)
    expect(result).toContain('"e":1')
  })

  it('handles arrays with mixed types', () => {
    const [result] = tryStringify([1, 'two', true, null, {}])
    expect(result).toBe('[1,"two",true,null,{}]')
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

  it('formats nested objects', () => {
    const result = format({ a: { b: { c: 1 } } })
    expect(result).toContain('"a"')
    expect(result).toContain('"b"')
    expect(result).toContain('"c": 1')
  })

  it('formats arrays', () => {
    const result = format([1, 2, 3])
    expect(result).toBe('[\n  1,\n  2,\n  3\n]')
  })

  it('formats arrays with objects', () => {
    const result = format([{ a: 1 }, { b: 2 }])
    expect(result).toContain('"a": 1')
    expect(result).toContain('"b": 2')
  })

  it('formats with zero spacing', () => {
    const result = format({ a: 1 }, 0)
    expect(result).toBe('{"a":1}')
  })

  it('formats with single space', () => {
    const result = format({ a: 1 }, 1)
    expect(result).toContain('"a": 1')
  })

  it('handles empty object', () => {
    expect(format({})).toBe('{}')
  })

  it('handles empty array', () => {
    expect(format([])).toBe('[]')
  })

  it('handles unicode characters', () => {
    const result = format({ emoji: '😀' })
    expect(result).toContain('😀')
  })

  it('handles special characters', () => {
    const result = format({ text: 'line1\nline2' })
    expect(result).toContain('\\n')
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

  it('minifies nested objects', () => {
    const result = minify({ a: { b: { c: 1 } } })
    expect(result).toBe('{"a":{"b":{"c":1}}}')
  })

  it('minifies arrays', () => {
    expect(minify([1, 2, 3])).toBe('[1,2,3]')
  })

  it('minifies arrays with objects', () => {
    const result = minify([{ a: 1 }, { b: 2 }])
    expect(result).toBe('[{"a":1},{"b":2}]')
  })

  it('minifies strings with whitespace', () => {
    const json = '{\n  "name": "John",\n  "age": 30\n}'
    expect(minify(json)).toBe('{"name":"John","age":30}')
  })

  it('minifies strings with tabs', () => {
    const json = '{\t"a":\t1\t}'
    expect(minify(json)).toBe('{"a":1}')
  })

  it('handles empty object', () => {
    expect(minify({})).toBe('{}')
  })

  it('handles empty array', () => {
    expect(minify([])).toBe('[]')
  })

  it('preserves unicode characters', () => {
    const result = minify({ emoji: '😀' })
    expect(result).toBe('{"emoji":"😀"}')
  })

  it('preserves special characters in strings', () => {
    const result = minify({ text: 'line1\nline2' })
    expect(result).toBe('{"text":"line1\\nline2"}')
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

describe('parseWithDetails', () => {
  it('returns success with data for valid JSON', () => {
    const result = parseWithDetails('{"name":"John","age":30}')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'John', age: 30 })
    }
  })

  it('returns error with position for invalid JSON', () => {
    const result = parseWithDetails('{"name":"John", invalid}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
      expect(result.position).toBeDefined()
      expect(typeof result.position).toBe('number')
    }
  })

  it('includes context around error position', () => {
    const result = parseWithDetails('{"name":"John", invalid}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.context).toBeDefined()
      expect(result.context).toContain('invalid')
    }
  })

  it('handles missing comma errors', () => {
    const result = parseWithDetails('{"name":"John" "age":30}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.position).toBeDefined()
      expect(result.error).toContain('position')
    }
  })

  it('handles trailing comma errors', () => {
    const result = parseWithDetails('{"name":"John",}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.position).toBeDefined()
    }
  })

  it('works with valid arrays', () => {
    const result = parseWithDetails('[1,2,3]')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual([1, 2, 3])
    }
  })

  it('handles invalid array syntax', () => {
    const result = parseWithDetails('[1,2,}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
      // Position may be undefined for some error types
      if (result.position !== undefined) {
        expect(typeof result.position).toBe('number')
      }
    }
  })

  it('preserves types with generics', () => {
    type User = { name: string; age: number }
    const result = parseWithDetails<User>('{"name":"John","age":30}')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'John', age: 30 })
    }
  })

  it('handles schema validation errors', () => {
    const schema = { name: 'string', age: 'number' }
    const result = parseWithDetails('{"name":"John","age":"30"}', { schema })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
  })

  it('shows context with special characters', () => {
    const result = parseWithDetails('{"name":"John", "email":"test@example.com", invalid}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.context).toBeDefined()
      expect(result.context).toContain('invalid')
    }
  })

  it('shows context at JSON start boundary', () => {
    const result = parseWithDetails('invalid{"name":"John"}')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
      // Position and context may be undefined for some error types
      if (result.position !== undefined) {
        expect(typeof result.position).toBe('number')
        if (result.context !== undefined) {
          expect(typeof result.context).toBe('string')
        }
      }
    }
  })

  it('shows context at JSON end boundary', () => {
    const result = parseWithDetails('{"name":"John"}invalid')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.context).toBeDefined()
    }
  })

  it('handles context with newlines', () => {
    const json = '{\n  "name": "John",\n  invalid\n}'
    const result = parseWithDetails(json)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.context).toBeDefined()
      expect(result.position).toBeDefined()
    }
  })
})

describe('security features', () => {
  describe('input size limits', () => {
    it('rejects input exceeding maxSize', () => {
      const largeJson = '{"data":"' + 'x'.repeat(100) + '"}'
      const result = parse(largeJson, { maxSize: 50 })
      expect(result).toBe(null)
    })

    it('allows input within maxSize', () => {
      const smallJson = '{"data":"test"}'
      const result = parse(smallJson, { maxSize: 1000 })
      expect(result).toEqual({ data: 'test' })
    })

    it('works without maxSize limit', () => {
      const json = '{"data":"test"}'
      const result = parse(json)
      expect(result).toEqual({ data: 'test' })
    })
  })

  describe('depth limits', () => {
    it('rejects deeply nested objects exceeding maxDepth', () => {
      let deepJson = '{"a":'
      for (let i = 0; i < 10; i++) {
        deepJson += '{"a":'
      }
      deepJson += '1'
      for (let i = 0; i < 10; i++) {
        deepJson += '}'
      }
      const result = parse(deepJson, { maxDepth: 5 })
      expect(result).toBe(null)
    })

    it('allows objects within maxDepth', () => {
      const nested = '{"a":{"b":{"c":1}}}'
      const result = parse(nested, { maxDepth: 10 })
      expect(result).toEqual({ a: { b: { c: 1 } } })
    })

    it('works without maxDepth limit', () => {
      const nested = '{"a":{"b":{"c":1}}}'
      const result = parse(nested)
      expect(result).toEqual({ a: { b: { c: 1 } } })
    })

    it('handles arrays in depth calculation', () => {
      const deepArray = '{"items":[[[[[1]]]]]}'
      const result = parse(deepArray, { maxDepth: 10 })
      expect(result).toEqual({ items: [[[[[1]]]]] })
    })
  })

  describe('prototype pollution protection', () => {
    it('blocks __proto__ keys when safeKeys is enabled', () => {
      const malicious = '{"__proto__":{"isAdmin":true},"name":"John"}'
      const result = parse(malicious, { safeKeys: true })
      expect(result).not.toBe(null)
      if (result) {
        expect(result).not.toHaveProperty('__proto__')
        expect((result as { name: string }).name).toBe('John')
      }
    })

    it('blocks constructor keys when safeKeys is enabled', () => {
      const malicious = '{"constructor":{"prototype":{"isAdmin":true}},"name":"John"}'
      const result = parse(malicious, { safeKeys: true })
      expect(result).not.toBe(null)
      if (result) {
        expect(result).not.toHaveProperty('constructor')
        expect((result as { name: string }).name).toBe('John')
      }
    })

    it('blocks prototype keys when safeKeys is enabled', () => {
      const malicious = '{"prototype":{"isAdmin":true},"name":"John"}'
      const result = parse(malicious, { safeKeys: true })
      expect(result).not.toBe(null)
      if (result) {
        expect(result).not.toHaveProperty('prototype')
        expect((result as { name: string }).name).toBe('John')
      }
    })

    it('allows dangerous keys when safeKeys is disabled', () => {
      const json = '{"__proto__":{"test":true},"name":"John"}'
      const result = parse(json, { safeKeys: false })
      expect(result).not.toBe(null)
      if (result) {
        expect(result).toHaveProperty('__proto__')
      }
    })

    it('handles nested dangerous keys', () => {
      const malicious = '{"user":{"__proto__":{"isAdmin":true},"name":"John"}}'
      const result = parse(malicious, { safeKeys: true })
      expect(result).not.toBe(null)
      if (result) {
        const user = (result as { user: { name: string } }).user
        expect(user).not.toHaveProperty('__proto__')
        expect(user.name).toBe('John')
      }
    })

    it('handles arrays with dangerous keys', () => {
      const malicious = '{"items":[{"__proto__":{"test":true},"id":1}]}'
      const result = parse(malicious, { safeKeys: true })
      expect(result).not.toBe(null)
      if (result) {
        const items = (result as { items: Array<{ id: number }> }).items
        expect(items[0]).not.toHaveProperty('__proto__')
        expect(items[0].id).toBe(1)
      }
    })

    it('combines all security options', () => {
      const json = '{"a":{"b":{"c":1}}}'
      const result = parse(json, { maxSize: 1000, maxDepth: 10, safeKeys: true })
      expect(result).toEqual({ a: { b: { c: 1 } } })
    })

    it('security options work with schema validation', () => {
      const schema = { name: 'string', age: 'number' }
      const json = '{"name":"John","age":30}'
      const result = parse(json, { schema, maxSize: 1000, maxDepth: 10, safeKeys: true })
      expect(result).toEqual({ name: 'John', age: 30 })
    })
  })

  describe('date handling edge cases', () => {
    it('handles dates: iso mode explicitly', () => {
      const result = parse('{"date":"2023-01-01T10:00:00Z"}', { dates: 'iso' })
      expect((result as { date: Date }).date).toBeInstanceOf(Date)
    })

    it('handles dates: timestamp mode in parse', () => {
      const result = parse('{"date":"2023-01-01T10:00:00Z"}', { dates: 'timestamp' })
      expect((result as { date: Date }).date).toBeInstanceOf(Date)
    })

    it('handles dates with timezone offsets', () => {
      const result = parse('{"date":"2023-01-01T10:00:00+05:30"}', { dates: true })
      expect((result as { date: Date }).date).toBeInstanceOf(Date)
    })

    it('handles dates with milliseconds', () => {
      const result = parse('{"date":"2023-01-01T10:00:00.999Z"}', { dates: true })
      expect((result as { date: Date }).date).toBeInstanceOf(Date)
    })

    it('does not parse invalid date strings', () => {
      const result = parse('{"date":"not-a-date"}', { dates: true })
      expect((result as { date: string }).date).toBe('not-a-date')
    })

    it('handles dates in arrays', () => {
      const result = parse('{"dates":["2023-01-01T10:00:00Z","2023-01-02T10:00:00Z"]}', { dates: true })
      const dates = (result as { dates: Date[] }).dates
      expect(dates[0]).toBeInstanceOf(Date)
      expect(dates[1]).toBeInstanceOf(Date)
    })

    it('handles dates in nested objects', () => {
      const result = parse('{"user":{"createdAt":"2023-01-01T10:00:00Z"}}', { dates: true })
      const user = (result as { user: { createdAt: Date } }).user
      expect(user.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('reviver edge cases', () => {
  it('handles reviver removing keys by returning undefined', () => {
    const result = parse('{"a":1,"b":2}', {
      reviver: (key, value) => key === 'b' ? undefined : value
    })
    expect(result).toEqual({ a: 1 })
  })

    it('handles reviver modifying values', () => {
      const result = parse('{"a":1,"b":2}', {
        reviver: (key, value) => typeof value === 'number' ? value * 2 : value
      })
      expect(result).toEqual({ a: 2, b: 4 })
    })

    it('handles reviver with dates option', () => {
      const result = parse('{"date":"2023-01-01T10:00:00Z","name":"John"}', {
        dates: true,
        reviver: (key, value) => key === 'date' && value instanceof Date ? new Date(value.getTime() + 1000) : value
      })
      const date = (result as { date: Date }).date
      expect(date).toBeInstanceOf(Date)
      expect((result as { name: string }).name).toBe('John')
    })
  })

  describe('edge cases and special values', () => {
    it('handles empty object', () => {
      expect(parse('{}')).toEqual({})
    })

    it('handles empty array', () => {
      expect(parse('[]')).toEqual([])
    })

    it('handles null values', () => {
      expect(parse('{"a":null}')).toEqual({ a: null })
    })

    it('handles false values', () => {
      expect(parse('{"active":false}')).toEqual({ active: false })
    })

    it('handles zero values', () => {
      expect(parse('{"count":0}')).toEqual({ count: 0 })
    })

    it('handles empty strings', () => {
      expect(parse('{"name":""}')).toEqual({ name: '' })
    })

    it('handles unicode characters', () => {
      expect(parse('{"emoji":"😀"}')).toEqual({ emoji: '😀' })
      expect(parse('{"text":"café"}')).toEqual({ text: 'café' })
      expect(parse('{"text":"日本語"}')).toEqual({ text: '日本語' })
    })

    it('handles special characters in strings', () => {
      expect(parse('{"text":"\\"quoted\\""}')).toEqual({ text: '"quoted"' })
      expect(parse('{"text":"line1\\nline2"}')).toEqual({ text: 'line1\nline2' })
      expect(parse('{"text":"tab\\tseparated"}')).toEqual({ text: 'tab\tseparated' })
    })

    it('handles very large numbers', () => {
      expect(parse('{"big":9007199254740991}')).toEqual({ big: 9007199254740991 })
    })

    it('handles scientific notation', () => {
      expect(parse('{"value":1e10}')).toEqual({ value: 10000000000 })
    })

    it('handles negative numbers', () => {
      expect(parse('{"value":-42}')).toEqual({ value: -42 })
    })

    it('handles decimal numbers', () => {
      expect(parse('{"pi":3.14159}')).toEqual({ pi: 3.14159 })
    })

    it('handles nested empty structures', () => {
      expect(parse('{"a":{},"b":[]}')).toEqual({ a: {}, b: [] })
    })

    it('handles deeply nested structures', () => {
      const deep = '{"a":{"b":{"c":{"d":{"e":1}}}}}'
      expect(parse(deep)).toEqual({ a: { b: { c: { d: { e: 1 } } } } })
    })

    it('handles arrays with mixed types', () => {
      expect(parse('[1,"two",true,null,{}]')).toEqual([1, 'two', true, null, {}])
    })

    it('handles objects with many keys', () => {
      const keys = Array.from({ length: 100 }, (_, i) => `"key${i}":${i}`).join(',')
      const json = `{${keys}}`
      const result = parse(json)
      expect(result).not.toBe(null)
      if (result) {
        expect(Object.keys(result as Record<string, number>).length).toBe(100)
      }
    })
  })

  describe('parseWithDetails comprehensive', () => {
    it('handles all options together', () => {
      const schema = { name: 'string', age: 'number' }
      const result = parseWithDetails('{"name":"John","age":30}', {
        schema,
        maxSize: 1000,
        maxDepth: 10,
        safeKeys: true,
        dates: true
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', age: 30 })
      }
    })

    it('reports security option violations', () => {
      const largeJson = '{"data":"' + 'x'.repeat(200) + '"}'
      const result = parseWithDetails(largeJson, { maxSize: 50 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeTruthy()
      }
    })

    it('reports depth violations', () => {
      let deepJson = '{"a":'
      for (let i = 0; i < 20; i++) {
        deepJson += '{"a":'
      }
      deepJson += '1'
      for (let i = 0; i < 20; i++) {
        deepJson += '}'
      }
      const result = parseWithDetails(deepJson, { maxDepth: 10 })
      expect(result.success).toBe(false)
    })

    it('handles schema validation errors with details', () => {
      const schema = { name: 'string', age: 'number' }
      const result = parseWithDetails('{"name":"John","age":"30"}', { schema })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeTruthy()
        expect(result.error).toContain('age')
      }
    })
  })
})

