import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn, formatCurrency } from "@/lib/utils";
import {
  BUILTIN_OVERHEAD_CATEGORIES,
  buildOverheadRows,
  categoryAmount,
  isYearMonth,
  normalizeOverheadPlan,
  type OverheadPlanInput,
} from "@shared/cashflow";

interface OverheadResponse {
  currency: string;
  companyName: string | null;
  saved: boolean;
  updatedAt: string | null;
  error: string | null;
  plan: OverheadPlanInput;
  rows: unknown[];
  total: number;
}

function draftKey(plan: OverheadPlanInput): string {
  return JSON.stringify(normalizeOverheadPlan(plan));
}

function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[₹$,\s]/g, "");
  if (cleaned === "" || cleaned === "." || cleaned === "-" || cleaned === "-.") return null;
  if (!/^-?\d*\.?\d*$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

function applyAmount(plan: OverheadPlanInput, key: string, month: string, amount: number): OverheadPlanInput {
  return {
    ...plan,
    categories: plan.categories.map((category) => {
      if (category.key !== key) return category;
      const amounts = category.amounts.filter((entry) => entry.month !== month);
      if (amount > 0) amounts.push({ month, amount });
      return { ...category, amounts };
    }),
  };
}

function coverAmountWindow(plan: OverheadPlanInput): OverheadPlanInput {
  const normalized = normalizeOverheadPlan(plan);
  const months = normalized.categories
    .flatMap((category) => category.amounts.map((entry) => entry.month))
    .filter((month) => isYearMonth(month))
    .sort();
  if (!months.length) return normalized;
  return {
    ...normalized,
    startMonth: !isYearMonth(normalized.startMonth) || normalized.startMonth > months[0] ? months[0] : normalized.startMonth,
    endMonth: !isYearMonth(normalized.endMonth) || normalized.endMonth < months[months.length - 1] ? months[months.length - 1] : normalized.endMonth,
  };
}

function errorText(err: unknown): string {
  if (!(err instanceof Error)) return "Could not save company overhead";
  const jsonStart = err.message.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(err.message.slice(jsonStart)) as { message?: string };
      if (body.message) return body.message;
    } catch {
      /* not json */
    }
  }
  return err.message;
}

