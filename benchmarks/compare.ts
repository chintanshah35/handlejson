import { parse } from '../src/index'

const iterations = 1000000
const json = '{"name":"John","age":30,"active":true}'

console.log(`Benchmarking ${iterations.toLocaleString()} iterations...\n`)

// Benchmark handlejson
console.time('handlejson')
for (let i = 0; i < iterations; i++) {
  parse(json)
}
console.timeEnd('handlejson')

// Benchmark native JSON.parse
console.time('JSON.parse')
for (let i = 0; i < iterations; i++) {
  try {
    JSON.parse(json)
  } catch {
    // Ignore errors
  }
}
console.timeEnd('JSON.parse')
