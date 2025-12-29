export type DateSerializationMode = 'iso' | 'timestamp'

export type ParseOptions<T = unknown> = {
  default?: T
  reviver?: (key: string, value: unknown) => unknown
  dates?: boolean | DateSerializationMode
  schema?: Schema
}

export type StringifyOptions = {
  space?: number
  replacer?: (key: string, value: unknown) => unknown
  dates?: boolean | DateSerializationMode
}

export type FormatOptions = {
  space?: number
}

export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array'
export type Schema = {
  [key: string]: SchemaType | Schema
}

export type ParseResult<T> = [T, null] | [null, Error]
export type StringifyResult = [string, null] | [null, Error]
export type ValidationResult = [true, null] | [false, Error]

