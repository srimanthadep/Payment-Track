import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  customerService,
  CustomerRecord,
  searchCustomers,
  normalizePhone,
} from "@/services/customerService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Phone, User, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomerValue {
  id: string | null;
  name: string;
  phone: string;
  isNew?: boolean;
}

interface CustomerComboboxProps {
  userId: string;
  value: CustomerValue | null;
  onChange: (customer: CustomerValue | null) => void;
  disabled?: boolean;
  className?: string;
}

export const CustomerCombobox: React.FC<CustomerComboboxProps> = ({
  userId,
  value,
  onChange,
  disabled = false,
  className,
}) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);

  // Local inputs: Phone is primary, Name is secondary
  const [phoneInput, setPhoneInput] = useState(value?.phone || "");
  const [nameInput, setNameInput] = useState(value?.name || "");
  const [selectedId, setSelectedId] = useState<string | null>(value?.id || null);

  // Active field triggering suggestions: "phone" | "name"
  const [activeField, setActiveField] = useState<"phone" | "name">("phone");

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load existing customers
  useEffect(() => {
    let isMounted = true;
    const fetchCustomers = async () => {
      if (!userId) return;
      const { data } = await customerService.loadCustomers(userId);
      if (isMounted && data) {
        setCustomers(data);
      }
    };
    fetchCustomers();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Sync when parent value changes
  useEffect(() => {
    setPhoneInput(value?.phone || "");
    setNameInput(value?.name || "");
    setSelectedId(value?.id || null);
  }, [value?.id, value?.name, value?.phone]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered suggestions based on the active field's input (or fallback to other input)
  const suggestions = useMemo(() => {
    const activeQuery =
      activeField === "phone"
        ? phoneInput.trim() || nameInput.trim()
        : nameInput.trim() || phoneInput.trim();

    if (!activeQuery) {
      return [...customers]
        .sort((a, b) => {
          const txA = a.transaction_count || 0;
          const txB = b.transaction_count || 0;
          if (txB !== txA) return txB - txA;
          const dateA = a.last_transaction_date || a.updated_at || "";
          const dateB = b.last_transaction_date || b.updated_at || "";
          return dateB.localeCompare(dateA);
        })
        .slice(0, 6);
    }

    return searchCustomers(activeQuery, customers);
  }, [activeField, phoneInput, nameInput, customers]);

  // 1. Phone number handler (PRIMARY)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value;
    setPhoneInput(newPhone);
    setActiveField("phone");
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);

    const cleanDigits = newPhone.replace(/\D/g, "");
    const norm = normalizePhone(newPhone);

    // Exact phone match check across customers
    const matchByPhone = customers.find((c) => {
      const cDigits = (c.phone || "").replace(/\D/g, "");
      const cNorm = normalizePhone(c.phone);
      return (
        (cleanDigits.length >= 10 && (cDigits === cleanDigits || cNorm === cleanDigits)) ||
        (norm && (cNorm === norm || cDigits === norm))
      );
    });

    let matchedId = matchByPhone ? matchByPhone.id : null;
    let finalName = nameInput;

    // If an existing customer matches by 10-digit phone, auto-populate customer name
    if (matchByPhone && matchByPhone.name) {
      finalName = matchByPhone.name;
      setNameInput(matchByPhone.name);
    }

    setSelectedId(matchedId);

    onChange({
      id: matchedId,
      name: finalName,
      phone: newPhone,
      isNew: !matchedId,
    });
  };

  // 2. Customer name handler (SECONDARY)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNameInput(newName);
    setActiveField("name");
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);

    const matchingCustomer = customers.find(
      (c) => c.name.toLowerCase() === newName.trim().toLowerCase()
    );

    const newId = matchingCustomer ? matchingCustomer.id : null;
    let finalPhone = phoneInput;

    // If matching customer found by name and phone was empty, auto-populate phone
    if (matchingCustomer && matchingCustomer.phone && !phoneInput) {
      finalPhone = matchingCustomer.phone;
      setPhoneInput(matchingCustomer.phone);
    }

    setSelectedId(newId);

    onChange({
      id: newId,
      name: newName,
      phone: finalPhone,
      isNew: !newId,
    });
  };

  const handleSelectSuggestion = (cust: CustomerRecord) => {
    const resolvedPhone = cust.phone || "";
    const resolvedName = cust.name;

    setPhoneInput(resolvedPhone);
    setNameInput(resolvedName);
    setSelectedId(cust.id);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);

    onChange({
      id: cust.id,
      name: resolvedName,
      phone: resolvedPhone,
      isNew: false,
    });
  };

  const handleClearPhone = () => {
    setPhoneInput("");
    if (!nameInput) {
      setSelectedId(null);
      onChange(null);
    } else {
      setSelectedId(null);
      onChange({
        id: null,
        name: nameInput,
        phone: "",
        isNew: true,
      });
    }
    phoneInputRef.current?.focus();
  };

  const handleClearName = () => {
    setNameInput("");
    if (!phoneInput) {
      setSelectedId(null);
      onChange(null);
    } else {
      setSelectedId(null);
      onChange({
        id: null,
        name: "",
        phone: phoneInput,
        isNew: true,
      });
    }
    nameInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown") {
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* 1. Phone Number (FIRST & IMPORTANT) */}
        <div className="space-y-1.5 sm:space-y-2 relative">
          <Label
            htmlFor="customer_phone"
            className="text-xs sm:text-sm font-semibold flex items-center justify-between truncate"
          >
            <span className="flex items-center gap-1.5 text-foreground">
              <Phone className="h-3.5 w-3.5 text-primary" />
              Phone Number
            </span>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
              Important
            </span>
          </Label>

          <div className="relative">
            <Input
              ref={phoneInputRef}
              id="customer_phone"
              type="tel"
              placeholder="e.g. 9876543210"
              value={phoneInput}
              onChange={handlePhoneChange}
              onFocus={() => {
                setActiveField("phone");
                if (customers.length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              autoComplete="off"
              className={phoneInput ? "pr-8" : ""}
            />
            {phoneInput ? (
              <button
                type="button"
                onClick={handleClearPhone}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                tabIndex={-1}
                aria-label="Clear phone"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* 2. Customer Name (SECOND) */}
        <div className="space-y-1.5 sm:space-y-2 relative">
          <Label
            htmlFor="customer_name"
            className="text-xs sm:text-sm font-medium flex items-center justify-between truncate"
          >
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Customer Name
            </span>
            <span className="text-[10px] font-normal text-muted-foreground">
              Auto-fill / Optional
            </span>
          </Label>

          <div className="relative">
            <Input
              ref={nameInputRef}
              id="customer_name"
              type="text"
              placeholder="Enter customer name"
              value={nameInput}
              onChange={handleNameChange}
              onFocus={() => {
                setActiveField("name");
                if (customers.length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              autoComplete="off"
              className={nameInput ? "pr-8" : ""}
            />
            {nameInput ? (
              <button
                type="button"
                onClick={handleClearName}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                tabIndex={-1}
                aria-label="Clear customer name"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Unified Autocomplete Dropdown across Phone & Name */}
      {isDropdownOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 overflow-hidden rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md p-1.5 text-popover-foreground shadow-xl animate-in fade-in-80 max-h-60 overflow-y-auto">
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between border-b border-border/40 mb-1">
            <span className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              {activeField === "phone"
                ? "Matching Phone Numbers & Customers"
                : "Matching Customers & Phone Numbers"}
            </span>
            <span>{suggestions.length} found</span>
          </div>

          {suggestions.map((cust, idx) => {
            const isSelected = selectedId === cust.id;
            return (
              <button
                key={cust.id}
                type="button"
                onClick={() => handleSelectSuggestion(cust)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center justify-between rounded-lg px-2.5 py-2 text-sm outline-none transition-colors",
                  highlightedIndex === idx || isSelected
                    ? "bg-accent text-accent-foreground font-medium"
                    : "hover:bg-accent/60 text-popover-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2 text-left">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold",
                      cust.phone
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {cust.phone ? (
                      <Phone className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground tracking-tight">
                        {cust.phone || "No Phone"}
                      </span>
                      {cust.name && (
                        <span className="text-xs text-muted-foreground truncate">
                          • {cust.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {cust.transaction_count ? (
                    <span className="text-[11px] bg-muted/70 text-muted-foreground px-2 py-0.5 rounded-full font-normal">
                      {cust.transaction_count} txn
                      {cust.transaction_count > 1 ? "s" : ""}
                    </span>
                  ) : null}
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
