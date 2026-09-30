import { invokeBackendApi } from "@/integrations/backend/api";

export interface WhatsAppWelcomePayload {
  customerName: string;
  phone: string;
  userId: string;
  customerId?: string;
}

export interface WhatsAppReceiptPayload {
  customerName: string;
  phone: string;
  userId: string;
  customerId?: string;
  transactionId?: string;
  pdfUrl?: string;
  pdfFilename?: string;
  transaction: {
    amount: number;
    portalName: string;
    transactionDate: string;
    transactionType: string;
    commission: number;
    cardType?: string;
  };
}

export interface WhatsAppStatusResponse {
  configured: boolean;
  phoneNumberId?: string;
  apiVersion?: string;
}

export interface WhatsAppLogEntry {
  id: number;
  phone: string;
  action: "welcome" | "receipt" | "test" | string;
  message?: string | null;
  status: "sent" | "failed";
  error?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  transaction_id?: string | null;
  user_id?: string | null;
  created_at: string;
}

/**
 * Normalizes a phone number to WhatsApp-compatible format with +91 default.
 * Strips non-digits, adds 91 prefix if needed.
 */
export function formatPhoneForWhatsApp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;

  // Already has country code (12+ digits starting with 91)
  if (digits.length >= 12 && digits.startsWith("91")) {
    return digits;
  }
  // 11 digits starting with 0 (local format)
  if (digits.length === 11 && digits.startsWith("0")) {
    return "91" + digits.slice(1);
  }
  // 10-digit Indian number
  if (digits.length === 10) {
    return "91" + digits;
  }
  // Fallback: return as-is (could be international)
  return digits;
}

export const whatsappService = {
  /**
   * Sends a welcome message to a newly added customer via WhatsApp.
   * Non-blocking — caller should fire-and-forget.
   */
  async sendWelcome(payload: WhatsAppWelcomePayload): Promise<{ success: boolean; error?: string }> {
    const waPhone = formatPhoneForWhatsApp(payload.phone);
    if (!waPhone) {
      return { success: false, error: "Invalid phone number" };
    }

    try {
      const { data, error } = await invokeBackendApi("whatsapp/send-welcome", {
        customerName: payload.customerName,
        phone: waPhone,
        userId: payload.userId,
        customerId: payload.customerId,
      });

      if (error) {
        console.warn("WhatsApp welcome message failed:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.warn("WhatsApp welcome message error:", err);
      return { success: false, error: err.message || "Unknown error" };
    }
  },

  /**
   * Sends a transaction receipt to a customer via WhatsApp.
   * Non-blocking — caller should fire-and-forget.
   */
  async sendReceipt(payload: WhatsAppReceiptPayload): Promise<{ success: boolean; error?: string }> {
    const waPhone = formatPhoneForWhatsApp(payload.phone);
    if (!waPhone) {
      return { success: false, error: "Invalid phone number" };
    }

    try {
      const { data, error } = await invokeBackendApi("whatsapp/send-receipt", {
        customerName: payload.customerName,
        phone: waPhone,
        userId: payload.userId,
        customerId: payload.customerId,
        transactionId: payload.transactionId,
        pdfUrl: payload.pdfUrl,
        pdfFilename: payload.pdfFilename,
        transaction: payload.transaction,
      });

      if (error) {
        console.warn("WhatsApp receipt message failed:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      console.warn("WhatsApp receipt message error:", err);
      return { success: false, error: err.message || "Unknown error" };
    }
  },

  /**
   * Checks if WhatsApp is configured on the backend (env vars present).
   */
  async checkStatus(): Promise<WhatsAppStatusResponse> {
    try {
      const { data, error } = await invokeBackendApi("whatsapp/status", {});
      if (error || !data) {
        return { configured: false };
      }
      return data as WhatsAppStatusResponse;
    } catch {
      return { configured: false };
    }
  },

  /**
   * Sends a test verification message to verify the connection.
   */
  async sendTestMessage(phone: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const waPhone = formatPhoneForWhatsApp(phone);
    if (!waPhone) {
      return { success: false, error: "Please enter a valid 10-digit phone number" };
    }

    try {
      const { data, error } = await invokeBackendApi("whatsapp/send-test", {
        phone: waPhone,
        userId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Unknown error" };
    }
  },

  /**
   * Fetches recent WhatsApp message audit logs.
   */
  async getLogs(userId?: string, limit: number = 50): Promise<WhatsAppLogEntry[]> {
    try {
      const { data, error } = await invokeBackendApi("whatsapp/logs", {
        userId,
        limit,
      });

      if (error || !data || !Array.isArray(data.logs)) {
        return [];
      }

      return data.logs as WhatsAppLogEntry[];
    } catch {
      return [];
    }
  },
};
