import { describe, it, expect } from 'vitest'
import { 
  calculateCommission, 
  getCardTypesForTransaction,
  getCardTypeDisplayNameWithRate,
  type CardType
} from '@/utils/commissionCalculator'

describe('commissionCalculator', () => {
  describe('calculateCommission', () => {
    it('calculates withdrawal commission for Normal Master correctly', () => {
      const result = calculateCommission(10000, 'normal_master', 'withdrawal')
      expect(result).toBe(200) // 2% of 10000
    })

    it('calculates withdrawal commission for HDFC Master correctly', () => {
      const result = calculateCommission(10000, 'hdfc_master', 'withdrawal')
      expect(result).toBe(230) // 2.3% of 10000
    })

    it('calculates repayment commission for all Visa/RuPay correctly', () => {
      const result = calculateCommission(10000, 'all_visa_rupay', 'repayment')
      expect(result).toBe(250) // 2.5% of 10000
    })

    it('calculates repayment commission for HDFC Visa/RuPay correctly', () => {
      const result = calculateCommission(10000, 'hdfc_visa_rupay', 'repayment')
      expect(result).toBe(270) // 2.7% of 10000
    })

    it('returns 0 for invalid card type', () => {
      const result = calculateCommission(10000, 'invalid_type' as CardType, 'withdrawal')
      expect(result).toBe(0)
    })

    it('handles zero amount', () => {
      const result = calculateCommission(0, 'normal_master', 'withdrawal')
      expect(result).toBe(0)
    })

    it('handles negative amount', () => {
      const result = calculateCommission(-1000, 'normal_master', 'withdrawal')
      expect(result).toBe(-20)
    })
  })

  describe('getCardTypesForTransaction', () => {
    it('returns withdrawal card types', () => {
      const types = getCardTypesForTransaction('withdrawal')
      expect(types).toContain('normal_visa')
      expect(types).toContain('normal_rupay')
      expect(types).toContain('normal_master')
      expect(types).not.toContain('all_visa_rupay')
    })

    it('returns repayment card types', () => {
      const types = getCardTypesForTransaction('repayment')
      expect(types).toContain('all_visa_rupay')
      expect(types).toContain('hdfc_visa_rupay')
      expect(types).toContain('all_master_cards')
      expect(types).not.toContain('normal_visa')
    })
  })

  describe('getCardTypeDisplayNameWithRate', () => {
    it('returns display name with rate for withdrawal', () => {
      const display = getCardTypeDisplayNameWithRate('normal_master', 'withdrawal')
      expect(display).toContain('Mastercard')
      expect(display).toContain('2%')
    })

    it('returns display name with rate for repayment', () => {
      const display = getCardTypeDisplayNameWithRate('all_visa_rupay', 'repayment')
      expect(display).toContain('Visa & RuPay')
      expect(display).toContain('2.5%')
    })
  })
})
