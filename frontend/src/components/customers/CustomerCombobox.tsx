import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  customerService,
  CustomerRecord,
  searchCustomers,
  normalizePhone,
} from "@/services/customerService";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
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

  // Local inputs
  const [nameInput, setNameInput] = useState(value?.name || "");
  const [phoneInput, setPhoneInput] = useState(value?.phone || "");
  const [selectedId, setSelectedId] = useState<string | null>(value?.id || null);

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
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
    setNameInput(value?.name || "");
    setPhoneInput(value?.phone || "");
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

  // Filtered suggestions
  const suggestions = useMemo(() => {
    if (!nameInput.trim()) {
      return [...customers]
        .sort((a, b) => {
          const dateA = a.last_transaction_date || a.updated_at || "";
          const dateB = b.last_transaction_date || b.updated_at || "";
          return dateB.localeCompare(dateA);
        })
        .slice(0, 5);
    }
    return searchCustomers(nameInput, customers);
  }, [nameInput, customers]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setNameInput(newName);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);

    const matchingCustomer = customers.find(
      (c) => c.name.toLowerCase() === newName.trim().toLowerCase()
    );

    const newId = matchingCustomer ? matchingCustomer.id : null;
    setSelectedId(newId);

    onChange({
      id: newId,
      name: newName,
      phone: phoneInput,
      isNew: !newId,
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhone = e.target.value;
    setPhoneInput(newPhone);

    const norm = normalizePhone(newPhone);
    let matchedId = selectedId;
    if (norm && !matchedId) {
      const matchByPhone = customers.find(
        (c) => (c.phone ? normalizePhone(c.phone) : "") === norm
      );
      if (matchByPhone) {
        matchedId = matchByPhone.id;
        setSelectedId(matchedId);
      }
    }

    onChange({
      id: matchedId,
      name: nameInput,
      phone: newPhone,
      isNew: !matchedId,
    });
  };

  const handleSelectSuggestion = (cust: CustomerRecord) => {
    setNameInput(cust.name);
    setPhoneInput(cust.phone || "");
    setSelectedId(cust.id);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);

    onChange({
      id: cust.id,
      name: cust.name,
      phone: cust.phone || "",
      isNew: false,
    });
  };

  const handleClear = () => {
    setNameInput("");
    setPhoneInput("");
    setSelectedId(null);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    onChange(null);
    setTimeout(() => nameInputRef.current?.focus(), 50);
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
    <div
      ref={containerRef}
      className={cn("grid grid-cols-2 gap-3 sm:gap-4 relative", className)}
    >
      {/* 1. Customer Name */}
      <div className="space-y-1.5 sm:space-y-2 relative">
        <Label
          htmlFor="customer_name"
          className="text-xs sm:text-sm font-medium truncate block"
        >
          Customer Name{" "}
          <span className="text-[10px] font-normal text-muted-foreground">
            (Optional)
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
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              tabIndex={-1}
              aria-label="Clear customer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 max-h-56 overflow-y-auto">
            {suggestions.map((cust, idx) => (
              <button
                key={cust.id}
                type="button"
                onClick={() => handleSelectSuggestion(cust)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center justify-between rounded-sm px-2.5 py-1.5 text-sm outline-none transition-colors",
                  highlightedIndex === idx
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/60 text-popover-foreground"
                )}
              >
                <div className="flex flex-col items-start min-w-0 pr-2 text-left">
                  <span className="font-medium text-sm truncate">
                    {cust.name}
                  </span>
                  {cust.phone && (
                    <span className="text-xs text-muted-foreground font-normal">
                      {cust.phone}
                    </span>
                  )}
                </div>
                {cust.transaction_count ? (
                  <span className="text-xs text-muted-foreground shrink-0 font-normal">
                    {cust.transaction_count} txn{cust.transaction_count > 1 ? "s" : ""}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. Phone Number */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label
          htmlFor="customer_phone"
          className="text-xs sm:text-sm font-medium truncate block"
        >
          Phone Number{" "}
          <span className="text-[10px] font-normal text-muted-foreground">
            (Optional)
          </span>
        </Label>
        <Input
          id="customer_phone"
          type="tel"
          placeholder="Enter phone number"
          value={phoneInput}
          onChange={handlePhoneChange}
          disabled={disabled}
          autoComplete="off"
        />
      </div>
    </div>
  );
};
