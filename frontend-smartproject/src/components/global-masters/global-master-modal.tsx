import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GlobalMasterKey } from "./constants";
import {
  MASTER_MODAL_CONFIG,
  defaultFormValues,
  type MasterFieldDef,
} from "./field-definitions";

export type ModalMode = "create" | "edit" | "view";

interface GlobalMasterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterKey: GlobalMasterKey;
  mode: ModalMode;
  typeLabel: string;
  initialValues?: Record<string, unknown>;
  resourceName?: string;
  isSubmitting?: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onDelete?: () => void;
  onRequestEdit?: () => void;
}

function validateField(field: MasterFieldDef, value: unknown): string | null {
  if (!field.required) return null;
  if (field.type === "toggle") return null;
  if (value === undefined || value === null || String(value).trim() === "") {
    return `${field.label} is required`;
  }
  if (field.type === "currency" || field.type === "number") {
    const n = Number(value);
    if (Number.isNaN(n) || n <= 0) return `${field.label} must be greater than 0`;
  }
  if (field.key.includes("email") || field.key === "vendorEmail" || field.key === "email") {
    const s = String(value);
    if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return "Invalid email address";
  }
  if (field.key.includes("phone") || field.key === "vendorTelephone" || field.key === "phone") {
    const digits = String(value).replace(/\D/g, "");
    if (digits && digits.length < 10) return "Phone must be at least 10 digits";
  }
  return null;
}

function FieldInput({
  field,
  value,
  error,
  readOnly,
  onChange,
}: {
  field: MasterFieldDef;
  value: unknown;
  error?: string;
  readOnly?: boolean;
  onChange: (v: unknown) => void;
}) {
  if (readOnly) {
    const raw = String(value ?? "");
    const selectLabel = field.options?.find((opt) => opt.value === raw)?.label;
    return (
      <p className="text-sm text-[var(--text-primary)] py-2">
        {field.type === "toggle"
          ? value ? "Active" : "Inactive"
          : selectLabel || raw || "—"}
      </p>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={field.disabled}
        className="gm-select-trigger"
      />
    );
  }

  if (field.type === "select") {
    const stringVal = String(value ?? "");
    const options = field.options ? [...field.options] : [];
    if (stringVal && !options.some((o) => o.value === stringVal)) {
      options.unshift({ value: stringVal, label: stringVal });
    }

    return (
      <Select
        value={stringVal}
        onValueChange={onChange}
        disabled={field.disabled}
      >
        <SelectTrigger className="gm-select-trigger h-[42px]">
          <SelectValue placeholder={field.placeholder ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === "toggle") {
    const on = value === true || value === "active";
    return (
      <div className="flex items-center gap-3 h-[42px]">
        <Switch checked={on} onCheckedChange={(c) => onChange(c ? "active" : "inactive")} />
        <span className="text-sm text-[var(--text-secondary)]">{on ? "Active" : "Inactive"}</span>
      </div>
    );
  }

  if (field.type === "currency") {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)]">₹</span>
        <input
          type="number"
          step="0.01"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="gm-select-trigger pl-8 text-right"
        />
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <input
        type="date"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        className="gm-select-trigger"
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        type="number"
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="gm-select-trigger text-right"
      />
    );
  }

  return (
    <input
      type="text"
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={field.disabled}
      className="gm-select-trigger"
    />
  );
}

