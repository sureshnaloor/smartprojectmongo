import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { SharedNavigation } from "@/components/shared-navigation";
import { Loader2, Inbox, Mail, RefreshCw, Trash2 } from "lucide-react";

type LeadStatus = "new" | "contacted" | "closed";
type Interest = "demo" | "trial" | "sales";

interface Lead {
  _id: string;
  name: string;
  email: string;
  company: string;
  teamSize?: string;
  message?: string;
  interest?: string;
  status: LeadStatus;
  createdAt: string;
}

const STATUS_TABS: { key: LeadStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "closed", label: "Closed" },
];

const INTEREST_TABS: { key: Interest | "all"; label: string }[] = [
  { key: "all", label: "All interests" },
  { key: "demo", label: "Demo" },
  { key: "trial", label: "Free trial" },
  { key: "sales", label: "Enterprise" },
];

const BADGE: Record<LeadStatus, string> = {
  new: "bg-[#FCBC45]/15 text-[#B97A0A] border-[#FCBC45]/40",
  contacted: "bg-[#2380C6]/10 text-[#074E84] border-[#2380C6]/30",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
};

const INTEREST_BADGE: Record<Interest, string> = {
  demo: "bg-[#2380C6]/10 text-[#074E84] border-[#2380C6]/25",
  trial: "bg-[#FCBC45]/15 text-[#B97A0A] border-[#FCBC45]/40",
  sales: "bg-[#0A1B33]/5 text-[#0A1B33] border-[#0A1B33]/20",
};

const INTEREST_LABEL: Record<Interest, string> = {
  demo: "Demo",
  trial: "Free trial",
  sales: "Enterprise",
};

