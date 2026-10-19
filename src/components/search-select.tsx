import { Check, ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export type SearchOption = {
  label: string;
  meta?: string;
};

type SearchSelectProps = {
  id?: string;
  label?: string;
  placeholder: string;
  options: SearchOption[];
  value: SearchOption | null;
  onChange: (value: SearchOption | null) => void;
};

export function SearchSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);



  const choose = (option: SearchOption) => {
    onChange(option);
    setQuery("");
    setOpen(false);
  };

  const commitCurrentQuery = () => {
    const term = query.trim();
    if (!term) return;
    const match = options.find((o) => o.label.toLowerCase() === term.toLowerCase());
    if (match) {
      onChange(match);
    } else {
      onChange({ label: term, meta: "Custom Entry" });
    }
    setQuery("");
    setOpen(false);
  };

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        if (open && query.trim()) {
          commitCurrentQuery();
        } else {
          setOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open, query, options]);

  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return options.slice(0, 60);
    const starts: SearchOption[] = [];
    const contains: SearchOption[] = [];
    let exactMatch = false;

    for (const option of options) {
      const optLower = option.label.toLocaleLowerCase();
      if (optLower === term) exactMatch = true;
      const haystack = `${option.label} ${option.meta ?? ""}`.toLocaleLowerCase();
      if (optLower.startsWith(term)) starts.push(option);
      else if (haystack.includes(term)) contains.push(option);
      if (starts.length + contains.length >= 80) break;
    }

    const list = [...starts, ...contains].slice(0, 60);
    // If user typed something not matching exactly, provide instant custom choice at the top
    if (query.trim() && !exactMatch) {
      return [{ label: query.trim(), meta: "Use entered text" }, ...list];
    }
    return list;
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      {label && (
        <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          autoComplete="off"
          value={open ? query : value?.label ?? ""}
          placeholder={placeholder}
          onFocus={() => {
            setQuery(value?.label ?? "");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            if (query.trim() && !value) {
              commitCurrentQuery();
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open) {
              event.preventDefault();
              if (results[0]) {
                choose(results[0]);
              } else if (query.trim()) {
                commitCurrentQuery();
              }
            }
          }}
          className="h-11 sm:h-12 w-full truncate rounded-xl border border-input bg-background pl-11 pr-20 text-xs sm:text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Clear ${label || "selection"}`}
            onClick={() => {
              onChange(null);
              setQuery("");
              setOpen(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </Button>
        ) : (
          <ChevronDown aria-hidden="true" className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        )}
      </div>

      {open && (
        <div
          id={`${id}-options`}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-2xl backdrop-blur-xl"
        >
          {results.length ? (
            results.map((option) => (
              <button
                key={`${option.label}-${option.meta ?? ""}`}
                type="button"
                role="option"
                aria-selected={value?.label === option.label}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none cursor-pointer"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs sm:text-sm font-medium text-popover-foreground">{option.label}</span>
                  {option.meta && <span className="block truncate text-[10px] text-muted-foreground">{option.meta}</span>}
                </span>
                {value?.label === option.label && <Check className="size-3.5 shrink-0 text-primary" />}
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matching options</p>
          )}
        </div>
      )}
    </div>
  );
}