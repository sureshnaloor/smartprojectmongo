import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ImageIcon, Trash2, Upload } from "lucide-react";

interface GlobalDefaults {
  id: number;
  companyName: string | null;
  companyAddress: string | null;
  companyLogoUrl: string | null;
  updatedAt: string;
}

async function getGlobalDefaults(): Promise<GlobalDefaults> {
  const res = await fetch("/api/global-defaults");
  if (!res.ok) throw new Error("Failed to load company profile");
  return res.json();
}

async function updateCompanyProfile(data: {
  companyName: string | null;
  companyAddress: string | null;
}): Promise<GlobalDefaults> {
  const res = await fetch("/api/global-defaults", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.message === "string" ? body.message : "Failed to save company profile");
  }
  return res.json();
}

async function uploadCompanyLogo(file: File): Promise<GlobalDefaults> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/global-defaults/logo", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.message === "string" ? body.message : "Failed to upload logo");
  }
  return res.json();
}

async function removeCompanyLogo(): Promise<GlobalDefaults> {
  const res = await fetch("/api/global-defaults/logo", { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.message === "string" ? body.message : "Failed to remove logo");
  }
  return res.json();
}

export default function GlobalMastersCompanyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");

  const { data: defaults, isLoading } = useQuery({
    queryKey: ["/api/global-defaults"],
    queryFn: getGlobalDefaults,
  });

  useEffect(() => {
    if (!defaults) return;
    setCompanyName(defaults.companyName ?? "");
    setCompanyAddress(defaults.companyAddress ?? "");
  }, [defaults]);

  const saveMutation = useMutation({
    mutationFn: updateCompanyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-defaults"] });
      toast({ title: "Company profile saved" });
    },
    onError: (e: Error) => {
      toast({ title: "Could not save profile", description: e.message, variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: uploadCompanyLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-defaults"] });
      toast({ title: "Logo uploaded" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (e: Error) => {
      toast({ title: "Logo upload failed", description: e.message, variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: removeCompanyLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-defaults"] });
      toast({ title: "Logo removed" });
    },
    onError: (e: Error) => {
      toast({ title: "Could not remove logo", description: e.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      companyName: companyName.trim() || null,
      companyAddress: companyAddress.trim() || null,
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate(file);
  };

  const logoBusy = uploadMutation.isPending || removeLogoMutation.isPending;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Company profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Organization name, logo, and address used across reports, documents, and project branding.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              Company details
            </CardTitle>
            <CardDescription>Legal or trading name and registered or primary office address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Engineering Pvt Ltd"
                disabled={isLoading}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Address</Label>
              <Textarea
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Street, city, state, postal code, country"
                disabled={isLoading}
                rows={4}
                maxLength={2000}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-indigo-600" />
              Company logo
            </CardTitle>
            <CardDescription>
              PNG, JPEG, WebP, GIF, or SVG. Maximum 2 MB. Replaces the previous logo when uploaded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border bg-muted/40 overflow-hidden">
                {defaults?.companyLogoUrl ? (
                  <img
                    src={defaults.companyLogoUrl}
                    alt="Company logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoChange}
                  disabled={logoBusy || isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoBusy || isLoading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadMutation.isPending ? "Uploading…" : "Upload logo"}
                </Button>
                {defaults?.companyLogoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={logoBusy || isLoading}
                    onClick={() => removeLogoMutation.mutate()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {removeLogoMutation.isPending ? "Removing…" : "Remove logo"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isLoading || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save company profile"}
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