// Derive the interest of a lead: prefer the stored field, fall back to parsing
// the legacy "Interest: …" tag embedded in the message by earlier modal versions.
function interestOf(lead: Lead): Interest {
  if (lead.interest === "demo" || lead.interest === "trial" || lead.interest === "sales") {
    return lead.interest;
  }
  const m = (lead.message || "").match(/^Interest: (.+)$/m);
  if (m) {
    if (/free trial/i.test(m[1])) return "trial";
    if (/enterprise|sales/i.test(m[1])) return "sales";
  }
  return "demo";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function AdminDemoRequests() {
  const { user, loading: authLoading, authenticated } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<LeadStatus | "all">("all");
  const [interestTab, setInterestTab] = useState<Interest | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo-requests", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.status === 403) {
        setError("forbidden");
        return;
      }
      if (!res.ok) throw new Error();
      setLeads(await res.json());
    } catch {
      setError("load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: leads.length, new: 0, contacted: 0, closed: 0,
      "all-interests": leads.length, demo: 0, trial: 0, sales: 0,
    };
    leads.forEach((l) => {
      c[l.status] = (c[l.status] || 0) + 1;
      c[interestOf(l)] = (c[interestOf(l)] || 0) + 1;
    });
    return c;
  }, [leads]);

  const filtered = leads.filter(
    (l) => (tab === "all" || l.status === tab) && (interestTab === "all" || interestOf(l) === interestTab)
  );

  const updateStatus = async (lead: Lead, status: LeadStatus) => {
    setBusyId(lead._id);
    try {
      const res = await fetch(`/api/demo-requests/${lead._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setLeads((prev) => prev.map((l) => (l._id === lead._id ? { ...l, status } : l)));
    } catch {
      alert("Could not update the lead — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (lead: Lead) => {
    if (!window.confirm(`Delete demo request from ${lead.name} (${lead.email})?`)) return;
    setBusyId(lead._id);
    try {
      const res = await fetch(`/api/demo-requests/${lead._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setLeads((prev) => prev.filter((l) => l._id !== lead._id));
    } catch {
      alert("Could not delete the lead — please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-24 text-[#505E6B]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading demo requests…
        </div>
      );
    }
    if (error === "forbidden") {
      return (
        <div className="max-w-md mx-auto mt-24 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FCBC45]/15 flex items-center justify-center mb-4">
            <Inbox className="h-7 w-7 text-[#E8A020]" />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-[#0A1B33]">Demo-request admins only</h2>
          <p className="mt-2 text-sm text-[#505E6B]">
            Your account ({user?.email}) doesn't have demo-request admin permission. Ask a full
            admin to add your email to the DEMO_REQUEST_ADMIN_EMAILS environment variable.
          </p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="max-w-md mx-auto mt-24 text-center">
          <p className="text-sm text-red-500 mb-4">Could not load demo requests.</p>
          <button onClick={load} className="btn-primary btn-gold px-6 py-2.5 text-sm">Retry</button>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="text-center py-24">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#F6F4FF] flex items-center justify-center mb-4">
            <Inbox className="h-7 w-7 text-[#2380C6]" />
          </div>
          <h3 className="font-display text-xl font-bold text-[#0A1B33]">No matching requests</h3>
          <p className="mt-1 text-sm text-[#505E6B]">Try a different filter — new landing-page leads appear here automatically.</p>
        </div>
      );
    }
    return (
      <div className="overflow-x-auto rounded-xl border border-[#E7E3F5] bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.1em] text-[#505E6B]/70 border-b border-[#E7E3F5] bg-[#F6F4FF]/60">
              <th className="px-5 py-3 font-semibold">Contact</th>
              <th className="px-5 py-3 font-semibold">Company</th>
              <th className="px-5 py-3 font-semibold">Interest</th>
              <th className="px-5 py-3 font-semibold">Message</th>
              <th className="px-5 py-3 font-semibold">Received</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead._id} className="border-b border-[#E7E3F5]/70 last:border-0 hover:bg-[#F6F4FF]/40 transition-colors">
                <td className="px-5 py-4 align-top">
                  <p className="font-semibold text-[#0A1B33]">{lead.name}</p>
                  <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-xs text-[#2380C6] hover:underline mt-0.5">
                    <Mail className="h-3 w-3" /> {lead.email}
                  </a>
                </td>
                <td className="px-5 py-4 align-top text-[#0A1B33]">
                  {lead.company}
                  {lead.teamSize && <span className="block text-xs text-[#505E6B] mt-0.5">{lead.teamSize} people</span>}
                </td>
                <td className="px-5 py-4 align-top">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${INTEREST_BADGE[interestOf(lead)]}`}>
                    {INTEREST_LABEL[interestOf(lead)]}
                  </span>
                </td>
                <td className="px-5 py-4 align-top text-[#505E6B] max-w-[240px]">
                  <span className="line-clamp-2">{lead.message || "—"}</span>
                </td>
                <td className="px-5 py-4 align-top whitespace-nowrap text-xs text-[#505E6B]">{formatDate(lead.createdAt)}</td>
                <td className="px-5 py-4 align-top">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${BADGE[lead.status]}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-5 py-4 align-top text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    {lead.status !== "contacted" && (
                      <button
                        disabled={busyId === lead._id}
                        onClick={() => updateStatus(lead, "contacted")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#2380C6]/40 text-[#074E84] hover:bg-[#2380C6]/10 transition disabled:opacity-50"
                      >
                        Mark Contacted
                      </button>
                    )}
                    {lead.status !== "closed" && (
                      <button
                        disabled={busyId === lead._id}
                        onClick={() => updateStatus(lead, "closed")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        Close
                      </button>
                    )}
                    <button
                      disabled={busyId === lead._id}
                      onClick={() => remove(lead)}
                      aria-label="Delete"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F4FF]">
        <Loader2 className="h-6 w-6 animate-spin text-[#2380C6]" />
      </div>
    );
  }

  if (!authenticated) {
    window.location.href = "/login";
    return null;
  }

  return (
    <div className="app min-h-screen bg-[#F6F4FF]">
      <SharedNavigation variant="app" />
      <main className="mx-auto max-w-[1300px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FCBC45]/40 bg-[#FCBC45]/10 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FCBC45]" />
              <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#B97A0A]">Admin · Lead Capture</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-[#0A1B33]">Demo Requests</h1>
            <p className="mt-1 text-sm text-[#505E6B]">
              Leads captured from the landing page. Mark them as contacted or close them once handled.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#E7E3F5] bg-white text-sm font-semibold text-[#0A1B33] hover:border-[#2380C6]/40 hover:text-[#074E84] transition"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex gap-2 overflow-x-auto">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                  tab === t.key
                    ? "bg-[#074E84] text-white shadow"
                    : "bg-white border border-[#E7E3F5] text-[#505E6B] hover:border-[#2380C6]/40 hover:text-[#074E84]"
                }`}
              >
                {t.label}
                <span className={`ml-2 text-xs ${tab === t.key ? "text-white/70" : "text-[#505E6B]/50"}`}>
                  {counts[t.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
          <span className="hidden sm:block w-px h-6 bg-[#E7E3F5] mx-1" />
          <div className="flex gap-2 overflow-x-auto">
            {INTEREST_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setInterestTab(t.key)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  interestTab === t.key
                    ? "bg-[#0A1B33] text-white shadow"
                    : "bg-white border border-[#E7E3F5] text-[#505E6B] hover:border-[#0A1B33]/30 hover:text-[#0A1B33]"
                }`}
              >
                {t.label}
                <span className={`ml-1.5 text-[11px] ${interestTab === t.key ? "text-white/70" : "text-[#505E6B]/50"}`}>
                  {t.key === "all" ? counts["all-interests"] : counts[t.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {renderBody()}
      </main>
    </div>
  );
}
