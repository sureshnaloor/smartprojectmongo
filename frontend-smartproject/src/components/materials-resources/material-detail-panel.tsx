import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { materialCategoryLabel, type MaterialItem } from "./constants";

interface MaterialDetailPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialItem | null;
  allocatedQty: number;
  assignments: { wpName: string; quantity: string; amount: string }[];
  onEdit: () => void;
}

export function MaterialDetailPanel({
  open,
  onOpenChange,
  material,
  allocatedQty,
  assignments,
  onEdit,
}: MaterialDetailPanelProps) {
  if (!material) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] overflow-y-auto shadow-xl">
        <SheetHeader>
          <p className="kanban-body-sm font-mono text-[var(--copper-600)]">{material.materialCode}</p>
          <SheetTitle className="kanban-heading-md text-left">{material.materialDescription}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="kanban-caption text-[var(--text-secondary)]">Base Rate</p>
              <p className="kanban-heading-md font-mono text-[var(--text-primary)]">
                {formatCurrency(Number(material.baseRate || 0))}
              </p>
            </div>
            <div>
              <p className="kanban-caption text-[var(--text-secondary)]">In Stock</p>
              <p className="kanban-heading-md text-[var(--text-primary)]">— {material.uom}</p>
            </div>
            <div>
              <p className="kanban-caption text-[var(--text-secondary)]">Allocated</p>
              <p className="kanban-heading-md text-[var(--text-primary)]">
                {allocatedQty} {material.uom}
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 kanban-body-sm font-semibold text-[var(--text-primary)]">Details</h4>
            <table className="w-full kanban-body-sm">
              <tbody>
                {[
                  ["Category", materialCategoryLabel(material)],
                  ["Unit", material.uom],
                  ["Class", material.materialClass ?? "common"],
                  ["Last Updated", material.updatedAt ? new Date(material.updatedAt).toLocaleDateString() : "—"],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2 text-[var(--text-secondary)]">{k}</td>
                    <td className="py-2 text-right text-[var(--text-primary)]">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {assignments.length > 0 && (
            <div>
              <h4 className="mb-2 kanban-body-sm font-semibold text-[var(--text-primary)]">Assigned Work Packages</h4>
              <ul className="space-y-2">
                {assignments.map((a, i) => (
                  <li
                    key={i}
                    className="flex justify-between rounded-md px-3 py-2 kanban-body-sm"
                    style={{ backgroundColor: "var(--bg-cream)" }}
                  >
                    <span>{a.wpName}</span>
                    <span className="font-mono text-[var(--text-secondary)]">
                      {a.quantity} · {formatCurrency(Number(a.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <SheetFooter className="mt-8 gap-2 sm:justify-start">
          <Button variant="outline" onClick={onEdit}>
            Edit Material
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
