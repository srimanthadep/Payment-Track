import { describe, it, expect } from 'vitest'
import { 
  calculateCommission, 
  getCardTypesForTransaction,
  getCardTypeDisplayNameWithRate 
} from '@/utils/commissionCalculator'

describe('commissionCalculator', () => {
  describe('calculateCommission', () => {
    it('calculates withdrawal commission for normal UPI correctly', () => {
      const result = calculateCommission(10000, 'normal_upi', 'withdrawal')
      expect(result).toBe(200) // 2% of 10000
    })

    it('calculates withdrawal commission for premium UPI correctly', () => {
      const result = calculateCommission(10000, 'premium_upi', 'withdrawal')
      expect(result).toBe(230) // 2.3% of 10000
    })

    it('calculates repayment commission for all Visa/RuPay correctly', () => {
      const result = calculateCommission(10000, 'all_visa_rupay', 'repayment')
      expect(result).toBe(50) // 0.5% of 10000
    })

    it('calculates repayment commission for HDFC Visa/RuPay correctly', () => {
      const result = calculateCommission(10000, 'hdfc_visa_rupay', 'repayment')
      expect(result).toBe(70) // 0.7% of 10000
    })

    it('returns 0 for invalid card type', () => {
      const result = calculateCommission(10000, 'invalid_type' as CardType, 'withdrawal')
      expect(result).toBe(0)
    })

    it('handles zero amount', () => {
      const result = calculateCommission(0, 'normal_upi', 'withdrawal')
      expect(result).toBe(0)
    })

    it('handles negative amount', () => {
      const result = calculateCommission(-1000, 'normal_upi', 'withdrawal')
      expect(result).toBe(-20)
    })
  })

  describe('getCardTypesForTransaction', () => {
    it('returns withdrawal card types', () => {
      const types = getCardTypesForTransaction('withdrawal')
      expect(types).toContain('normal_upi')
      expect(types).toContain('premium_upi')
      expect(types).toContain('qr_code')
      expect(types).not.toContain('all_visa_rupay')
    })

    it('returns repayment card types', () => {
      const types = getCardTypesForTransaction('repayment')
      expect(types).toContain('all_visa_rupay')
      expect(types).toContain('hdfc_visa_rupay')
      expect(types).toContain('all_master_cards')
      expect(types).not.toContain('normal_upi')
    })
  })

  describe('getCardTypeDisplayNameWithRate', () => {
    it('returns display name with rate for withdrawal', () => {
      const display = getCardTypeDisplayNameWithRate('normal_upi', 'withdrawal')
      expect(display).toContain('Normal UPI')
      expect(display).toContain('2%')
    })

    it('returns display name with rate for repayment', () => {
      const display = getCardTypeDisplayNameWithRate('all_visa_rupay', 'repayment')
      expect(display).toContain('All Visa & RuPay')
      expect(display).toContain('0.5%')
    })
  })
})
