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

## Known Limitations

- **BigInt values**: Cannot be stringified (returns `null`). Use a replacer to convert to string.
- **Symbols and Functions**: Silently omitted during stringify (standard JSON behavior).
- **Empty strings**: `parse('')` returns `null` (empty string is not valid JSON).
- **Type generics**: `parse<T>()` provides type hints only, not runtime validation.

## License

MIT

