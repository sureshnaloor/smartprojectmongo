import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Globe } from "lucide-react";
import { COMMON_CURRENCY_CODES, getCurrencyLabel } from "@/lib/currencies";

interface Country {
  id: number;
  name: string;
  code?: string | null;
}

interface GlobalDefaults {
  id: number;
  defaultCountryId: number | null;
  defaultCurrencyCode: string;
  defaultCountry: Country | null;
  updatedAt: string;
}

async function getGlobalDefaults(): Promise<GlobalDefaults> {
  const res = await fetch("/api/global-defaults");
  if (!res.ok) throw new Error("Failed to load global defaults");
  return res.json();
}

async function getCountries(): Promise<Country[]> {
  const res = await fetch("/api/countries");
  if (!res.ok) throw new Error("Failed to load countries");
  return res.json();
}

async function updateGlobalDefaults(data: {
  defaultCountryId: number | null;
  defaultCurrencyCode: string;
}): Promise<GlobalDefaults> {
  const res = await fetch("/api/global-defaults", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.message === "string" ? body.message : "Failed to save defaults");
  }
  return res.json();
}

export default function GlobalMastersDefaultsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [defaultCountryId, setDefaultCountryId] = useState<string>("");
  const [defaultCurrencyCode, setDefaultCurrencyCode] = useState<string>("USD");

  const { data: defaults, isLoading: loadingDefaults } = useQuery({
    queryKey: ["/api/global-defaults"],
    queryFn: getGlobalDefaults,
  });

  const { data: countries = [], isLoading: loadingCountries } = useQuery({
    queryKey: ["/api/countries"],
    queryFn: getCountries,
  });

  useEffect(() => {
    if (!defaults) return;
    setDefaultCountryId(
      defaults.defaultCountryId != null ? String(defaults.defaultCountryId) : ""
    );
    setDefaultCurrencyCode(defaults.defaultCurrencyCode || "USD");
  }, [defaults]);

  const saveMutation = useMutation({
    mutationFn: updateGlobalDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-defaults"] });
      toast({ title: "Global defaults saved" });
    },
    onError: (e: Error) => {
      toast({ title: "Could not save defaults", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defaultCurrencyCode) {
      toast({ title: "Select a default currency", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      defaultCountryId: defaultCountryId ? Number(defaultCountryId) : null,
      defaultCurrencyCode,
    });
  };

  const currencyOptions = [
    ...COMMON_CURRENCY_CODES,
    ...(defaultCurrencyCode &&
    !COMMON_CURRENCY_CODES.includes(defaultCurrencyCode as (typeof COMMON_CURRENCY_CODES)[number])
      ? [defaultCurrencyCode]
      : []),
  ];

  const isLoading = loadingDefaults || loadingCountries;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Regional &amp; currency defaults</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          System-wide defaults used for tax rules and base-currency value calculations.
          Weekend and holiday rules are configured under Global masters → Work calendar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-teal-600" />
              Default country
            </CardTitle>
            <CardDescription>
              Used for tax calculation. Weekend rules are set under Work calendar. Countries are
              maintained under Vendor Master → Country.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="defaultCountry">Country</Label>
              <Select
                value={defaultCountryId || "__none__"}
                onValueChange={(v) => setDefaultCountryId(v === "__none__" ? "" : v)}
                disabled={isLoading}
              >
                <SelectTrigger id="defaultCountry">
                  <SelectValue placeholder={isLoading ? "Loading…" : "Select default country"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not set —</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                      {c.code ? ` (${c.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-600" />
              Default currency
            </CardTitle>
            <CardDescription>
              Base currency for estimated values, earned value, and other monetary roll-ups when
              purchase documents use a different currency (exchange rates — coming soon).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="defaultCurrency">Currency code</Label>
              <Select
                value={defaultCurrencyCode}
                onValueChange={setDefaultCurrencyCode}
                disabled={isLoading}
              >
                <SelectTrigger id="defaultCurrency">
                  <SelectValue placeholder="Select default currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((code) => (
                    <SelectItem key={code} value={code}>
                      {getCurrencyLabel(code as (typeof COMMON_CURRENCY_CODES)[number])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isLoading || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save defaults"}
          </Button>
          {defaults?.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated {new Date(defaults.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