export function GlobalMasterModal({
  open,
  onOpenChange,
  masterKey,
  mode,
  typeLabel,
  initialValues,
  resourceName,
  isSubmitting,
  onSubmit,
  onDelete,
  onRequestEdit,
}: GlobalMasterModalProps) {
  const config = MASTER_MODAL_CONFIG[masterKey];
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    defaultFormValues(masterKey)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const readOnly = mode === "view";

  useEffect(() => {
    if (open) {
      setValues({ ...defaultFormValues(masterKey), ...initialValues });
      setErrors({});
      setTouched({});
      setSavedFlash(false);
    }
  }, [open, masterKey, initialValues]);

  const title = useMemo(() => {
    if (mode === "view" && resourceName) return resourceName;
    if (mode === "edit") return `Edit ${typeLabel}`;
    return `Add New ${typeLabel}`;
  }, [mode, resourceName, typeLabel]);

  const isDirty = useMemo(() => {
    const defaults = { ...defaultFormValues(masterKey), ...initialValues };
    return JSON.stringify(values) !== JSON.stringify(defaults);
  }, [values, masterKey, initialValues]);

  const handleClose = () => {
    if (isDirty && mode !== "view") {
      if (!window.confirm("Discard unsaved changes?")) return;
    }
    onOpenChange(false);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const field of config.fields) {
      const err = validateField(field, values[field.key]);
      if (err) next[field.key] = err;
    }
    if (values.validFrom && values.validTo && String(values.validTo) <= String(values.validFrom)) {
      next.validTo = "End date must be after start date";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const allTouched: Record<string, boolean> = {};
    config.fields.forEach((f) => { allTouched[f.key] = true; });
    setTouched(allTouched);
    if (!validate()) return;
    onSubmit(values);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") handleClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!readOnly) handleSubmit(e as unknown as React.FormEvent);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { data: globalResources = [] } = useQuery<{ id: number; name: string; type: string }[]>({
    queryKey: ["/api/resources"],
    queryFn: async () => {
      const res = await fetch("/api/resources");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const { data: equipmentTypes = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/equipment-types"],
    queryFn: async () => {
      const res = await fetch("/api/equipment-types");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && masterKey === "equipment",
  });

  const { data: equipmentManufacturers = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/equipment-manufacturers"],
    queryFn: async () => {
      const res = await fetch("/api/equipment-manufacturers");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open && masterKey === "equipment",
  });

  const employeeLookupsEnabled = open && masterKey === "employees";
  const namedLookup = (path: string) => ({
    queryKey: [path],
    queryFn: async () => {
      const res = await fetch(path);
      if (!res.ok) return [] as { id: number; name: string }[];
      return res.json() as Promise<{ id: number; name: string }[]>;
    },
    enabled: employeeLookupsEnabled,
  });
  const { data: employeeNationalities = [] } = useQuery(namedLookup("/api/nationalities"));
  const { data: employeePositions = [] } = useQuery(namedLookup("/api/employee-positions"));
  const { data: employeeTitles = [] } = useQuery(namedLookup("/api/employee-titles"));
  const { data: employeeTrades = [] } = useQuery(namedLookup("/api/employee-trades"));
  const { data: employeeGrades = [] } = useQuery(namedLookup("/api/employee-grades"));

  const materialLookupsEnabled = open && masterKey === "materials";
  const { data: materialTypes = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/material-types"],
    queryFn: async () => {
      const res = await fetch("/api/material-types");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: materialLookupsEnabled,
  });
  const { data: materialGroups = [] } = useQuery<{ id: number; name: string; materialTypeId: number }[]>({
    queryKey: ["/api/material-groups"],
    queryFn: async () => {
      const res = await fetch("/api/material-groups");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: materialLookupsEnabled,
  });
  const uomLookupsEnabled = open && (masterKey === "materials" || masterKey === "services");
  const { data: materialUoms = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/uoms"],
    queryFn: async () => {
      const res = await fetch("/api/uoms");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: uomLookupsEnabled,
  });

  const serviceLookupsEnabled = open && masterKey === "services";
  const { data: serviceTypes = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/service-types"],
    queryFn: async () => {
      const res = await fetch("/api/service-types");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: serviceLookupsEnabled,
  });
  const { data: serviceGroups = [] } = useQuery<{ id: number; name: string; serviceTypeId: number }[]>({
    queryKey: ["/api/service-groups"],
    queryFn: async () => {
      const res = await fetch("/api/service-groups");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: serviceLookupsEnabled,
  });

  const vendorLookupsEnabled = open && masterKey === "vendors";
  const { data: vendorCountries = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/countries"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: vendorLookupsEnabled,
  });
  const { data: vendorCities = [] } = useQuery<{ id: number; name: string; countryId: number }[]>({
    queryKey: ["/api/cities"],
    queryFn: async () => {
      const res = await fetch("/api/cities");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: vendorLookupsEnabled,
  });

  const visibleFields = useMemo(() => {
    return config.fields.filter((field) => {
      const isInactive = values.status === "inactive";
      const reason = String(values.inactiveReason ?? "");

      if (field.key === "inactiveReason") return isInactive;
      if (field.key === "exitDate") return isInactive && reason === "exit";
      if (field.key === "leaveStartDate" || field.key === "leaveEndDate") {
        return isInactive && reason === "temporary-leave";
      }
      if (field.key === "maintenanceStartDate" || field.key === "maintenanceEndDate") {
        return isInactive && reason === "maintenance";
      }
      return true;
    }).map((field) => {
      if (masterKey === "equipment" && field.key === "category") {
        if (equipmentTypes.length > 0) {
          const fetchedOpts = equipmentTypes.map((t) => ({ value: t.name, label: t.name }));
          return { ...field, options: fetchedOpts };
        }
      }

      if (masterKey === "equipment" && field.key === "manufacturer") {
        if (equipmentManufacturers.length > 0) {
          const fetchedOpts = equipmentManufacturers.map((m) => ({ value: m.name, label: m.name }));
          return { ...field, options: fetchedOpts };
        }
      }

      if (masterKey === "employees") {
        const lookupByField: Record<string, { name: string }[]> = {
          empNationality: employeeNationalities,
          empPosition: employeePositions,
          empTitle: employeeTitles,
          empTrade: employeeTrades,
          empGrade: employeeGrades,
        };
        const lookup = lookupByField[field.key];
        if (lookup && lookup.length > 0) {
          return { ...field, options: lookup.map((item) => ({ value: item.name, label: item.name })) };
        }
      }

      if (masterKey === "materials") {
        if (field.key === "category" && materialTypes.length > 0) {
          return { ...field, options: materialTypes.map((item) => ({ value: item.name, label: item.name })) };
        }
        if (field.key === "subcategory" && materialGroups.length > 0) {
          const type = materialTypes.find((item) => item.name === String(values.category ?? ""));
          const groups = type
            ? materialGroups.filter((group) => group.materialTypeId === type.id)
            : [];
          return { ...field, options: groups.map((group) => ({ value: group.name, label: group.name })) };
        }
        if (field.key === "unitOfMeasure" && materialUoms.length > 0) {
          return { ...field, options: materialUoms.map((item) => ({ value: item.name, label: item.name })) };
        }
      }

      if (masterKey === "services") {
        if (field.key === "serviceType" && serviceTypes.length > 0) {
          return { ...field, options: serviceTypes.map((item) => ({ value: item.name, label: item.name })) };
        }
        if (field.key === "serviceGroup" && serviceGroups.length > 0) {
          const type = serviceTypes.find((item) => item.name === String(values.serviceType ?? ""));
          const groups = type
            ? serviceGroups.filter((group) => group.serviceTypeId === type.id)
            : [];
          return { ...field, options: groups.map((group) => ({ value: group.name, label: group.name })) };
        }
        if (field.key === "rateUnit" && materialUoms.length > 0) {
          return { ...field, options: materialUoms.map((item) => ({ value: item.name, label: item.name })) };
        }
      }

      if (masterKey === "vendors") {
        if (field.key === "vendorCountry" && vendorCountries.length > 0) {
          return { ...field, options: vendorCountries.map((item) => ({ value: item.name, label: item.name })) };
        }
        if (field.key === "vendorCity" && vendorCities.length > 0) {
          const country = vendorCountries.find((item) => item.name === String(values.vendorCountry ?? ""));
          const cities = country
            ? vendorCities.filter((city) => city.countryId === country.id)
            : [];
          return { ...field, options: cities.map((city) => ({ value: city.name, label: city.name })) };
        }
      }

      if (field.key === "mappedResourceId") {
        const typeFilter = masterKey === "equipment" ? "equipment" : "manpower";

        const options = globalResources
          .filter((r) => r.type === typeFilter || r.type === "manpower" || r.type === "equipment")
          .map((r) => ({ value: String(r.id), label: `${r.name} (${r.type})` }));

        return { ...field, options: options.length > 0 ? options : field.options };
      }
      return field;
    });
  }, [config.fields, values.status, values.inactiveReason, values.category, values.serviceType, values.vendorCountry, masterKey, globalResources, equipmentTypes, equipmentManufacturers, employeeNationalities, employeePositions, employeeTitles, employeeTrades, employeeGrades, materialTypes, materialGroups, materialUoms, serviceTypes, serviceGroups, vendorCountries, vendorCities]);

  const gridClass = config.size === "wide" ? "gm-modal__grid" : "flex flex-col gap-4";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogPortal>
        <DialogOverlay className="gm-modal-overlay" />
        <DialogContent
          className={`gm-modal gm-modal--${config.size} p-0 border-0 gap-0 max-h-[90vh]`}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <header className="gm-modal__header">
            <div>
              <DialogTitle className="text-xl font-semibold text-[var(--text-primary)]">{title}</DialogTitle>
              <DialogDescription className="text-xs text-[var(--text-secondary)] mt-1">
                {readOnly
                  ? "View record details below."
                  : `Fill in the details below to ${mode === "edit" ? "update" : "create"} this ${typeLabel.toLowerCase()} record.`}
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5"
              aria-label="Close"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </header>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="gm-modal__body">
              <div className={gridClass}>
                {visibleFields.map((field) => (
                  <div
                    key={field.key}
                    className={`gm-field ${field.fullWidth ? "gm-field--full" : ""} ${errors[field.key] && touched[field.key] ? "gm-field--error" : ""}`}
                  >
                    <label>
                      {field.label}
                      {field.required && <span className="gm-required"> *</span>}
                    </label>
                    {field.hint && (
                      <p className="text-[0.6875rem] text-[var(--text-muted)] mb-1">{field.hint}</p>
                    )}
                    <FieldInput
                      field={field}
                      value={values[field.key]}
                      readOnly={readOnly}
                      error={errors[field.key]}
                      onChange={(v) => {
                        setValues((prev) => {
                          const next = { ...prev, [field.key]: v };
                          if (masterKey === "materials" && field.key === "category") {
                            const type = materialTypes.find((item) => item.name === String(v));
                            const allowed = new Set(
                              materialGroups
                                .filter((group) => type && group.materialTypeId === type.id)
                                .map((group) => group.name)
                            );
                            if (!allowed.has(String(prev.subcategory ?? ""))) {
                              next.subcategory = "";
                            }
                          }
                          if (masterKey === "services" && field.key === "serviceType") {
                            const type = serviceTypes.find((item) => item.name === String(v));
                            const allowed = new Set(
                              serviceGroups
                                .filter((group) => type && group.serviceTypeId === type.id)
                                .map((group) => group.name)
                            );
                            if (!allowed.has(String(prev.serviceGroup ?? ""))) {
                              next.serviceGroup = "";
                            }
                          }
                          if (masterKey === "vendors" && field.key === "vendorCountry") {
                            const country = vendorCountries.find((item) => item.name === String(v));
                            const allowed = new Set(
                              vendorCities
                                .filter((city) => country && city.countryId === country.id)
                                .map((city) => city.name)
                            );
                            if (!allowed.has(String(prev.vendorCity ?? ""))) {
                              next.vendorCity = "";
                            }
                          }
                          return next;
                        });
                        if (touched[field.key]) {
                          const err = validateField(field, v);
                          setErrors((prev) => {
                            const next = { ...prev };
                            if (err) next[field.key] = err;
                            else delete next[field.key];
                            return next;
                          });
                        }
                      }}
                    />
                    {errors[field.key] && touched[field.key] && (
                      <p className="gm-field__error flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {errors[field.key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <footer className="gm-modal__footer">
              <div className="flex items-center gap-3">
                {mode === "edit" && onDelete && (
                  <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
                    Delete {typeLabel}
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={handleClose}>
                  {readOnly ? "Close" : "Cancel"}
                </Button>
              </div>
              <div className="flex items-center gap-2.5">
                {readOnly ? (
                  <Button
                    type="button"
                    className="cp-btn-primary"
                    onClick={onRequestEdit}
                  >
                    Edit
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="cp-btn-primary min-w-[140px]"
                    disabled={isSubmitting || Object.keys(errors).length > 0}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : savedFlash ? (
                      <>
                        <Check className="h-4 w-4 mr-1" /> Saved!
                      </>
                    ) : mode === "edit" ? (
                      "Save Changes"
                    ) : (
                      `Create ${typeLabel}`
                    )}
                  </Button>
                )}
              </div>
            </footer>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
