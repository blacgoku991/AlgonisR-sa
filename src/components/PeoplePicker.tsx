import { LoaderCircle, Mail, Plus, Search, UserPlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { usePeopleSearch } from "../hooks/queries";
import type { PersonStatus } from "../lib/availability";
import { cn } from "../lib/cn";
import type { Person } from "../types";
import { Avatar, STATUS_LABEL } from "./ui/Avatar";

const EMAIL = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/;

interface PeoplePickerProps {
  value: Person[];
  onChange: (people: Person[]) => void;
  statusFor: (email: string) => PersonStatus;
  exclude: string[];
}

export function PeoplePicker({ value, onChange, statusFor, exclude }: PeoplePickerProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { data: results = [], isFetching } = usePeopleSearch(query);

  const taken = useMemo(
    () => new Set([...value.map((p) => p.email.toLowerCase()), ...exclude.map((e) => e.toLowerCase())]),
    [value, exclude],
  );
  const typing = query.trim().length > 0;
  const options = results.filter((p) => !taken.has(p.email.toLowerCase()));
  const external =
    typing &&
    EMAIL.test(query.trim()) &&
    !taken.has(query.trim().toLowerCase()) &&
    !options.some((o) => o.email.toLowerCase() === query.trim().toLowerCase());
  const total = options.length + (external ? 1 : 0);

  const add = (person: Person) => {
    onChange([...value, person]);
    setQuery("");
    setActive(0);
    input.current?.focus();
  };
  const addEmail = (email: string) =>
    add({ id: email.toLowerCase(), email, name: email.split("@")[0].replace(/[._-]+/g, " "), isExternal: true });
  const remove = (email: string) => onChange(value.filter((p) => p.email !== email));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && total) {
      e.preventDefault();
      setActive((a) => (a + 1) % total);
    } else if (e.key === "ArrowUp" && total) {
      e.preventDefault();
      setActive((a) => (a - 1 + total) % total);
    } else if ((e.key === "Enter" && total) || (e.key === "Tab" && typing && total)) {
      e.preventDefault();
      if (active < options.length) add(options[active]);
      else if (external) addEmail(query.trim());
      else if (options.length) add(options[0]);
    } else if ((e.key === "," || e.key === ";") && EMAIL.test(query.trim())) {
      e.preventDefault();
      addEmail(query.trim());
    } else if (e.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1].email);
    } else if (e.key === "Escape" && typing) {
      e.stopPropagation();
      setQuery("");
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const emails = e.clipboardData.getData("text").match(/[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;]{2,}/g);
    if (emails && emails.length > 1) {
      e.preventDefault();
      const fresh = [...new Set(emails)].filter((m) => !taken.has(m.toLowerCase()));
      onChange([...value, ...fresh.map((m) => ({ id: m.toLowerCase(), email: m, name: m.split("@")[0], isExternal: true }))]);
    }
  };

  const available = value.filter((p) => statusFor(p.email) === "free").length;
  const suggestions = !typing && !focused ? options.slice(0, 5) : [];
  const open = focused && (typing || options.length > 0);

  return (
    <div>
      <div className="relative">
        <div
          className={cn(
            "flex h-12 items-center gap-2.5 rounded-lg border bg-transparent px-3.5 transition-all",
            focused ? "border-brand-400 ring-4 ring-brand-500/15" : "border-line",
          )}
        >
          <Search className="size-4 shrink-0 text-slate-400" />
          <input
            ref={input}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Rechercher un collègue, une équipe ou un e-mail…"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-slate-400"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-label="Rechercher des participants"
          />
          {isFetching && typing && <LoaderCircle className="size-4 animate-spin text-slate-400" />}
        </div>

        <AnimatePresence>
          {open && (
            <motion.ul
              id={listId}
              role="listbox"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-lg border border-line bg-[var(--bg)] p-1.5 shadow-xl shadow-slate-900/10"
            >
              {!typing && (
                <li className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
                  Contacts fréquents · Teams et Outlook
                </li>
              )}
              {options.map((p, i) => (
                <li key={p.email} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(p)}
                    onMouseEnter={() => setActive(i)}
                    className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left", i === active && "bg-brand-500/10")}
                  >
                    <Avatar name={p.name} email={p.email} isGroup={p.isGroup} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {[p.jobTitle, p.department].filter(Boolean).join(" · ") || p.email}
                      </span>
                    </span>
                    <Plus className="size-4 text-slate-400" />
                  </button>
                </li>
              ))}
              {external && (
                <li role="option" aria-selected={active === options.length}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addEmail(query.trim())}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left",
                      active === options.length && "bg-brand-500/10",
                    )}
                  >
                    <span className="flex size-[34px] items-center justify-center rounded-full bg-surface-2">
                      <Mail className="size-4 text-muted" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">Inviter {query.trim()}</span>
                      <span className="block text-xs text-muted">Adresse externe</span>
                    </span>
                  </button>
                </li>
              )}
              {typing && total === 0 && !isFetching && (
                <li className="px-3 py-4 text-center text-sm text-muted">
                  Aucun résultat — saisissez une adresse e-mail complète pour inviter quelqu'un.
                </li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="shrink-0 text-xs font-medium text-slate-400">Contacts fréquents</span>
          {suggestions.map((p) => (
            <button
              key={p.email}
              type="button"
              onClick={() => add(p)}
              className="group flex shrink-0 items-center gap-1.5 rounded-full border border-line py-1 pr-3 pl-1 text-[13px] font-medium transition-all hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10"
            >
              <Avatar name={p.name} email={p.email} isGroup={p.isGroup} size={24} />
              {p.name.split(" ")[0]}
              <UserPlus className="size-3.5 text-slate-400 group-hover:text-brand-500" />
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span className="font-semibold">
              {value.length} participant{value.length > 1 ? "s" : ""}
            </span>
            <span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{available}</span> disponible{available > 1 ? "s" : ""}{" "}
              sur ce créneau
            </span>
          </div>
          <ul className="divide-y divide-[var(--line)] rounded-lg border border-line dark:divide-white/5">
            <AnimatePresence initial={false}>
              {value.map((p) => {
                const status = statusFor(p.email);
                return (
                  <motion.li
                    key={p.email}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <Avatar
                        name={p.name}
                        email={p.email}
                        isGroup={p.isGroup}
                        size={34}
                        status={p.isGroup || p.isExternal ? undefined : status}
                        photo={!p.isExternal}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted">
                          {p.isGroup
                            ? "Groupe · tous les membres seront invités"
                            : p.isExternal
                              ? `${p.email} · externe`
                              : p.jobTitle || p.email}
                        </p>
                      </div>
                      {!p.isGroup && !p.isExternal && (
                        <span
                          className={cn(
                            "hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline",
                            status === "free" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                            status === "busy" && "bg-rose-500/10 text-rose-700 dark:text-rose-300",
                            status === "tentative" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                            status === "oof" && "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
                            status === "unknown" && "bg-slate-500/10 text-muted",
                          )}
                        >
                          {STATUS_LABEL[status]}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(p.email)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-surface-2 hover:text-slate-700 dark:hover:bg-white/10"
                        aria-label={`Retirer ${p.name}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}
    </div>
  );
}
