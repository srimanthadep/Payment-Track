import { supabase } from "@/integrations/supabase/client";

export interface CustomerRecord {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  phone_normalized: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  transaction_count?: number;
  last_transaction_date?: string | null;
}

export interface CustomerTransaction {
  id: string;
  portal_id: string;
  portal_name: string;
  amount: number;
  commission: number;
  site_fee: number;
  profit: number;
  transaction_type: string;
  card_type: string | null;
  transaction_date: string;
  status: string;
  customer_id?: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
}

export interface CustomerProfile {
  id: string; // Customer UUID
  name: string;
  phone: string | null;
  notes?: string | null;
  totalTransactions: number;
  totalVolume: number;
  totalCommission: number;
  totalSiteFee: number;
  totalProfit: number;
  avgTicketSize: number;
  firstTransactionDate: string;
  lastTransactionDate: string;
  portals: string[];
  transactions: CustomerTransaction[];
}

export interface CustomerSummaryStats {
  totalCustomers: number;
  totalCustomerVolume: number;
  totalCustomerProfit: number;
  avgCustomerLifetimeValue: number;
  topCustomer: CustomerProfile | null;
}

/**
 * Parses customer name and phone from notes if not directly present in columns
 */
export const extractCustomerFromNotes = (notes?: string | null) => {
  if (!notes) return { name: null, phone: null };
  const nameMatch = notes.match(/Customer:\s*([^|]+)/i);
  const phoneMatch = notes.match(/Phone:\s*([^|]+)/i);
  const name = nameMatch ? nameMatch[1].trim() : null;
  const phone = phoneMatch ? phoneMatch[1].trim() : null;
  return {
    name: name && name.length > 0 ? name : null,
    phone: phone && phone.length > 0 ? phone : null,
  };
};

/**
 * Normalizes phone numbers (strips non-digits, leading +91 / 0)
 */
export const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // If Indian standard with 91 prefix and 12 digits total
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  // If 11 digits starting with 0
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits;
};

/**
 * Capitalizes customer names nicely
 */
export const formatCustomerName = (name: string): string => {
  if (!name) return "Unknown Customer";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

/**
 * Multi-field, case-insensitive, prefix + contains in-memory search
 */
export const searchCustomers = (query: string, customers: CustomerRecord[]): CustomerRecord[] => {
  const q = query.trim().toLowerCase();
  if (!q) return customers.slice(0, 8);

  const cleanDigits = q.replace(/\D/g, "");
  const isPhoneQuery = cleanDigits.length >= 2;
  const queryTokens = q.split(/\s+/).filter(Boolean);

  interface ScoredCustomer {
    customer: CustomerRecord;
    score: number;
  }

  const scored: ScoredCustomer[] = [];

  for (const c of customers) {
    let score = 0;
    const nameLower = (c.name || "").toLowerCase();
    const phoneNorm = c.phone_normalized || (c.phone ? normalizePhone(c.phone) : "");

    // 1. Phone matching
    if (isPhoneQuery && phoneNorm) {
      if (phoneNorm === cleanDigits) {
        score += 120;
      } else if (phoneNorm.startsWith(cleanDigits)) {
        score += 90;
      } else if (phoneNorm.includes(cleanDigits)) {
        score += 50;
      }
    }

    // 2. Name matching
    if (nameLower === q) {
      score += 100;
    } else if (nameLower.startsWith(q)) {
      score += 80;
    } else if (nameLower.includes(q)) {
      score += 60;
    } else if (queryTokens.length > 1) {
      const allTokensMatch = queryTokens.every((tok) => nameLower.includes(tok));
      if (allTokensMatch) {
        score += 70;
      }
    }

    if (score > 0) {
      // Small bonus for frequent customers
      const txBonus = Math.min((c.transaction_count || 0) * 2, 10);
      score += txBonus;
      scored.push({ customer: c, score });
    }
  }

  // Sort primarily by score desc, secondarily by last transaction date or updated_at desc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dateA = a.customer.last_transaction_date || a.customer.updated_at || "";
    const dateB = b.customer.last_transaction_date || b.customer.updated_at || "";
    return dateB.localeCompare(dateA);
  });

  return scored.slice(0, 8).map((s) => s.customer);
};

