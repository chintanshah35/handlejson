import { describe, it, expect } from 'vitest'
import { tryValidate } from '../src/index'

describe('tryValidate', () => {
  describe('detailed error messages', () => {
    it('returns detailed error for type mismatch', () => {
      const schema = { name: 'string', age: 'number' }
      const [valid, error] = tryValidate({ name: 'John', age: '30' }, schema)
      
      expect(valid).toBe(false)
      expect(error).toBeDefined()
      expect(error?.path).toBe('age')
      expect(error?.expected).toBe('number')
      expect(error?.actual).toBe('string')
      expect(error?.message).toContain('age')
    })

    it('returns error for nested field', () => {
      const schema = {
        name: 'string',
        address: {
          street: 'string',
          zip: 'number'
        }
      }
      const [valid, error] = tryValidate(
        { name: 'John', address: { street: 'Main St', zip: '12345' } },
        schema
      )
      
      expect(valid).toBe(false)
      expect(error?.path).toBe('address.zip')
      expect(error?.expected).toBe('number')
      expect(error?.actual).toBe('string')
    })

    it('returns error for array item', () => {
      const schema = { tags: ['string'] }
      const [valid, error] = tryValidate({ tags: ['a', 1, 'c'] }, schema)
      
      expect(valid).toBe(false)
      expect(error?.path).toBe('tags[1]')
      expect(error?.expected).toBe('string')
      expect(error?.actual).toBe('number')
    })

    it('returns error for nested array object', () => {
      const schema = { users: [{ name: 'string', age: 'number' }] }
      const [valid, error] = tryValidate(
        { users: [{ name: 'John', age: 30 }, { name: 'Jane', age: '25' }] },
        schema
      )
      
      expect(valid).toBe(false)
      expect(error?.path).toBe('users[1].age')
      expect(error?.expected).toBe('number')
      expect(error?.actual).toBe('string')
    })
  })

  describe('successful validation', () => {
    it('returns true for valid simple schema', () => {
      const schema = { name: 'string', age: 'number' }
      const [valid, error] = tryValidate({ name: 'John', age: 30 }, schema)
      
      expect(valid).toBe(true)
      expect(error).toBe(null)
    })

    it('returns true for valid optional fields', () => {
      const schema = { name: 'string', age: '?number' }
      const [valid, error] = tryValidate({ name: 'John' }, schema)
      
      expect(valid).toBe(true)
      expect(error).toBe(null)
    })

    it('returns true for valid array', () => {
      const schema = { tags: ['string'] }
      const [valid, error] = tryValidate({ tags: ['a', 'b', 'c'] }, schema)
      
      expect(valid).toBe(true)
      expect(error).toBe(null)
    })

    it('returns true for empty array', () => {
      const schema = { tags: ['string'] }
      const [valid, error] = tryValidate({ tags: [] }, schema)
      
      expect(valid).toBe(true)
      expect(error).toBe(null)
    })
  })

  describe('edge cases', () => {
    it('handles null values', () => {
      const schema = { name: 'string' }
      const [valid, error] = tryValidate({ name: null }, schema)
      
      expect(valid).toBe(false)
      expect(error?.actual).toBe('null')
    })

    it('handles undefined in required field', () => {
      const schema = { name: 'string' }
      const [valid, error] = tryValidate({ name: undefined }, schema)
      
      expect(valid).toBe(false)
      expect(error?.actual).toBe('undefined')
    })

    it('allows undefined in optional field', () => {
      const schema = { name: 'string', age: '?number' }
      const [valid] = tryValidate({ name: 'John', age: undefined }, schema)
      
      expect(valid).toBe(true)
    })

    it('validates deeply nested structures', () => {
      const schema = {
        user: {
          profile: {
            contact: {
              email: 'string'
            }
          }
        }
      }
      const [valid] = tryValidate(
        { user: { profile: { contact: { email: 'test@example.com' } } } },
        schema
      )
      
      expect(valid).toBe(true)
    })

    it('returns error for deeply nested invalid field', () => {
      const schema = {
        user: {
          profile: {
            contact: {
              email: 'string'
            }
          }
        }
      }
      const [valid, error] = tryValidate(
        { user: { profile: { contact: { email: 123 } } } },
        schema
      )
      
      expect(valid).toBe(false)
      expect(error?.path).toBe('user.profile.contact.email')
    })

    it('handles optional fields in nested objects', () => {
      const schema = {
        user: {
          name: 'string',
          age: '?number'
        }
      }
      const [valid] = tryValidate({ user: { name: 'John' } }, schema)
      expect(valid).toBe(true)
    })

    it('validates optional fields in nested objects when present', () => {
      const schema = {
        user: {
          name: 'string',
          age: '?number'
        }
      }
      const [valid, error] = tryValidate({ user: { name: 'John', age: '30' } }, schema)
      expect(valid).toBe(false)
      expect(error?.path).toBe('user.age')
    })

    it('handles arrays of optional objects', () => {
      const schema = {
        items: [{
          id: 'number',
          name: '?string'
        }]
      }
      const [valid] = tryValidate({ items: [{ id: 1 }, { id: 2, name: 'test' }] }, schema)
      expect(valid).toBe(true)
    })

    it('validates array items with optional fields', () => {
      const schema = {
        users: [{
          name: 'string',
          email: '?string'
        }]
      }
      const [valid, error] = tryValidate({
        users: [
          { name: 'John', email: 'john@example.com' },
          { name: 'Jane', email: 123 }
        ]
      }, schema)
      expect(valid).toBe(false)
      expect(error?.path).toBe('users[1].email')
    })

    it('handles nested arrays with optional items', () => {
      const schema = {
        matrix: [['number']]
      }
      const [valid] = tryValidate({ matrix: [[1, 2], [3]] }, schema)
      expect(valid).toBe(true)
    })

    it('validates nested arrays with wrong types', () => {
      const schema = {
        matrix: [['number']]
      }
      const [valid, error] = tryValidate({ matrix: [[1, '2'], [3]] }, schema)
      expect(valid).toBe(false)
      expect(error?.path).toBe('matrix[0][1]')
    })

    it('handles empty nested objects', () => {
      const schema = {
        metadata: 'object'
      }
      const [valid] = tryValidate({ metadata: {} }, schema)
      expect(valid).toBe(true)
    })

    it('handles extra fields not in schema', () => {
      const schema = {
        name: 'string'
      }
      const [valid] = tryValidate({ name: 'John', extra: 'field' }, schema)
      expect(valid).toBe(true)
    })

    it('handles missing required fields', () => {
      const schema = {
        name: 'string',
        age: 'number'
      }
      const [valid, error] = tryValidate({ name: 'John' }, schema)
      expect(valid).toBe(false)
      expect(error?.path).toBe('age')
    })

    it('handles wrong type for root value', () => {
      const schema = {
        name: 'string'
      }
      const [valid, error] = tryValidate('not an object', schema)
      expect(valid).toBe(false)
      expect(error?.path).toBe('root')
    })

    it('handles array as root value', () => {
      const schema = {
        name: 'string'
      }
      const [valid, error] = tryValidate([], schema)
      expect(valid).toBe(false)
      expect(error?.path).toBe('root')
    })

    it('handles null as root value', () => {
      const schema = {
        name: 'string'
      }
      const [valid, error] = tryValidate(null, schema)
      expect(valid).toBe(false)
      expect(error?.path).toBe('root')
    })

    it('validates complex nested structure', () => {
      const schema = {
        users: [{
          name: 'string',
          age: 'number',
          tags: ['string'],
          address: {
            street: 'string',
            zip: '?number'
          }
        }]
      }
      const [valid] = tryValidate({
        users: [{
          name: 'John',
          age: 30,
          tags: ['admin', 'user'],
          address: {
            street: 'Main St',
            zip: 12345
          }
        }]
      }, schema)
      expect(valid).toBe(true)
    })

    it('returns error for complex nested structure with wrong type', () => {
      const schema = {
        users: [{
          name: 'string',
          age: 'number',
          tags: ['string'],
          address: {
            street: 'string',
            zip: '?number'
          }
        }]
      }
      const [valid, error] = tryValidate({
        users: [{
          name: 'John',
          age: 30,
          tags: ['admin', 123],
          address: {
            street: 'Main St',
            zip: 12345
          }
        }]
      }, schema)
      expect(valid).toBe(false)
      expect(error?.path).toBe('users[0].tags[1]')
    })

    it('handles zero values', () => {
      const schema = {
        count: 'number',
        active: 'boolean'
      }
      const [valid] = tryValidate({ count: 0, active: false }, schema)
      expect(valid).toBe(true)
    })

    it('handles empty string values', () => {
      const schema = {
        name: 'string'
      }
      const [valid] = tryValidate({ name: '' }, schema)
      expect(valid).toBe(true)
    })

    it('distinguishes between null and undefined', () => {
      const schema = {
        value: '?string'
      }
      const [valid1] = tryValidate({ value: null }, schema)
      expect(valid1).toBe(false)
      
      const [valid2] = tryValidate({ value: undefined }, schema)
      expect(valid2).toBe(true)
    })

    it('handles type edge cases', () => {
      const schema = {
        count: 'number',
        active: 'boolean',
        name: 'string'
      }
      const [valid] = tryValidate({
        count: 0,
        active: false,
        name: ''
      }, schema)
      expect(valid).toBe(true)
    })
  })
})

