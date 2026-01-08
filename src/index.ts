import type { Schema, ValidationResult } from './types'
import { validate } from './validate'

export { parse, tryParse, isValid } from './parse'
export { stringify, tryStringify } from './stringify'
export { format, minify } from './format'
export { parseStream } from './stream'

export function tryValidate(value: unknown, schema: Schema): ValidationResult {
  return validate(value, schema)
}

export type { 
  ParseOptions, 
  StringifyOptions, 
  FormatOptions,
  ParseResult,
  StringifyResult,
  Schema,
  SchemaType,
  SchemaValue,
  ValidationResult,
  ValidationError,
  StreamParseOptions,
  StreamParseResult,
  DateSerializationMode
} from './types'