export const customerService = {
  /**
   * Eager-loads all customers for a given user from customers table
   */
  async loadCustomers(userId: string): Promise<{ data: CustomerRecord[]; error: any }> {
    try {
      const { data: customerRows, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (custErr) throw custErr;

      // Fetch transaction counts for these customers
      const { data: txns, error: txnErr } = await supabase
        .from("transactions")
        .select("customer_id, transaction_date")
        .eq("user_id", userId)
        .not("customer_id", "is", null);

      const countMap = new Map<string, { count: number; lastDate: string }>();
      if (!txnErr && txns) {
        for (const t of txns) {
          if (!t.customer_id) continue;
          const current = countMap.get(t.customer_id) || { count: 0, lastDate: "" };
          current.count += 1;
          if (!current.lastDate || new Date(t.transaction_date) > new Date(current.lastDate)) {
            current.lastDate = t.transaction_date;
          }
          countMap.set(t.customer_id, current);
        }
      }

      const records: CustomerRecord[] = (customerRows || []).map((c) => {
        const stats = countMap.get(c.id);
        return {
          ...c,
          transaction_count: stats?.count || 0,
          last_transaction_date: stats?.lastDate || null,
        };
      });

      return { data: records, error: null };
    } catch (error) {
      console.error("Error loading customers:", error);
      return { data: [], error };
    }
  },

  /**
   * Creates a new customer record with normalization and duplicate check
   */
  async createCustomer(
    userId: string,
    name: string,
    phone?: string | null,
    notes?: string | null
  ): Promise<{ data: CustomerRecord | null; error: any }> {
    try {
      const trimmedName = formatCustomerName(name.trim());
      const trimmedPhone = phone?.trim() || null;
      const phoneNorm = normalizePhone(trimmedPhone);

      // If phone exists, check if customer already exists for this user
      if (phoneNorm) {
        const { data: existing } = await supabase
          .from("customers")
          .select("*")
          .eq("user_id", userId)
          .eq("phone_normalized", phoneNorm)
          .maybeSingle();

        if (existing) {
          return { data: existing as CustomerRecord, error: null };
        }
      }

      const { data, error } = await supabase
        .from("customers")
        .insert({
          user_id: userId,
          name: trimmedName,
          phone: trimmedPhone,
          phone_normalized: phoneNorm,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate constraint violation
        if (error.code === "23505" && phoneNorm) {
          const { data: existing } = await supabase
            .from("customers")
            .select("*")
            .eq("user_id", userId)
            .eq("phone_normalized", phoneNorm)
            .maybeSingle();
          if (existing) {
            return { data: existing as CustomerRecord, error: null };
          }
        }
        return { data: null, error };
      }

      return { data: data as CustomerRecord, error: null };
    } catch (error) {
      console.error("Error creating customer:", error);
      return { data: null, error };
    }
  },

  /**
   * Updates an existing customer's details
   */
  async updateCustomer(
    customerId: string,
    data: { name?: string; phone?: string | null; notes?: string | null }
  ): Promise<{ data: CustomerRecord | null; error: any }> {
    try {
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (data.name !== undefined) {
        updatePayload.name = formatCustomerName(data.name.trim());
      }
      if (data.phone !== undefined) {
        updatePayload.phone = data.phone?.trim() || null;
        updatePayload.phone_normalized = normalizePhone(data.phone);
      }
      if (data.notes !== undefined) {
        updatePayload.notes = data.notes;
      }

      const { data: updated, error } = await supabase
        .from("customers")
        .update(updatePayload)
        .eq("id", customerId)
        .select()
        .single();

      if (error) return { data: null, error };
      return { data: updated as CustomerRecord, error: null };
    } catch (error) {
      console.error("Error updating customer:", error);
      return { data: null, error };
    }
  },

  /**
   * Deletes a customer record and detaches linked transactions safely
   */
  async deleteCustomer(
    userId: string,
    customerId: string,
    fallback?: { name?: string | null; phone?: string | null }
  ): Promise<{ error: any }> {
    try {
      const txUpdatePayload = {
        customer_id: null,
        customer_name: fallback?.name || null,
        customer_phone: fallback?.phone || null,
      };

      const { error: txError } = await supabase
        .from("transactions")
        .update(txUpdatePayload)
        .eq("user_id", userId)
        .eq("customer_id", customerId);

      if (txError) return { error: txError };

      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("user_id", userId)
        .eq("id", customerId);

      return { error };
    } catch (error) {
      console.error("Error deleting customer:", error);
      return { error };
    }
  },

  /**
   * Fetches full customer profiles with all associated transactions for CRM view
   */
  async getCustomers(userId: string): Promise<{ data: CustomerProfile[]; error: any }> {
    try {
      // 1. Fetch canonical customers
      const { data: customerRows, error: custErr } = await supabase
        .from("customers")
        .select("*")
        .eq("user_id", userId);

      if (custErr) throw custErr;

      // 2. Fetch all transactions
      const { data: rawTxns, error: txnErr } = await supabase
        .from("transactions")
        .select(`
          id,
          portal_id,
          transaction_type,
          amount,
          commission,
          site_fee,
          profit,
          transaction_date,
          status,
          card_type,
          notes,
          customer_id,
          customer_name,
          customer_phone,
          portals (
            name
          )
        `)
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false });

      if (txnErr) throw txnErr;

      const customerMap = new Map<string, CustomerProfile>();

      // Pre-populate canonical customers from customers table
      for (const c of customerRows || []) {
        customerMap.set(c.id, {
          id: c.id,
          name: c.name,
          phone: c.phone || null,
          notes: c.notes || null,
          totalTransactions: 0,
          totalVolume: 0,
          totalCommission: 0,
          totalSiteFee: 0,
          totalProfit: 0,
          avgTicketSize: 0,
          firstTransactionDate: c.created_at,
          lastTransactionDate: c.created_at,
          portals: [],
          transactions: [],
        });
      }

      // Process transactions and attach to customers
      for (const t of rawTxns || []) {
        const fromNotes = extractCustomerFromNotes(t.notes);
        const rawName = (t.customer_name?.trim() || fromNotes.name || "").trim();
        const rawPhone = (t.customer_phone?.trim() || fromNotes.phone || "").trim();

        // If no customer_id and no customer name/phone, skip
        if (!t.customer_id && !rawName && !rawPhone) {
          continue;
        }

        const amount = Number(t.amount || 0);
        const commission = Number(t.commission || 0);
        const siteFee = Number(t.site_fee || 0);
        const profit =
          t.profit !== null && t.profit !== undefined
            ? Number(t.profit)
            : commission - siteFee;
        const portalName = (t.portals as any)?.name || "Unknown Portal";

        const customerTxn: CustomerTransaction = {
          id: t.id,
          portal_id: t.portal_id,
          portal_name: portalName,
          amount,
          commission,
          site_fee: siteFee,
          profit,
          transaction_type: t.transaction_type || "withdrawal",
          card_type: t.card_type,
          transaction_date: t.transaction_date,
          status: t.status || "completed",
          customer_id: t.customer_id,
          customer_name: rawName || null,
          customer_phone: rawPhone || null,
          notes: t.notes,
        };

        // Determine target customer
        let targetCust: CustomerProfile | undefined;

        if (t.customer_id && customerMap.has(t.customer_id)) {
          targetCust = customerMap.get(t.customer_id);
        } else if (rawPhone || rawName) {
          // Check by normalized phone match among canonical customers
          const normPh = normalizePhone(rawPhone);
          if (normPh) {
            targetCust = Array.from(customerMap.values()).find(
              (c) => normalizePhone(c.phone) === normPh
            );
          }
          // Or by name match
          if (!targetCust && rawName) {
            targetCust = Array.from(customerMap.values()).find(
              (c) => c.name.toLowerCase() === rawName.toLowerCase()
            );
          }

          // If still not matched, create an in-memory profile for legacy record
          if (!targetCust) {
            const legacyKey = normPh ? `phone:${normPh}` : `name:${rawName.toLowerCase()}`;
            if (customerMap.has(legacyKey)) {
              targetCust = customerMap.get(legacyKey);
            } else {
              targetCust = {
                id: legacyKey,
                name: formatCustomerName(rawName || "Customer " + (rawPhone || "Unknown")),
                phone: rawPhone || null,
                totalTransactions: 0,
                totalVolume: 0,
                totalCommission: 0,
                totalSiteFee: 0,
                totalProfit: 0,
                avgTicketSize: 0,
                firstTransactionDate: t.transaction_date,
                lastTransactionDate: t.transaction_date,
                portals: [],
                transactions: [],
              };
              customerMap.set(legacyKey, targetCust);
            }
          }
        }

        if (targetCust) {
          targetCust.totalTransactions += 1;
          targetCust.totalVolume += amount;
          targetCust.totalCommission += commission;
          targetCust.totalSiteFee += siteFee;
          targetCust.totalProfit += profit;
          targetCust.avgTicketSize = targetCust.totalVolume / targetCust.totalTransactions;

          if (
            !targetCust.firstTransactionDate ||
            new Date(t.transaction_date) < new Date(targetCust.firstTransactionDate)
          ) {
            targetCust.firstTransactionDate = t.transaction_date;
          }
          if (
            !targetCust.lastTransactionDate ||
            new Date(t.transaction_date) > new Date(targetCust.lastTransactionDate)
          ) {
            targetCust.lastTransactionDate = t.transaction_date;
          }

          if (!targetCust.portals.includes(portalName)) {
            targetCust.portals.push(portalName);
          }

          targetCust.transactions.push(customerTxn);
        }
      }

      // Filter out empty customers if desired or keep all
      const customersList = Array.from(customerMap.values())
        .map((c) => ({
          ...c,
          transactions: c.transactions.sort(
            (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
          ),
        }))
        .sort((a, b) => b.totalVolume - a.totalVolume);

      return { data: customersList, error: null };
    } catch (err) {
      console.error("Error in customerService.getCustomers:", err);
      return { data: [], error: err };
    }
  },

  /**
   * Calculates KPI stats for customer list
   */
  calculateStats(customers: CustomerProfile[]): CustomerSummaryStats {
    if (!customers || customers.length === 0) {
      return {
        totalCustomers: 0,
        totalCustomerVolume: 0,
        totalCustomerProfit: 0,
        avgCustomerLifetimeValue: 0,
        topCustomer: null,
      };
    }

    const totalCustomers = customers.length;
    const totalCustomerVolume = customers.reduce((sum, c) => sum + c.totalVolume, 0);
    const totalCustomerProfit = customers.reduce((sum, c) => sum + c.totalProfit, 0);
    const avgCustomerLifetimeValue = totalCustomers > 0 ? totalCustomerVolume / totalCustomers : 0;
    const topCustomer = customers.reduce(
      (top, current) => (current.totalVolume > (top?.totalVolume || 0) ? current : top),
      customers[0] || null
    );

    return {
      totalCustomers,
      totalCustomerVolume,
      totalCustomerProfit,
      avgCustomerLifetimeValue,
      topCustomer,
    };
  },
};
