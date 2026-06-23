import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MaterialItem } from "./constants";

const UOM_OPTIONS = ["ea", "m", "kg", "m²", "m³", "set", "lot", "hr", "day"];

interface MaterialFormDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  material?: MaterialItem | null;
  existingCodes: string[];
  onSubmit: (data: {
    materialCode: string;
    materialDescription: string;
    uom: string;
    materialType: string;
    materialGroup: string;
    materialClass: "mrp" | "common" | "project";
    baseRate: string;
  }) => void;
  onDelete?: () => void;
  saving?: boolean;
}

export function MaterialFormDrawer({
  open,
  onOpenChange,
  mode,
  material,
  existingCodes,
  onSubmit,
  onDelete,
  saving,
}: MaterialFormDrawerProps) {
  const [autoCode, setAutoCode] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [materialType, setMaterialType] = useState("");
  const [materialGroup, setMaterialGroup] = useState("");
  const [description, setDescription] = useState("");
  const [uom, setUom] = useState("ea");
  const [baseRate, setBaseRate] = useState("");
  const [materialClass, setMaterialClass] = useState<"mrp" | "common" | "project">("common");

  const { data: types = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/material-types"],
    enabled: open,
  });

  const { data: groups = [] } = useQuery<{ id: number; name: string; materialTypeId?: number }[]>({
    queryKey: ["/api/material-groups", materialType],
    queryFn: async () => {
      const res = await fetch(`/api/material-groups${materialType ? `?type=${encodeURIComponent(materialType)}` : ""}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && material) {
      setCode(material.materialCode);
      setName(material.materialDescription);
      setMaterialType(material.materialType ?? "");
      setMaterialGroup(material.materialGroup ?? "");
      setUom(material.uom);
      setBaseRate(String(material.baseRate ?? ""));
      setMaterialClass((material.materialClass as "mrp" | "common" | "project") ?? "common");
      setAutoCode(false);
    } else {
      setCode("");
      setName("");
      setMaterialType(types[0]?.name ?? "");
      setMaterialGroup("");
      setDescription("");
      setUom("ea");
      setBaseRate("");
      setMaterialClass("common");
      setAutoCode(true);
    }
  }, [open, mode, material, types]);

  useEffect(() => {
    if (autoCode && mode === "add" && open) {
      const next = `EPC-MAT-${String(Math.floor(Math.random() * 90000) + 10000)}`;
      setCode(next);
    }
  }, [autoCode, mode, open]);

  const duplicateCode =
    code.trim() &&
    existingCodes.some((c) => c.toLowerCase() === code.trim().toLowerCase() && c !== material?.materialCode);

  const handleSave = () => {
    if (!name.trim() || !materialType || !materialGroup || Number(baseRate) <= 0) return;
    onSubmit({
      materialCode: code.trim() || `EPC-MAT-${Date.now()}`,
      materialDescription: name.trim(),
      uom,
      materialType,
      materialGroup,
      materialClass,
      baseRate: String(Number(baseRate)),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[520px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="kanban-heading-lg">
            {mode === "add" ? "Add New Material" : "Edit Material"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div>
            <Label>Material Code</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={code}
                onChange={(e) => {
                  setAutoCode(false);
                  setCode(e.target.value);
                }}
                className="font-mono"
                placeholder="EPC-MAT-XXXXX"
              />
              {mode === "add" && (
                <Button type="button" variant="outline" size="sm" onClick={() => setAutoCode(true)}>
                  Auto
                </Button>
              )}
            </div>
            {duplicateCode && (
              <p className="mt-1 kanban-caption text-[var(--status-warning)]">
                Material with this code already exists
              </p>
            )}
          </div>

          <div>
            <Label>Material Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={materialType} onValueChange={setMaterialType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subcategory</Label>
              <Select value={materialGroup} onValueChange={setMaterialGroup}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unit of Measure</Label>
              <Select value={uom} onValueChange={setUom}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UOM_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base Rate (₹) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <SheetFooter className="mt-8 flex-row justify-between gap-2 sm:justify-between">
          <div>
            {mode === "edit" && onDelete && (
              <Button variant="destructive" onClick={onDelete} disabled={saving}>
                Delete Material
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim() || !materialType || !materialGroup || Number(baseRate) <= 0 || !!duplicateCode}
            >
              {mode === "add" ? "Add Material" : "Save Changes"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
