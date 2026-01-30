import { parse, stringify, parseStream } from '../src/index'
import { performance } from 'perf_hooks'

interface BenchmarkResult {
  name: string
  opsPerSecond: number
  avgTimeMs: number
  memoryMB: number
}

function formatMemory(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100
}

function benchmark(name: string, fn: () => void, iterations: number): BenchmarkResult {
  const startMem = process.memoryUsage().heapUsed
  const startTime = performance.now()
  
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  
  const endTime = performance.now()
  const endMem = process.memoryUsage().heapUsed
  const durationMs = endTime - startTime
  const avgTimeMs = durationMs / iterations
  const opsPerSecond = Math.round(1000 / avgTimeMs)
  const memoryMB = formatMemory(endMem - startMem)
  
  return { name, opsPerSecond, avgTimeMs, memoryMB }
}

console.log('🚀 Enterprise Load Benchmarks\n')
console.log('=' .repeat(60))

const smallJson = '{"name":"John","age":30,"active":true}'
const mediumJson = JSON.stringify({
  users: Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    active: i % 2 === 0,
    metadata: {
      createdAt: new Date().toISOString(),
      tags: ['tag1', 'tag2', 'tag3']
    }
  }))
})

const largeJson = JSON.stringify({
  data: Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    value: Math.random() * 1000,
    nested: {
      level1: {
        level2: {
          level3: {
            value: i
          }
        }
      }
    }
  }))
})

const veryLargeJson = JSON.stringify({
  items: Array.from({ length: 100000 }, (_, i) => ({
    id: i,
    data: 'x'.repeat(100)
  }))
})

console.log('\n📊 Parse Performance\n')

const parseResults: BenchmarkResult[] = []

parseResults.push(benchmark('Small JSON (baseline)', () => {
  parse(smallJson)
}, 1000000))

parseResults.push(benchmark('Small JSON (with dates)', () => {
  parse(smallJson, { dates: true })
}, 1000000))

parseResults.push(benchmark('Small JSON (with schema)', () => {
  parse(smallJson, { schema: { name: 'string', age: 'number', active: 'boolean' } })
}, 100000))

parseResults.push(benchmark('Small JSON (all security)', () => {
  parse(smallJson, { maxSize: 1000, maxDepth: 10, safeKeys: true })
}, 100000))

parseResults.push(benchmark('Medium JSON (100 items)', () => {
  parse(mediumJson)
}, 10000))

parseResults.push(benchmark('Medium JSON (with dates)', () => {
  parse(mediumJson, { dates: true })
}, 10000))

parseResults.push(benchmark('Large JSON (10k items)', () => {
  parse(largeJson)
}, 100))

parseResults.push(benchmark('Large JSON (with security)', () => {
  parse(largeJson, { maxSize: 50 * 1024 * 1024, maxDepth: 100, safeKeys: true })
}, 100))

parseResults.push(benchmark('Very Large JSON (100k items)', () => {
  parse(veryLargeJson)
}, 10))

parseResults.forEach(result => {
  console.log(`${result.name.padEnd(40)} ${result.opsPerSecond.toLocaleString().padStart(10)} ops/s  ${result.avgTimeMs.toFixed(3).padStart(8)}ms  ${result.memoryMB.toFixed(2).padStart(6)}MB`)
})

console.log('\n📊 Stringify Performance\n')

const stringifyResults: BenchmarkResult[] = []
const smallObj = JSON.parse(smallJson)
const mediumObj = JSON.parse(mediumJson)
const largeObj = JSON.parse(largeJson)

stringifyResults.push(benchmark('Small Object (baseline)', () => {
  stringify(smallObj)
}, 1000000))

stringifyResults.push(benchmark('Small Object (with dates)', () => {
  stringify(smallObj, { dates: true })
}, 1000000))

stringifyResults.push(benchmark('Small Object (circular ref)', () => {
  const obj: Record<string, unknown> = { ...smallObj }
  obj.self = obj
  stringify(obj)
}, 100000))

stringifyResults.push(benchmark('Medium Object (100 items)', () => {
  stringify(mediumObj)
}, 10000))

stringifyResults.push(benchmark('Medium Object (with dates)', () => {
  stringify(mediumObj, { dates: true })
}, 10000))

stringifyResults.push(benchmark('Large Object (10k items)', () => {
  stringify(largeObj)
}, 100))

stringifyResults.forEach(result => {
  console.log(`${result.name.padEnd(40)} ${result.opsPerSecond.toLocaleString().padStart(10)} ops/s  ${result.avgTimeMs.toFixed(3).padStart(8)}ms  ${result.memoryMB.toFixed(2).padStart(6)}MB`)
})

console.log('\n📊 Concurrency Test\n')

async function concurrencyTest() {
  const concurrentRequests = 1000
  const json = mediumJson
  
  const startTime = performance.now()
  const promises = Array.from({ length: concurrentRequests }, async () => {
    return parse(json)
  })
  
  await Promise.all(promises)
  const duration = performance.now() - startTime
  
  console.log(`${concurrentRequests} concurrent parses: ${duration.toFixed(2)}ms`)
  console.log(`Throughput: ${Math.round((concurrentRequests / duration) * 1000)} ops/s`)
}

await concurrencyTest()

console.log('\n📊 Memory Efficiency\n')

function memoryTest() {
  const iterations = 1000
  const json = largeJson
  
  const startMem = process.memoryUsage()
  
  for (let i = 0; i < iterations; i++) {
    const parsed = parse(json)
    if (i % 100 === 0) {
      global.gc?.()
    }
  }
  
  global.gc?.()
  const endMem = process.memoryUsage()
  
  const heapUsed = formatMemory(endMem.heapUsed - startMem.heapUsed)
  const heapTotal = formatMemory(endMem.heapTotal - startMem.heapTotal)
  
  console.log(`After ${iterations} large parses:`)
  console.log(`  Heap used: ${heapUsed}MB`)
  console.log(`  Heap total: ${heapTotal}MB`)
}

memoryTest()

console.log('\n📊 Stream Parsing (Large File)\n')

async function streamTest() {
  const largeData = { items: Array.from({ length: 50000 }, (_, i) => ({ id: i, data: `item-${i}` })) }
  const jsonString = JSON.stringify(largeData)
  
  const startTime = performance.now()
  const result = await parseStream(jsonString)
  const duration = performance.now() - startTime
  
  console.log(`Stream parse (50k items): ${duration.toFixed(2)}ms`)
  console.log(`Success: ${result.complete}`)
  console.log(`Data size: ${formatMemory(jsonString.length)}MB`)
}

await streamTest()

console.log('\n✅ Benchmark Complete\n')
