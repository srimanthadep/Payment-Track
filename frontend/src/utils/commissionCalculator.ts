/**
 * Commission calculation utility based on card type and transaction type
 * 
 * Withdraw fees:
 * - Normal VISA Cards: 1.59%
 * - Normal RUPAY Cards: 1.8%
 * - Normal Master Card: 2%
 * - HDFC (VISA): 1.8%
 * - HDFC (RUPAY): 2%
 * - HDFC Master Card: 2.3%
 * - HDFC Business Card: 2.5%
 * - AU cards: 2.3%
 * - Amex And Diners: 3.5%
 * - Machine Swiping: 2.5%
 * 
 * Repay fees:
 * - ALL VISA & RUPAY: 2.5%
 * - HDFC VISA & RUPAY: 2.7%
 * - ALL MASTER CARDS: 3%
 * - ALL BUSINESS CARDS: 3%
 */

export type CardType =
  | "normal_visa"
  | "normal_rupay"
  | "normal_master"
  | "hdfc_visa"
  | "hdfc_rupay"
  | "hdfc_master"
  | "hdfc_business"
  | "au_card"
  | "amex_diners"
  | "machine_swiping"
  // Repayment grouped types
  | "all_visa_rupay"
  | "hdfc_visa_rupay"
  | "all_master_cards"
  | "all_business_cards";

export type TransactionType = "withdrawal" | "repayment";

// Withdraw commission rates
const WITHDRAW_RATES: Record<string, number> = {
  normal_visa: 1.59,
  normal_rupay: 1.8,
  normal_master: 2.0,
  hdfc_visa: 1.8,
  hdfc_rupay: 2.0,
  hdfc_master: 2.3,
  hdfc_business: 2.5,
  au_card: 2.3,
  amex_diners: 3.5,
  machine_swiping: 2.5,
};

// Repay commission rates (grouped)
const REPAY_RATES_GROUPED: Record<string, number> = {
  all_visa_rupay: 2.5,
  hdfc_visa_rupay: 2.7,
  all_master_cards: 3.0,
  all_business_cards: 3.0,
};

// Repay commission rates
const REPAY_RATES: Record<string, number> = {
  // ALL VISA & RUPAY (including HDFC)
  visa: 2.5,
  rupay: 2.5,
  hdfc_visa: 2.7,
  hdfc_rupay: 2.7,
  // ALL MASTER CARDS
  master: 3.0,
  hdfc_master: 3.0,
  // ALL BUSINESS CARDS
  business: 3.0,
  hdfc_business: 3.0,
  // Others
  au_card: 3.0,
  amex_diners: 3.0,
  machine_swiping: 3.0,
};

/**
 * Calculate commission based on card type and transaction type
 */
export function calculateCommission(
  amount: number,
  cardType: CardType | null,
  transactionType: TransactionType
): number {
  if (!cardType) {
    // Fallback to 0 if no card type selected
    return 0;
  }

  let rate: number;

  if (transactionType?.toLowerCase() === "withdrawal") {
    rate = WITHDRAW_RATES[cardType] || 0;
  } else {
    // Repayment - check if it's a grouped type first
    if (cardType in REPAY_RATES_GROUPED) {
      rate = REPAY_RATES_GROUPED[cardType];
    } else {
      // Legacy individual card type mapping
      if (cardType === "normal_visa" || cardType === "hdfc_visa") {
        rate = cardType === "hdfc_visa" ? REPAY_RATES.hdfc_visa : REPAY_RATES.visa;
      } else if (cardType === "normal_rupay" || cardType === "hdfc_rupay") {
        rate = cardType === "hdfc_rupay" ? REPAY_RATES.hdfc_rupay : REPAY_RATES.rupay;
      } else if (cardType === "normal_master" || cardType === "hdfc_master") {
        rate = REPAY_RATES.master;
      } else if (cardType === "hdfc_business") {
        rate = REPAY_RATES.business;
      } else {
        // AU, Amex/Diners, Machine Swiping
        rate = REPAY_RATES[cardType] || 3.0;
      }
    }
  }

  return (amount * rate) / 100;
}

/**
 * Get card type display name
 */
export function getCardTypeDisplayName(cardType: CardType): string {
  const names: Record<CardType, string> = {
    normal_visa: "Normal VISA",
    normal_rupay: "Normal RUPAY",
    normal_master: "Normal Master Card",
    hdfc_visa: "HDFC (VISA)",
    hdfc_rupay: "HDFC (RUPAY)",
    hdfc_master: "HDFC Master Card",
    hdfc_business: "HDFC Business Card",
    au_card: "AU Cards",
    amex_diners: "Amex And Diners",
    machine_swiping: "Machine Swiping",
    // Repayment grouped types
    all_visa_rupay: "ALL VISA & RUPAY",
    hdfc_visa_rupay: "HDFC VISA & RUPAY",
    all_master_cards: "ALL MASTER CARDS",
    all_business_cards: "ALL BUSINESS CARDS",
  };
  return names[cardType] || cardType;
}

/**
 * Get the commission rate for a card type based on transaction type
 */
export function getCardTypeRate(
  cardType: CardType,
  transactionType: TransactionType
): number {
  if (transactionType?.toLowerCase() === "withdrawal") {
    return WITHDRAW_RATES[cardType] || 0;
  } else {
    // Repayment - check if it's a grouped type first
    if (cardType in REPAY_RATES_GROUPED) {
      return REPAY_RATES_GROUPED[cardType];
    } else {
      // Legacy individual card type mapping
      if (cardType === "normal_visa" || cardType === "hdfc_visa") {
        return cardType === "hdfc_visa" ? REPAY_RATES.hdfc_visa : REPAY_RATES.visa;
      } else if (cardType === "normal_rupay" || cardType === "hdfc_rupay") {
        return cardType === "hdfc_rupay" ? REPAY_RATES.hdfc_rupay : REPAY_RATES.rupay;
      } else if (cardType === "normal_master" || cardType === "hdfc_master") {
        return REPAY_RATES.master;
      } else if (cardType === "hdfc_business") {
        return REPAY_RATES.business;
      } else {
        // AU, Amex/Diners, Machine Swiping
        return REPAY_RATES[cardType] || 3.0;
      }
    }
  }
}

/**
 * Get card type display name with rate
 */
export function getCardTypeDisplayNameWithRate(
  cardType: CardType,
  transactionType: TransactionType
): string {
  const name = getCardTypeDisplayName(cardType);
  const rate = getCardTypeRate(cardType, transactionType);
  return `${name} (${rate}%)`;
}

/**
 * Get all card types for withdrawal dropdown
 */
export function getAllCardTypes(): CardType[] {
  return [
    "normal_visa",
    "normal_rupay",
    "normal_master",
    "hdfc_visa",
    "hdfc_rupay",
    "hdfc_master",
    "hdfc_business",
    "au_card",
    "amex_diners",
    "machine_swiping",
  ];
}

/**
 * Get card types for repayment dropdown (grouped)
 */
export function getRepaymentCardTypes(): CardType[] {
  return [
    "all_visa_rupay",
    "hdfc_visa_rupay",
    "all_master_cards",
    "all_business_cards",
  ];
}

/**
 * Get card types for dropdown based on transaction type
 */
export function getCardTypesForTransaction(transactionType: TransactionType): CardType[] {
  if (transactionType?.toLowerCase() === "repayment") {
    return getRepaymentCardTypes();
  }
  return getAllCardTypes();
}

