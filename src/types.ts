export type ParseOptions<T = unknown> = {
  default?: T
}

export type StringifyOptions = {
  space?: number
  replacer?: (key: string, value: unknown) => unknown
}

export type FormatOptions = {
  space?: number
}

export type ParseResult<T> = [T, null] | [null, Error]
export type StringifyResult = [string, null] | [null, Error]

