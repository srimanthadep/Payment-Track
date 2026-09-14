import { useState, useMemo } from "react";
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
import { CustomerProfile } from "@/services/customerService";
import {
  Search,
  Phone,
  ArrowUpDown,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  User,
  Sparkles,
  Users,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface CustomersTableProps {
  customers: CustomerProfile[];
  isLoading: boolean;
  onSelectCustomer: (customer: CustomerProfile) => void;
  onAddTransactionClick?: () => void;
  isStaff?: boolean;
}

type SortField = "volume" | "profit" | "transactions" | "date" | "name";
type SortDirection = "asc" | "desc";

export const CustomersTable = ({
  customers,
  isLoading,
  onSelectCustomer,
  onAddTransactionClick,
  isStaff = false,
}: CustomersTableProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("volume");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          c.portals.some((p) => p.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case "volume":
          comp = a.totalVolume - b.totalVolume;
          break;
        case "profit":
          comp = a.totalProfit - b.totalProfit;
          break;
        case "transactions":
          comp = a.totalTransactions - b.totalTransactions;
          break;
        case "date":
          comp =
            new Date(a.lastTransactionDate).getTime() -
            new Date(b.lastTransactionDate).getTime();
          break;
        case "name":
          comp = a.name.localeCompare(b.name);
          break;
      }
      return sortDirection === "desc" ? -comp : comp;
    });

    return list;
  }, [customers, searchQuery, sortField, sortDirection]);

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) return;

    const data = filteredCustomers.map((c, index) => ({
      "S.No": index + 1,
      "Customer Name": c.name,
      "Phone Number": c.phone || "N/A",
      "Total Transactions": c.totalTransactions,
      "Total Volume (₹)": c.totalVolume,
      "Total Profit (₹)": c.totalProfit,
      "Avg Ticket (₹)": Math.round(c.avgTicketSize),
      "First Seen": format(new Date(c.firstTransactionDate), "dd/MM/yyyy"),
      "Last Seen": format(new Date(c.lastTransactionDate), "dd/MM/yyyy"),
      Portals: c.portals.join(", "),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(
      workbook,
      `Customers_Directory_${format(new Date(), "yyyyMMdd")}.xlsx`
    );

    toast({
      title: "Exported",
      description: `Exported ${filteredCustomers.length} customer records to Excel.`,
    });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search and Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, phone, portal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm bg-background/80"
          />
        </div>

        {!isStaff && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1.5 shadow-xs flex-1 sm:flex-initial"
              onClick={handleExportCSV}
              disabled={filteredCustomers.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 py-6">
          <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
          <div className="h-16 bg-muted/20 rounded-xl animate-pulse" />
          <div className="h-16 bg-muted/20 rounded-xl animate-pulse" />
          <div className="h-16 bg-muted/20 rounded-xl animate-pulse" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCustomers.length === 0 && (
        <div className="border border-dashed border-border/80 rounded-2xl p-8 sm:p-12 text-center bg-muted/10">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            {searchQuery ? "No matching customers found" : "No customer records yet"}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            {searchQuery
              ? "Try adjusting your search terms or filter."
              : "When you add a transaction with the Chummi portal, customer name and phone number entries will automatically build your customer CRM directory here."}
          </p>
          {onAddTransactionClick && (
            <Button
              size="sm"
              onClick={onAddTransactionClick}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Transaction
            </Button>
          )}
        </div>
      )}

      {/* Desktop Customers Table */}
      {!isLoading && filteredCustomers.length > 0 && (
        <>
          <div className="hidden md:block border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-card/60 backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    className="text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Customer</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-xs font-semibold text-right cursor-pointer select-none"
                    onClick={() => handleSort("volume")}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Volume</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-xs font-semibold text-center cursor-pointer select-none"
                    onClick={() => handleSort("transactions")}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Visits</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  {!isStaff && (
                    <TableHead
                      className="text-xs font-semibold text-right cursor-pointer select-none"
                      onClick={() => handleSort("profit")}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>Profit Earned</span>
                        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="text-xs font-semibold text-right">
                    Avg Ticket
                  </TableHead>
                  <TableHead
                    className="text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Last Seen</span>
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Portals</TableHead>
                  <TableHead className="text-xs font-semibold text-right">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => {
                  const initials = customer.name
                    .split(" ")
                    .filter(Boolean)
                    .map((w) => w[0]?.toUpperCase())
                    .slice(0, 2)
                    .join("") || "C";

                  return (
                    <TableRow
                      key={customer.id}
                      onClick={() => onSelectCustomer(customer)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    >
                      {/* Customer Info */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary/80 to-indigo-600/80 flex items-center justify-center text-primary-foreground font-bold text-xs shadow-xs ring-1 ring-primary/20 shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                              {customer.name}
                            </div>
                            {customer.phone ? (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{customer.phone}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic">
                                No phone
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Volume */}
                      <TableCell className="text-right font-bold text-sm text-foreground">
                        ₹{customer.totalVolume.toLocaleString("en-IN", {
                          minimumFractionDigits: 0,
                        })}
                      </TableCell>

                      {/* Transactions Count */}
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="text-xs font-semibold px-2 py-0.5"
                        >
                          {customer.totalTransactions}
                        </Badge>
                      </TableCell>

                      {/* Profit */}
                      {!isStaff && (
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          ₹{customer.totalProfit.toLocaleString("en-IN", {
                            minimumFractionDigits: 0,
                          })}
                        </TableCell>
                      )}

                      {/* Avg Ticket */}
                      <TableCell className="text-right text-xs text-muted-foreground">
                        ₹{customer.avgTicketSize.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>

                      {/* Last Seen */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(customer.lastTransactionDate), "dd MMM yyyy")}
                      </TableCell>

                      {/* Portals */}
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap max-w-[140px]">
                          {customer.portals.map((p) => (
                            <Badge
                              key={p}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-background/50"
                            >
                              {p}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-primary group-hover:bg-primary/10 gap-1 rounded-lg"
                        >
                          <span>History</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Customers Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredCustomers.map((customer) => {
              const initials = customer.name
                .split(" ")
                .filter(Boolean)
                .map((w) => w[0]?.toUpperCase())
                .slice(0, 2)
                .join("") || "C";

              return (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="p-3.5 bg-card border border-border/80 rounded-2xl shadow-xs active:bg-muted/50 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary/80 to-indigo-600/80 flex items-center justify-center text-primary-foreground font-bold text-xs shadow-xs">
                        {initials}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-foreground">
                          {customer.name}
                        </div>
                        {customer.phone ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 italic">
                            No phone
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge variant="secondary" className="text-xs font-semibold px-2">
                      {customer.totalTransactions} {customer.totalTransactions === 1 ? "txn" : "txns"}
                    </Badge>
                  </div>

                  <div className={`grid ${isStaff ? "grid-cols-1" : "grid-cols-2"} gap-2 pt-1 text-xs border-t border-border/60`}>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">
                        Total Volume
                      </span>
                      <span className="font-bold text-sm text-foreground">
                        ₹{customer.totalVolume.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {!isStaff && (
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">
                          Total Profit
                        </span>
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          ₹{customer.totalProfit.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>
                      Last: {format(new Date(customer.lastTransactionDate), "dd MMM yyyy")}
                    </span>
                    <span className="text-primary font-medium flex items-center gap-0.5">
                      View details <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
