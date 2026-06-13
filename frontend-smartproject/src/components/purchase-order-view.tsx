import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer, X } from "lucide-react";
import { CompanyDocumentHeader } from "@/components/company-document-header";
import { useCompanyProfile } from "@/lib/company-profile";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  poDate: string;
  vendor: string;
  remarks: string | null;
  deliveryTerms?: string | null;
  incoterms?: string | null;
  paymentTerms?: string | null;
  paymentMode?: string | null;
}

interface PurchaseOrderItem {
  id: number;
  lineNumber: number;
  itemType: string;
  itemDescription: string;
  quantity: string;
  unitOfMeasure: string;
  unitPrice: string;
  totalPrice: string;
  estimatedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  projectId: number | null;
  wpId: number | null;
  longDescription?: string | null;
}

interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
  vendorAddress?: string | null;
  vendorCity?: string | null;
  vendorCountry?: string | null;
  vendorZipCode?: string | null;
}

interface ProjectSummary {
  id: number;
  name: string;
}

export type PoViewMode = "screen" | "print";

interface PurchaseOrderViewDialogProps {
  orderId: number | null;
  mode: PoViewMode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors?: Vendor[];
  projects?: ProjectSummary[];
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function formatMoney(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? "0.00" : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itemTypeLabel(type: string): string {
  switch (type) {
    case "material":
      return "Material";
    case "service":
      return "Service";
    case "rental_equipment":
      return "Rental Equipment";
    case "rental_employee":
      return "Rental Employee";
    case "tools":
      return "Tools";
    default:
      return type || "—";
  }
}

function usePurchaseOrderDetail(orderId: number | null, enabled: boolean) {
  return useQuery<{
    order: PurchaseOrder;
    items: PurchaseOrderItem[];
  } | null>({
    queryKey: ["/api/purchase-orders", orderId, "view"],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await fetch(`/api/purchase-orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to load purchase order");
      return res.json();
    },
    enabled: enabled && !!orderId,
  });
}

function PoHeaderRows({
  order,
  vendor,
  grandTotal,
}: {
  order: PurchaseOrder;
  vendor?: Vendor;
  grandTotal: number;
}) {
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-b pb-3">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">PO Number</p>
          <p className="font-semibold">{order.poNumber}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">PO Date</p>
          <p className="font-semibold">{formatDate(order.poDate)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Vendor</p>
          <p className="font-semibold">{order.vendor}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Grand Total</p>
          <p className="font-semibold">{formatMoney(grandTotal)}</p>
        </div>
      </div>
      {vendor && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-600">
          <p><span className="font-medium">Code:</span> {vendor.vendorCode}</p>
          {vendor.vendorAddress && <p><span className="font-medium">Address:</span> {vendor.vendorAddress}</p>}
          {(vendor.vendorCity || vendor.vendorCountry) && (
            <p>
              <span className="font-medium">Location:</span>{" "}
              {[vendor.vendorCity, vendor.vendorCountry].filter(Boolean).join(", ")}
            </p>
          )}
          {vendor.vendorZipCode && <p><span className="font-medium">Zip:</span> {vendor.vendorZipCode}</p>}
        </div>
      )}
      {(order.deliveryTerms || order.incoterms || order.paymentTerms || order.paymentMode) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-zinc-600 border-t pt-3">
          {order.deliveryTerms && <p><span className="font-medium">Delivery:</span> {order.deliveryTerms}</p>}
          {order.incoterms && <p><span className="font-medium">Incoterms:</span> {order.incoterms}</p>}
          {order.paymentTerms && <p><span className="font-medium">Payment Terms:</span> {order.paymentTerms}</p>}
          {order.paymentMode && <p><span className="font-medium">Payment Mode:</span> {order.paymentMode}</p>}
        </div>
      )}
      {order.remarks && (
        <div className="text-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Remarks</p>
          <p className="text-zinc-700">{order.remarks}</p>
        </div>
      )}
    </div>
  );
}

function ScreenViewContent({
  order,
  items,
  vendor,
  projects,
}: {
  order: PurchaseOrder;
  items: PurchaseOrderItem[];
  vendor?: Vendor;
  projects?: ProjectSummary[];
}) {
  const grandTotal = items.reduce((sum, i) => sum + Number(i.totalPrice || 0), 0);
  const projectName = (id: number | null) =>
    id != null ? projects?.find((p) => p.id === id)?.name ?? String(id) : "—";

  return (
    <div className="space-y-4">
      <PoHeaderRows order={order} vendor={vendor} grandTotal={grandTotal} />
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Est. Delivery</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>WP</TableHead>
              <TableHead>Long Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-zinc-500 py-6">
                  No line items
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id ?? item.lineNumber}>
                  <TableCell>{item.lineNumber}</TableCell>
                  <TableCell>{itemTypeLabel(item.itemType)}</TableCell>
                  <TableCell className="max-w-[200px]">{item.itemDescription}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell>{item.unitOfMeasure}</TableCell>
                  <TableCell className="text-right">{formatMoney(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(item.totalPrice)}</TableCell>
                  <TableCell>{formatDate(item.estimatedDeliveryDate)}</TableCell>
                  <TableCell>{projectName(item.projectId)}</TableCell>
                  <TableCell>{item.wpId ?? "—"}</TableCell>
                  <TableCell className="max-w-[180px] text-xs">{item.longDescription || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PrintViewContent({
  order,
  items,
  vendor,
}: {
  order: PurchaseOrder;
  items: PurchaseOrderItem[];
  vendor?: Vendor;
}) {
  const { data: companyProfile } = useCompanyProfile();
  const grandTotal = items.reduce((sum, i) => sum + Number(i.totalPrice || 0), 0);

  return (
    <div id="po-print-document" className="bg-white text-black mx-auto w-full max-w-[210mm] min-h-[297mm] p-10 shadow-sm border border-zinc-200 print:shadow-none print:border-0 print:p-0 print:max-w-none">
      <CompanyDocumentHeader
        profile={companyProfile}
        documentTitle="PURCHASE ORDER"
        rightContent={
          <>
            <p className="font-bold text-lg">{order.poNumber}</p>
            <p>Date: {formatDate(order.poDate)}</p>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Vendor</p>
          <p className="font-semibold text-base">{order.vendor}</p>
          {vendor?.vendorCode && <p className="text-zinc-600">Code: {vendor.vendorCode}</p>}
          {vendor?.vendorAddress && <p className="text-zinc-600 mt-1">{vendor.vendorAddress}</p>}
          {(vendor?.vendorCity || vendor?.vendorCountry) && (
            <p className="text-zinc-600">
              {[vendor.vendorCity, vendor.vendorCountry, vendor.vendorZipCode].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Order Summary</p>
          <p>Line items: {items.length}</p>
          <p className="font-bold text-lg mt-2">Total: {formatMoney(grandTotal)}</p>
        </div>
      </div>

      <table className="w-full text-sm border-collapse mb-8">
        <thead>
          <tr className="border-b-2 border-zinc-900">
            <th className="py-2 text-left w-8">#</th>
            <th className="py-2 text-left">Description</th>
            <th className="py-2 text-left">Type</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-left">UOM</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id ?? item.lineNumber} className="border-b border-zinc-200">
              <td className="py-2 align-top">{item.lineNumber}</td>
              <td className="py-2 align-top pr-4">{item.itemDescription}</td>
              <td className="py-2 align-top">{itemTypeLabel(item.itemType)}</td>
              <td className="py-2 text-right align-top">{item.quantity}</td>
              <td className="py-2 align-top">{item.unitOfMeasure}</td>
              <td className="py-2 text-right align-top">{formatMoney(item.unitPrice)}</td>
              <td className="py-2 text-right align-top font-medium">{formatMoney(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} className="py-3 text-right font-semibold">Grand Total</td>
            <td className="py-3 text-right font-bold text-base">{formatMoney(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {(order.deliveryTerms || order.incoterms || order.paymentTerms || order.paymentMode) && (
        <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4 mb-4">
          {order.deliveryTerms && <p><strong>Delivery Terms:</strong> {order.deliveryTerms}</p>}
          {order.incoterms && <p><strong>Incoterms:</strong> {order.incoterms}</p>}
          {order.paymentTerms && <p><strong>Payment Terms:</strong> {order.paymentTerms}</p>}
          {order.paymentMode && <p><strong>Payment Mode:</strong> {order.paymentMode}</p>}
        </div>
      )}

      {order.remarks && (
        <div className="text-sm border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Remarks</p>
          <p>{order.remarks}</p>
        </div>
      )}

      <div className="mt-16 grid grid-cols-2 gap-12 text-sm print:mt-24">
        <div className="border-t border-zinc-400 pt-2">
          <p className="text-xs text-zinc-500">Authorized By</p>
        </div>
        <div className="border-t border-zinc-400 pt-2">
          <p className="text-xs text-zinc-500">Vendor Acknowledgement</p>
        </div>
      </div>
    </div>
  );
}

export function PurchaseOrderViewDialog({
  orderId,
  mode,
  open,
  onOpenChange,
  vendors = [],
  projects = [],
}: PurchaseOrderViewDialogProps) {
  const { data, isLoading, isError } = usePurchaseOrderDetail(orderId, open);

  const handlePrint = () => {
    window.print();
  };

  const vendor = data?.order
    ? vendors.find((v) => v.vendorName === data.order.vendor)
    : undefined;

  const title =
    mode === "print"
      ? "Print View"
      : "Screen View";

  return (
    <>
      <style>{`
        @media print {
          body > *:not([data-radix-portal]) {
            display: none !important;
          }
          [data-radix-portal] > *:not([role="dialog"]) {
            display: none !important;
          }
          [role="dialog"] {
            position: fixed !important;
            inset: 0 !important;
            transform: none !important;
            max-width: none !important;
            width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            overflow: visible !important;
          }
          [role="dialog"] button,
          [role="dialog"] [data-po-view-toolbar] {
            display: none !important;
          }
          #po-print-document {
            box-shadow: none !important;
            border: none !important;
            min-height: auto !important;
          }
        }
      `}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={
            mode === "print"
              ? "max-w-4xl max-h-[95vh] overflow-y-auto print:max-w-none print:overflow-visible"
              : "max-w-5xl max-h-[90vh] overflow-y-auto"
          }
        >
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pr-8">
            <DialogTitle>
              {title}
              {data?.order ? ` — ${data.order.poNumber}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div data-po-view-toolbar className="flex justify-end gap-2 -mt-2 mb-2">
            {mode === "print" && data?.order && (
              <Button size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>

          {isLoading && (
            <p className="text-sm text-zinc-500 py-8 text-center">Loading purchase order…</p>
          )}
          {isError && (
            <p className="text-sm text-red-600 py-8 text-center">Could not load purchase order.</p>
          )}
          {data?.order && mode === "screen" && (
            <ScreenViewContent
              order={data.order}
              items={data.items}
              vendor={vendor}
              projects={projects}
            />
          )}
          {data?.order && mode === "print" && (
            <PrintViewContent order={data.order} items={data.items} vendor={vendor} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
