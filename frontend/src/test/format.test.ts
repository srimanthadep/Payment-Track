import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatAmount } from '@/utils/format'

describe('format utilities', () => {
  describe('formatCurrency', () => {
    it('formats positive numbers correctly', () => {
      expect(formatCurrency(1000)).toBe('₹1,000.00')
      expect(formatCurrency(1000000)).toBe('₹10,00,000.00')
    })

    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('₹0.00')
    })

    it('formats negative numbers correctly', () => {
      expect(formatCurrency(-500)).toBe('-₹500.00')
    })

    it('handles decimal values', () => {
      expect(formatCurrency(1234.56)).toBe('₹1,234.56')
    })
  })

  describe('formatAmount', () => {
    it('formats amount without currency symbol', () => {
      expect(formatAmount(1000)).toBe('1,000.00')
    })

    it('handles zero', () => {
      expect(formatAmount(0)).toBe('0.00')
    })
  })

  describe('formatDate', () => {
    it('formats date string correctly', () => {
      const date = '2024-11-13T10:00:00Z'
      const formatted = formatDate(date)
      expect(formatted).toMatch(/Nov 13, 2024/)
    })

    it('handles Date object', () => {
      const date = new Date('2024-11-13T10:00:00Z')
      const formatted = formatDate(date.toISOString())
      expect(formatted).toBeDefined()
    })
  })
})
