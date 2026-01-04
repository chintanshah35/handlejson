# handlejson

> JSON, handled. Safe parse, stringify, format, validate.

[![npm version](https://img.shields.io/npm/v/handlejson.svg)](https://www.npmjs.com/package/handlejson)
[![npm downloads](https://img.shields.io/npm/dm/handlejson.svg)](https://www.npmjs.com/package/handlejson)
[![node](https://img.shields.io/node/v/handlejson.svg)](https://nodejs.org)
[![bundle size](https://img.shields.io/bundlephobia/minzip/handlejson)](https://bundlephobia.com/package/handlejson)
[![license](https://img.shields.io/npm/l/handlejson.svg)](https://github.com/chintanshah35/handlejson/blob/main/LICENSE)

## Install

```bash
npm install handlejson
```

## Quick Start

```typescript
import { parse, stringify } from 'handlejson'

const data = parse('{"name":"John"}')  // { name: 'John' }
const json = stringify({ name: 'John' })  // '{"name":"John"}'
```

## Why?

`JSON.parse` and `JSON.stringify` throw errors. You always need try-catch. This gets old.

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
- ~1KB gzipped

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
- `dates: true` - Serialize Date objects to ISO strings, deserialize ISO strings to Date objects
- `dates: false` - Use native JSON.stringify behavior (default)
- Works with ISO 8601 format strings

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

Useful for processing large JSON files without loading everything into memory at once.

## License

MIT

