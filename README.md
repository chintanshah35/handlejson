# handlejson

> JSON, handled. Safe parse, stringify, format, validate.

## Install

```bash
npm install handlejson
```

## Why?

Native `JSON.parse` and `JSON.stringify` throw errors. You always need try-catch. This gets old.

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

// With reviver (like JSON.parse)
parse('{"date":"2023-01-01"}', {
  reviver: (key, value) => key === 'date' ? new Date(value) : value
})
```

### Typed Parse

```typescript
type User = { name: string; age: number }

const user = parse<User>('{"name":"John","age":30}')
// user is User | null
// Note: Type generics are compile-time only, not runtime validation
```

### Safe Stringify

```typescript
import { stringify } from 'handlejson'

stringify({ a: 1 })  // '{"a":1}'

// Handles circular references
const obj = { a: 1 }
obj.self = obj
stringify(obj)  // '{"a":1,"self":"[Circular]"}'
```

### Error Tuple (Go-style)

```typescript
import { tryParse, tryStringify } from 'handlejson'

const [data, error] = tryParse(str)
if (error) {
  console.log('Parse failed:', error.message)
}

const [json, err] = tryStringify(obj)
const [json2, err2] = tryStringify(obj, { space: 2, replacer: ... })
```

### Validation

```typescript
import { isValid } from 'handlejson'

isValid('{"a":1}')  // true
isValid('invalid')  // false
isValid('{a:1}')    // false (keys must be quoted)
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

## API

| Function | Description |
|----------|-------------|
| `parse(str, options?)` | Safe parse, returns `null` on error. Options: `default`, `reviver` |
| `stringify(value, options?)` | Safe stringify, handles circular refs. Options: `space`, `replacer` |
| `tryParse(str, reviver?)` | Returns `[result, error]` tuple |
| `tryStringify(value, options?)` | Returns `[result, error]` tuple. Options: `space`, `replacer` |
| `isValid(str)` | Check if string is valid JSON |
| `format(value, space?)` | Pretty-print with indentation |
| `minify(value)` | Remove all whitespace |

## Date Handling with Reviver

When using `reviver` to convert date strings to Date objects, only **ISO 8601** and **Unix timestamps** are recommended:

```typescript
// Recommended: ISO 8601 format
parse('{"createdAt":"2023-01-01T10:00:00Z"}', {
  reviver: (key, value) => {
    // Only convert keys ending with 'At', 'Date', or exact 'date'/'timestamp'
    const isDateKey = key.endsWith('At') || 
                      key.endsWith('Date') || 
                      key === 'date' ||
                      key === 'timestamp'
    
    if (!isDateKey) return value
    
    // ISO 8601 strings (2023-01-01, 2023-01-01T10:00:00Z, etc.)
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value)
      return isNaN(date.getTime()) ? value : date
    }
    
    // Unix timestamps (milliseconds or seconds)
    if (typeof value === 'number') {
      const timestamp = value > 946684800000 ? value : value * 1000
      if (timestamp > 946684800000 && timestamp < 4102444800000) {
        return new Date(timestamp)
      }
    }
    
    return value
  }
})
```

**Supported formats:**
- ISO 8601: `"2023-01-01"`, `"2023-01-01T10:00:00Z"`, `"2023-01-01T10:00:00+05:30"`
- Unix timestamps: `1704110400000` (milliseconds) or `1704110400` (seconds)

**Not supported:** MM/DD/YYYY, DD/MM/YYYY, RFC 2822, or other custom formats. These should be handled separately if needed.

## License

MIT

