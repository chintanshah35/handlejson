# handlejson

> JSON, handled. Safe parse, stringify, format, validate.

[![npm version](https://img.shields.io/npm/v/handlejson.svg)](https://www.npmjs.com/package/handlejson)
[![npm downloads](https://img.shields.io/npm/dm/handlejson.svg)](https://www.npmjs.com/package/handlejson)
[![build](https://github.com/chintanshah35/handlejson/actions/workflows/test.yml/badge.svg)](https://github.com/chintanshah35/handlejson/actions)
[![node](https://img.shields.io/node/v/handlejson.svg)](https://nodejs.org)
[![bundle size](https://img.shields.io/bundlephobia/minzip/handlejson)](https://bundlephobia.com/package/handlejson)
[![license](https://img.shields.io/npm/l/handlejson.svg)](https://github.com/chintanshah35/handlejson/blob/main/LICENSE)

## Install

```bash
npm install handlejson
```

**v1.0.0** - 244 tests, performance improvements, ready for production.

## Quick Start

```typescript
import { parse, stringify } from 'handlejson'

const data = parse('{"name":"John"}')  // { name: 'John' }
const json = stringify({ name: 'John' })  // '{"name":"John"}'
```

## Why?

`JSON.parse` and `JSON.stringify` throw errors. You always need try-catch. This is repetitive.

**Before:**
```typescript
let data
try {
  data = JSON.parse(str)
} catch {
  data = null
}
```

**After:**
```typescript
import { parse } from 'handlejson'

const data = parse(str) // null if invalid
```

## Features

- Safe parse with default values
- Safe stringify with circular reference handling
- Validation without parsing twice
- Pretty-print and minify
- TypeScript-first
- Zero dependencies
- ~1.5KB gzipped
- Better error messages with position and context
- Security options (size limits, depth limits, prototype pollution protection)

## Performance

Performance benchmarks:

- **Small JSON (<1KB)**: 5.2M ops/s
- **With security options**: 3.4M ops/s
- **Medium JSON (100 items)**: 21k ops/s
- **Concurrency**: 22.8k ops/s (1000 concurrent requests)

See [benchmarks/enterprise-load.ts](./benchmarks/enterprise-load.ts) for detailed performance tests.

**What makes it different:**
- Built-in security options (maxSize, maxDepth, safeKeys)
- Detailed error messages with position and context
- Stream parsing for large files
- Zero dependencies, 1.5KB gzipped

## Usage

### Safe Parse

```typescript
import { parse } from 'handlejson'

parse('{"a":1}')           // { a: 1 }
parse('invalid')           // null
parse('invalid', { default: {} })  // {}

// With reviver
parse('{"date":"2023-01-01"}', {
  reviver: (key, value) => key === 'date' ? new Date(value) : value
})
```

### Typed Parse

```typescript
type User = { name: string; age: number }

const user = parse<User>('{"name":"John","age":30}')
// user is User | null
```

### Safe Stringify

```typescript
import { stringify } from 'handlejson'

stringify({ a: 1 })  // '{"a":1}'

// Handles circular refs
const obj = { a: 1 }
obj.self = obj
stringify(obj)  // '{"a":1,"self":"[Circular]"}'
```

### Error Handling

Get error details instead of just null:

```typescript
import { tryParse, tryStringify } from 'handlejson'

const [data, error] = tryParse(str)
if (error) {
  console.log('Parse failed:', error.message)
}

const [json, err] = tryStringify(obj)
const [json2, err2] = tryStringify(obj, { space: 2 })
```

### Detailed Error Messages

Get position and context of JSON parsing errors:

```typescript
import { parseWithDetails } from 'handlejson'

const result = parseWithDetails('{"name":"John", invalid}')
if (!result.success) {
  console.log('Error:', result.error)
  console.log('Position:', result.position)
  console.log('Context:', result.context)
  // Error: Invalid JSON at position 18: unexpected token 'invalid'
  // Position: 18
  // Context: '{"name":"John", invalid}'
}

// Works with valid JSON too
const valid = parseWithDetails('{"name":"John","age":30}')
if (valid.success) {
  console.log(valid.data) // { name: 'John', age: 30 }
}
```

### Security Options

Protect against common security vulnerabilities:

```typescript
import { parse } from 'handlejson'

// Prevent memory exhaustion
const result = parse(largeJson, { maxSize: 10 * 1024 * 1024 }) // 10MB limit

// Prevent stack overflow from deeply nested objects
const nested = parse(deepJson, { maxDepth: 100 }) // Max 100 levels deep

// Protect against prototype pollution
const safe = parse(json, { safeKeys: true }) // Blocks __proto__, constructor, prototype keys

// Combine all security options
const secure = parse(json, {
  maxSize: 10 * 1024 * 1024,
  maxDepth: 100,
  safeKeys: true
})
```

### Validation

```typescript
import { isValid } from 'handlejson'

isValid('{"a":1}')  // true
isValid('invalid')  // false
isValid('{a:1}')    // false
```

### Format (Pretty-print)

```typescript
import { format } from 'handlejson'

format({ a: 1 })      // '{\n  "a": 1\n}'
format({ a: 1 }, 4)   // 4-space indent
format('{"a":1}')     // works with strings too
```

### Minify

```typescript
import { minify } from 'handlejson'

minify({ a: 1, b: 2 })              // '{"a":1,"b":2}'
minify('{\n  "a": 1\n}')            // '{"a":1}'
```

## Common Use Cases

API responses:
```typescript
const response = await fetch('/api/user')
const user = parse(await response.text(), { default: {} })
```

LocalStorage:
```typescript
const saved = parse(localStorage.getItem('data'), { default: null })
```

## API

| Function | Description |
|----------|-------------|
| `parse(str, options?)` | Safe parse, returns `null` on error. Options: `default`, `reviver`, `dates`, `schema` |
| `stringify(value, options?)` | Safe stringify, handles circular refs. Options: `space`, `replacer`, `dates` |
| `tryParse(str, reviver?, dates?)` | Returns `[result, error]` tuple |
| `tryStringify(value, options?)` | Returns `[result, error]` tuple. Options: `space`, `replacer`, `dates` |
| `tryValidate(value, schema)` | Validate with detailed errors. Returns `[valid, error]` tuple |
| `isValid(str)` | Check if string is valid JSON |
| `format(value, space?)` | Pretty-print with indentation |
| `minify(value)` | Remove all whitespace |
| `parseStream(stream, options?)` | Parse large JSON in chunks. Options: `chunkSize`, `onProgress`, `onError` |

## Date Handling

Built-in date serialization and deserialization:

```typescript
import { parse, stringify } from 'handlejson'

// Serialize Date objects to ISO strings
const date = new Date('2023-01-01T10:00:00Z')
stringify({ createdAt: date }, { dates: true })
// → '{"createdAt":"2023-01-01T10:00:00.000Z"}'

// Serialize Date objects to timestamps
stringify({ createdAt: date }, { dates: 'timestamp' })
// → '{"createdAt":1672567200000}'

// Deserialize ISO date strings to Date objects
parse('{"createdAt":"2023-01-01T10:00:00Z"}', { dates: true })
// → { createdAt: Date }

// With custom reviver (for advanced cases)
parse('{"createdAt":"2023-01-01T10:00:00Z"}', {
  dates: true,
  reviver: (key, value) => {
    if (key === 'createdAt' && value instanceof Date) {
      return new Date(value.getTime() + 1000)
    }
    return value
  }
})
```

The `dates` option:
- `dates: true` or `dates: 'iso'` - Serialize Date objects to ISO strings, deserialize ISO strings to Date objects
- `dates: 'timestamp'` - Serialize Date objects to timestamps (numbers), deserialize ISO strings to Date objects
- `dates: false` - Use native JSON.stringify behavior (default)
- Works with ISO 8601 format strings for deserialization

## Schema Validation

Validate JSON structure with simple schema:

```typescript
import { parse } from 'handlejson'

// Simple type validation
const schema = { name: 'string', age: 'number', active: 'boolean' }
const user = parse('{"name":"John","age":30,"active":true}', { schema })
// → { name: 'John', age: 30, active: true }

// Returns null if validation fails
const invalid = parse('{"name":"John","age":"30"}', { schema })
// → null (age should be number, got string)

// Nested schema validation
const nestedSchema = {
  name: 'string',
  address: {
    street: 'string',
    zip: 'number'
  }
}
const data = parse('{"name":"John","address":{"street":"Main St","zip":12345}}', { schema: nestedSchema })
// → { name: 'John', address: { street: 'Main St', zip: 12345 } }
```

### Optional Fields

Prefix type with `?` to make fields optional:

```typescript
const schema = {
  name: 'string',
  age: '?number',      // optional
  email: '?string'     // optional
}

parse('{"name":"John"}', { schema })
// → { name: 'John' }

parse('{"name":"John","age":30}', { schema })
// → { name: 'John', age: 30 }
```

### Array Validation

Validate array items by wrapping type in array:

```typescript
// Array of strings
const schema = { tags: ['string'] }
parse('{"tags":["a","b","c"]}', { schema })
// → { tags: ['a', 'b', 'c'] }

// Array of numbers
const schema = { scores: ['number'] }
parse('{"scores":[1,2,3]}', { schema })
// → { scores: [1, 2, 3] }

// Array of objects
const schema = {
  users: [{
    name: 'string',
    age: 'number'
  }]
}
parse('{"users":[{"name":"John","age":30}]}', { schema })
// → { users: [{ name: 'John', age: 30 }] }

// Nested arrays
const schema = { matrix: [['number']] }
parse('{"matrix":[[1,2],[3,4]]}', { schema })
// → { matrix: [[1, 2], [3, 4]] }
```

### Detailed Error Messages

Get detailed validation errors:

```typescript
import { tryValidate } from 'handlejson'

const schema = { name: 'string', age: 'number' }
const [valid, error] = tryValidate({ name: 'John', age: '30' }, schema)

if (!valid) {
  console.log(error.path)      // 'age'
  console.log(error.expected)  // 'number'
  console.log(error.actual)    // 'string'
  console.log(error.message)   // "Expected number at 'age', got string"
}
```

Schema types: `'string'`, `'number'`, `'boolean'`, `'object'`, `'array'`

## Stream Parsing

Parse large JSON files in chunks:

```typescript
import { parseStream } from 'handlejson'

// String input
const result = await parseStream('{"name":"John","age":30}')
// → { data: { name: 'John', age: 30 }, error: null, complete: true }

// ReadableStream input
const response = await fetch('/api/large-data.json')
const streamResult = await parseStream(response.body!, {
  onProgress: (parsed) => console.log('Progress:', parsed),
  onError: (error) => console.error('Error:', error)
})

if (streamResult.complete) {
  console.log('Data:', streamResult.data)
} else {
  console.error('Failed:', streamResult.error)
}
```

Handles large JSON files efficiently.

## Articles & Blog Posts

Learn more about handlejson:

- **[Introducing handlejson: Safe JSON Parsing Without the Try-Catch Spam](https://dev.to/chintanshah35/introducing-handlejson-safe-json-parsing-without-the-try-catch-spam-1oh3)** - Dev.to
- **[JSON Parsing Without the Tears: A Better Approach to Error Handling](https://medium.com/@chintanshah35/json-parsing-without-the-tears-a-better-approach-to-error-handling-2e569d28acb4)** - Medium

## License

MIT

