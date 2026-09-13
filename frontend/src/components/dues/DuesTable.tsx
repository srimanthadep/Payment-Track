import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Due } from "@/hooks/useDues";
import { EditableCell } from "./EditableCell";
import { AddPaymentDialog } from "./AddPaymentDialog";
import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DuesTableProps {
  dues: Due[];
  isLoading: boolean;
  onUpdateDue: (id: string, updates: Partial<Due>) => Promise<{ success: boolean; error: string | null }>;
  onAddPayment: (
    dueId: string,
    input: { amount: number; date: string; method: string; notes?: string }
  ) => Promise<{ success: boolean; error: string | null }>;
}

const formatCurrency = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusVariantMap: Record<
  Due["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  outstanding: "outline",
  partially_paid: "secondary",
  paid: "default",
  overdue: "destructive",
};

const statusLabelMap: Record<Due["status"], string> = {
  outstanding: "Outstanding",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
};

const toIsoFromDateInput = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export const DuesTable = ({ dues, isLoading, onUpdateDue, onAddPayment }: DuesTableProps) => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [activeDue, setActiveDue] = useState<Due | null>(null);

  const filteredDues = useMemo(() => {
    if (!query.trim()) return dues;
    const q = query.trim().toLowerCase();

    return dues.filter((due) => {
      const owedAmount = Math.max(0, Number(due.principal_amount || 0) - Number(due.amount_paid || 0));
      return (
        (due.borrower_name || "").toLowerCase().includes(q) ||
        (due.borrower_contact || "").toLowerCase().includes(q) ||
        (due.notes || "").toLowerCase().includes(q) ||
        String(due.principal_amount || 0).includes(q) ||
        String(owedAmount).includes(q)
      );
    });
  }, [dues, query]);

  const handleInlineSave = async (due: Due, field: "borrower_name" | "principal_amount" | "expected_return_date" | "notes", rawValue: string) => {
    const updates: Partial<Due> = {};

    if (field === "principal_amount") {
      const parsed = Number(rawValue);
      if (Number.isNaN(parsed) || parsed <= 0) {
        toast({
          title: "Invalid amount",
          description: "Principal amount must be greater than 0.",
          variant: "destructive",
        });
        return;
      }
      updates.principal_amount = parsed;
    } else if (field === "expected_return_date") {
      const iso = toIsoFromDateInput(rawValue);
      if (!iso) {
        toast({
          title: "Invalid date",
          description: "Use YYYY-MM-DD format for expected return date.",
          variant: "destructive",
        });
        return;
      }
      updates.expected_return_date = iso;
    } else if (field === "notes") {
      updates.notes = rawValue;
    } else {
      updates.borrower_name = rawValue;
    }

    const result = await onUpdateDue(due.id, updates);
    if (!result.success && result.error) {
      toast({ title: "Update failed", description: result.error, variant: "destructive" });
    }
  };

  const handleAddPayment = async (input: {
    amount: number;
    date: string;
    method: string;
    notes?: string;
  }) => {
    if (!activeDue) return;
    const result = await onAddPayment(activeDue.id, input);
    if (!result.success && result.error) {
      toast({ title: "Payment failed", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Payment added", description: `Payment recorded for ${activeDue.borrower_name}.` });
    setActiveDue(null);
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search borrower, contact, notes, amount..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-9 text-xs sm:text-sm"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold min-w-[150px]">Borrower</TableHead>
                <TableHead className="text-xs font-semibold min-w-[120px]">Contact</TableHead>
                <TableHead className="text-xs font-semibold min-w-[120px] text-right">Principal</TableHead>
                <TableHead className="text-xs font-semibold min-w-[120px] text-right">Paid</TableHead>
                <TableHead className="text-xs font-semibold min-w-[140px] text-right">Outstanding</TableHead>
                <TableHead className="text-xs font-semibold min-w-[130px]">Expected Return</TableHead>
                <TableHead className="text-xs font-semibold min-w-[130px]">Status</TableHead>
                <TableHead className="text-xs font-semibold min-w-[180px]">Notes</TableHead>
                <TableHead className="text-xs font-semibold min-w-[240px]">Payment History</TableHead>
                <TableHead className="text-xs font-semibold text-center min-w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={10} className="h-14 text-center">
                      <div className="h-4 bg-muted/60 rounded animate-pulse w-4/5 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredDues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-0 border-0">
                    <EmptyState
                      title="No dues found"
                      description="No due records match this filter yet."
                      className="m-4"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredDues.map((due) => {
                  const outstanding = Math.max(
                    0,
                    Number(due.principal_amount || 0) - Number(due.amount_paid || 0)
                  );

                  return (
                    <TableRow key={due.id} className={due.status === "overdue" ? "bg-destructive/5" : ""}>
                      <TableCell>
                        <EditableCell
                          value={due.borrower_name}
                          type="text"
                          onSave={(value) => handleInlineSave(due, "borrower_name", value)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {due.borrower_contact || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={due.principal_amount}
                          type="number"
                          className="text-right"
                          onSave={(value) => handleInlineSave(due, "principal_amount", value)}
                        />
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold text-xs sm:text-sm">
                        {formatCurrency(due.amount_paid)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600 font-bold text-xs sm:text-sm">
                        {formatCurrency(outstanding)}
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={due.expected_return_date ? due.expected_return_date.slice(0, 10) : ""}
                          type="text"
                          onSave={(value) => handleInlineSave(due, "expected_return_date", value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[due.status]}>{statusLabelMap[due.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <EditableCell
                          value={due.notes || ""}
                          type="text"
                          onSave={(value) => handleInlineSave(due, "notes", value)}
                        />
                      </TableCell>
                      <TableCell>
                        {due.payments.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No payments</span>
                        ) : (
                          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                            {due.payments.map((payment) => (
                              <div key={payment.id} className="text-xs rounded-md border border-border/70 bg-muted/20 px-2 py-1">
                                <div className="font-medium text-emerald-600">{formatCurrency(payment.amount)}</div>
                                <div className="text-muted-foreground">
                                  {format(new Date(payment.date), "dd MMM yyyy")} • {payment.method}
                                </div>
                                {payment.notes ? (
                                  <div className="text-muted-foreground truncate">{payment.notes}</div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1"
                          onClick={() => setActiveDue(due)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Payment
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="md:hidden divide-y divide-border">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Loading dues...</div>
          ) : filteredDues.length === 0 ? (
            <EmptyState title="No dues found" description="No due records for this filter." className="m-3" />
          ) : (
            filteredDues.map((due) => {
              const outstanding = Math.max(0, Number(due.principal_amount || 0) - Number(due.amount_paid || 0));
              return (
                <div key={due.id} className={`p-3.5 space-y-3 ${due.status === "overdue" ? "bg-destructive/5" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <EditableCell
                        value={due.borrower_name}
                        type="text"
                        className="px-0 text-sm font-semibold"
                        onSave={(value) => handleInlineSave(due, "borrower_name", value)}
                      />
                      <p className="text-xs text-muted-foreground">{due.borrower_contact || "No contact"}</p>
                    </div>
                    <Badge variant={statusVariantMap[due.status]}>{statusLabelMap[due.status]}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Principal</p>
                      <EditableCell
                        value={due.principal_amount}
                        type="number"
                        onSave={(value) => handleInlineSave(due, "principal_amount", value)}
                      />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Expected Return</p>
                      <EditableCell
                        value={due.expected_return_date ? due.expected_return_date.slice(0, 10) : ""}
                        type="text"
                        onSave={(value) => handleInlineSave(due, "expected_return_date", value)}
                      />
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="text-emerald-600 font-semibold mt-1">{formatCurrency(due.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Outstanding</p>
                      <p className="text-amber-600 font-semibold mt-1">{formatCurrency(outstanding)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <EditableCell
                      value={due.notes || ""}
                      type="text"
                      onSave={(value) => handleInlineSave(due, "notes", value)}
                    />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payment History</p>
                    {due.payments.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No payments</p>
                    ) : (
                      <div className="space-y-1.5">
                        {due.payments.map((payment) => (
                          <div key={payment.id} className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs">
                            <div className="font-medium text-emerald-600">{formatCurrency(payment.amount)}</div>
                            <div className="text-muted-foreground">
                              {format(new Date(payment.date), "dd MMM yyyy")} • {payment.method}
                            </div>
                            {payment.notes ? (
                              <div className="text-muted-foreground">{payment.notes}</div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => setActiveDue(due)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Payment
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddPaymentDialog
        due={activeDue}
        open={!!activeDue}
        onOpenChange={(open) => !open && setActiveDue(null)}
        onSubmit={handleAddPayment}
      />
    </div>
  );
};
