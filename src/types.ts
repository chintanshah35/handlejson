export type DateSerializationMode = 'iso' | 'timestamp'

export type ParseOptions<T = unknown> = {
  default?: T
  reviver?: (key: string, value: unknown) => unknown
  dates?: boolean | DateSerializationMode
}

export type StringifyOptions = {
  space?: number
  replacer?: (key: string, value: unknown) => unknown
  dates?: boolean | DateSerializationMode
}

export type FormatOptions = {
  space?: number
}

export type ParseResult<T> = [T, null] | [null, Error]
export type StringifyResult = [string, null] | [null, Error]