export default function CompanyOverhead() {
  const loadedToken = useRef<string | null>(null);
  const draftRef = useRef<OverheadPlanInput | null>(null);
  const savedKeyRef = useRef("");
  const editingRef = useRef<{ key: string | null; text: string }>({ key: null, text: "" });
  const [draft, setDraft] = useState<OverheadPlanInput | null>(null);
  const [savedKey, setSavedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const { data, isLoading, isError, error } = useQuery<OverheadResponse>({
    queryKey: ["/api/cashflow/overhead"],
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await fetch("/api/cashflow/overhead", { credentials: "include", cache: "no-store" });
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
  });

  const replaceDraft = (next: OverheadPlanInput) => {
    draftRef.current = next;
    setDraft(next);
  };

  useEffect(() => {
    if (!data?.plan) return;
    const token = `${data.saved}:${String(data.updatedAt ?? "")}:${data.total}`;
    if (loadedToken.current === token) return;
    if (draftRef.current && draftKey(draftRef.current) !== savedKeyRef.current) return;
    loadedToken.current = token;
    const next = coverAmountWindow(data.plan);
    const key = draftKey(next);
    draftRef.current = next;
    savedKeyRef.current = key;
    setDraft(next);
    setSavedKey(key);
  }, [data]);

  const currency = data?.currency || "USD";
  const view = useMemo(() => (draft ? buildOverheadRows(draft) : null), [draft]);
  const dirty = !!draft && draftKey(draft) !== savedKey;

  const setAmount = (key: string, month: string, amount: number) => {
    const current = draftRef.current;
    if (!current) return;
    replaceDraft(applyAmount(current, key, month, amount));
  };

  const addCategory = () => {
    const name = newName.trim();
    const current = draftRef.current;
    if (!name || !current) return;
    const key = `c-${Date.now().toString(36)}`;
    replaceDraft({ ...current, categories: [...current.categories, { key, name, amounts: [] }] });
    setNewName("");
  };

  const removeCategory = (key: string) => {
    const current = draftRef.current;
    if (!current || BUILTIN_OVERHEAD_CATEGORIES.some((category) => category.key === key)) return;
    const category = current.categories.find((item) => item.key === key);
    const hasAmounts = category?.amounts.some((entry) => entry.amount > 0);
    if (hasAmounts && !window.confirm(`Remove ${category?.name || "this category"} and its monthly amounts?`)) return;
    replaceDraft({ ...current, categories: current.categories.filter((item) => item.key !== key) });
  };

  const planForSave = (): OverheadPlanInput | null => {
    let plan = draftRef.current;
    if (!plan) return null;
    const editing = editingRef.current;
    if (editing.key === "opening") {
      const amount = parseMoney(editing.text);
      plan = { ...plan, openingBalance: amount ?? 0 };
    } else if (editing.key && editing.key.includes(":")) {
      const splitAt = editing.key.indexOf(":");
      const key = editing.key.slice(0, splitAt);
      const month = editing.key.slice(splitAt + 1);
      const amount = parseMoney(editing.text);
      plan = applyAmount(plan, key, month, amount != null && amount > 0 ? amount : 0);
    }
    return normalizeOverheadPlan(plan);
  };

  const save = async () => {
    const plan = planForSave();
    const preview = plan ? buildOverheadRows(plan) : null;
    if (!plan || !preview || "error" in preview) return;
    setSaving(true);
    try {
      const response = await apiRequest("PUT", "/api/cashflow/overhead", plan);
      const saved = (await response.json()) as OverheadResponse;
      const next = coverAmountWindow(saved.plan);
      const key = draftKey(next);
      loadedToken.current = `${saved.saved}:${String(saved.updatedAt ?? "")}:${saved.total}`;
      draftRef.current = next;
      savedKeyRef.current = key;
      setDraft(next);
      setSavedKey(key);
      editingRef.current = { key: null, text: "" };
      setEditingKey(null);
      queryClient.setQueryData(["/api/cashflow/overhead"], saved);
      queryClient.invalidateQueries({ queryKey: ["/api/cashflow/company"] });
      toast.success("Company overhead saved");
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  if (isError) {
    return (
      <div className="cp-card max-w-xl">
        <p className="cp-heading-md">Company overhead could not be loaded</p>
        <p className="cp-body-md mt-2 text-[var(--text-secondary)]">{errorText(error)}</p>
      </div>
    );
  }

  if (isLoading || !draft || !view) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="cp-skeleton h-10 w-64" />
        <div className="cp-skeleton h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--copper-500)]" strokeWidth={1.5} />
            <h2 className="cp-heading-md text-xl">Company overhead</h2>
          </div>
          <p className="cp-body-md mt-1 max-w-2xl text-[var(--text-secondary)]">
            Monthly costs that belong to the company rather than one project — salaries and maintenance, plus any other overhead you add. These amounts are laid on top of every project’s cash flow in the company total.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty ? (
            <span className="cp-caption text-[var(--status-warning)]">Unsaved changes</span>
          ) : data?.saved ? (
            <span className="cp-caption text-[var(--status-success)]">Saved</span>
          ) : null}
          <Button type="button" onClick={save} disabled={saving || "error" in view}>
            {saving ? "Saving…" : "Save overhead"}
          </Button>
        </div>
      </div>

      {"error" in view ? (
        <div className="cp-card border-[var(--status-warning)] bg-[var(--status-warning-bg)]">
          <p className="cp-body-md">{view.error}</p>
        </div>
      ) : (
        <>
          <section className="cp-card space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="cp-caption uppercase tracking-wide text-[var(--text-secondary)]">From</span>
                <input
                  type="month"
                  value={draft.startMonth}
                  onChange={(event) => {
                    const current = draftRef.current;
                    if (!current) return;
                    replaceDraft({ ...current, startMonth: event.target.value });
                  }}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--border-subtle)] bg-white px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="cp-caption uppercase tracking-wide text-[var(--text-secondary)]">Through</span>
                <input
                  type="month"
                  value={draft.endMonth}
                  onChange={(event) => {
                    const current = draftRef.current;
                    if (!current) return;
                    replaceDraft({ ...current, endMonth: event.target.value });
                  }}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--border-subtle)] bg-white px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="cp-caption uppercase tracking-wide text-[var(--text-secondary)]">Company opening cash</span>
                <input
                  inputMode="decimal"
                  value={editingKey === "opening" ? editingText : draft.openingBalance === 0 ? "" : String(draft.openingBalance)}
                  placeholder="0"
                  onFocus={() => {
                    const text = draft.openingBalance === 0 ? "" : String(draft.openingBalance);
                    editingRef.current = { key: "opening", text };
                    setEditingKey("opening");
                    setEditingText(text);
                  }}
                  onChange={(event) => {
                    const text = event.target.value;
                    if (text !== "" && parseMoney(text) === null && text.replace(/[₹$,\s]/g, "") !== "" && text !== "-" && text !== "." && text !== "-.") return;
                    editingRef.current = { key: "opening", text };
                    setEditingText(text);
                    const parsed = parseMoney(text);
                    const current = draftRef.current;
                    if (!current || parsed === null) return;
                    replaceDraft({ ...current, openingBalance: parsed });
                  }}
                  onBlur={() => {
                    const parsed = parseMoney(editingRef.current.text);
                    const current = draftRef.current;
                    if (current && editingRef.current.key === "opening") {
                      replaceDraft({ ...current, openingBalance: parsed ?? 0 });
                    }
                    editingRef.current = { key: null, text: "" };
                    setEditingKey(null);
                  }}
                  className="mt-1.5 h-9 w-full rounded-md border border-[var(--border-subtle)] bg-white px-3 text-sm tabular-nums"
                />
              </label>
            </div>
            <p className="cp-body-sm text-[var(--text-secondary)]">
              Opening cash is the company balance before the first month. It is used in the company cash flow chart, not as an overhead expense.
              {data?.companyName ? ` Currency follows the company default (${currency}).` : ` Amounts use the company currency (${currency}).`}
            </p>
          </section>

          <section className="cp-card overflow-hidden p-0">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
              <p className="cp-heading-md">Monthly overhead</p>
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  addCategory();
                }}
              >
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Add a cost, e.g. rent"
                  className="h-9 w-48 rounded-md border border-[var(--border-subtle)] bg-white px-3 text-sm"
                />
                <Button type="submit" variant="outline" size="sm" disabled={!newName.trim()}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </form>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="cp-table-header">
                    <th className="px-4 py-3 text-left">Month</th>
                    {draft.categories.map((category) => (
                      <th key={category.key} className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1">
                          {category.name}
                          {!BUILTIN_OVERHEAD_CATEGORIES.some((item) => item.key === category.key) && (
                            <button type="button" className="text-[var(--text-secondary)] hover:text-[var(--status-danger)]" onClick={() => removeCategory(category.key)} aria-label={`Remove ${category.name}`}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {view.rows.map((row) => (
                    <tr key={row.month} className="border-t border-[var(--border-subtle)]">
                      <td className="px-4 py-2 font-medium">{row.label}</td>
                      {draft.categories.map((category) => {
                        const amount = categoryAmount(category, row.month);
                        const field = `${category.key}:${row.month}`;
                        const editing = editingKey === field;
                        return (
                          <td key={category.key} className="px-4 py-2">
                            <input
                              inputMode="decimal"
                              aria-label={`${row.label} ${category.name}`}
                              value={editing ? editingText : amount === 0 ? "" : String(amount)}
                              placeholder="0"
                              onFocus={() => {
                                const text = amount === 0 ? "" : String(amount);
                                editingRef.current = { key: field, text };
                                setEditingKey(field);
                                setEditingText(text);
                              }}
                              onChange={(event) => {
                                const text = event.target.value;
                                const stripped = text.replace(/[₹$,\s]/g, "");
                                if (text !== "" && parseMoney(text) === null && stripped !== "" && stripped !== ".") return;
                                editingRef.current = { key: field, text };
                                setEditingText(text);
                                if (stripped === "" || stripped === ".") {
                                  setAmount(category.key, row.month, 0);
                                  return;
                                }
                                const parsed = parseMoney(text);
                                if (parsed != null && parsed >= 0) setAmount(category.key, row.month, parsed);
                              }}
                              onBlur={() => {
                                if (editingRef.current.key === field) {
                                  const parsed = parseMoney(editingRef.current.text);
                                  setAmount(category.key, row.month, parsed != null && parsed > 0 ? parsed : 0);
                                }
                                editingRef.current = { key: null, text: "" };
                                setEditingKey(null);
                              }}
                              className="ml-auto block h-9 w-32 rounded-md border border-[var(--border-subtle)] bg-white px-2 text-right text-sm tabular-nums"
                            />
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-medium tabular-nums">{formatCurrency(row.total, currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border-subtle)] bg-[var(--bg-warm-gray)]">
                    <td className="px-4 py-3 font-medium">Total</td>
                    {draft.categories.map((category) => {
                      const total = view.rows.reduce((sum, row) => sum + (row.amounts[category.key] || 0), 0);
                      return (
                        <td key={category.key} className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatCurrency(total, currency)}
                        </td>
                      );
                    })}
                    <td className={cn("px-4 py-3 text-right font-semibold tabular-nums")}>{formatCurrency(view.total, currency)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="cp-card">
            <p className="cp-heading-md">Monthly overhead</p>
            <p className="cp-body-sm mt-1 text-[var(--text-secondary)]">Salaries, maintenance, and any other company costs added together for each month.</p>
            <div className="mt-4 h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view.rows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} interval={view.rows.length > 18 ? Math.ceil(view.rows.length / 12) - 1 : 0} />
                  <YAxis
                    width={84}
                    tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat("en-IN", { notation: "compact", style: "currency", currency, maximumFractionDigits: 1 }).format(value)
                    }
                  />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0), currency), "Overhead"]} />
                  <Bar dataKey="total" name="Overhead" fill="#C17817" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
