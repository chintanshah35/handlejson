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
  })
})

