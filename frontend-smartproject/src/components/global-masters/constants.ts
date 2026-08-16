import type { LucideIcon } from "lucide-react";
import {
  Users,
  Truck,
  Package,
  Wrench,
  Activity,
  Building2,
  UserCircle,
  CheckSquare,
} from "lucide-react";

export type GlobalMasterKey =
  | "manpower"
  | "equipment"
  | "materials"
  | "services"
  | "activities"
  | "vendors"
  | "employees"
  | "tasks";

export interface GlobalMasterTab {
  key: GlobalMasterKey;
  label: string;
  href: string;
  Icon: LucideIcon;
  addLabel: string;
  title: string;
  pageTitle: string;
  mappedEntityLabel: string;
}

export const GLOBAL_MASTER_TABS: GlobalMasterTab[] = [
  { key: "manpower", label: "Manpower", href: "/resource-master", Icon: Users, addLabel: "Manpower", title: "Manpower", pageTitle: "Manpower Master", mappedEntityLabel: "Employee Master" },
  { key: "equipment", label: "Equipment", href: "/equipment-master", Icon: Truck, addLabel: "Equipment", title: "Equipment", pageTitle: "Equipment Master", mappedEntityLabel: "Equipment Units" },
  { key: "materials", label: "Materials", href: "/material-master", Icon: Package, addLabel: "Material", title: "Materials", pageTitle: "Materials Master", mappedEntityLabel: "Suppliers" },
  { key: "services", label: "Services", href: "/service-master", Icon: Wrench, addLabel: "Service", title: "Services", pageTitle: "Services Master", mappedEntityLabel: "Vendor Rates" },
  { key: "activities", label: "Activities", href: "/activity-master", Icon: Activity, addLabel: "Activity", title: "Activities", pageTitle: "Activities Master", mappedEntityLabel: "Resources Required" },
  { key: "vendors", label: "Vendors", href: "/vendor-master", Icon: Building2, addLabel: "Vendor", title: "Vendors", pageTitle: "Vendors Master", mappedEntityLabel: "Supplied Materials" },
  { key: "employees", label: "Employees", href: "/employee-master", Icon: UserCircle, addLabel: "Employee", title: "Employees", pageTitle: "Employees Master", mappedEntityLabel: "Manpower Roles" },
  { key: "tasks", label: "Tasks", href: "/task-master", Icon: CheckSquare, addLabel: "Task", title: "Tasks", pageTitle: "Tasks Master", mappedEntityLabel: "Activity Links" },
];

export function masterPageTitle(key: GlobalMasterKey): string {
  return GLOBAL_MASTER_TABS.find((t) => t.key === key)?.pageTitle ?? "Resource Master";
}

export function masterTabForPath(path: string): GlobalMasterTab | undefined {
  return GLOBAL_MASTER_TABS.find(
    (t) => path === t.href || path.startsWith(`${t.href}/`)
  );
}

export interface MasterFilterConfig {
  typeOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
}

export const MASTER_FILTERS: Record<GlobalMasterKey, MasterFilterConfig> = {
  manpower: {
    typeOptions: [
      { value: "all", label: "All Types" },
      { value: "manpower", label: "Manpower" },
      { value: "rental_manpower", label: "Rental Manpower" },
    ],
    categoryOptions: [
      { value: "all", label: "All Categories" },
      { value: "Welding", label: "Welding" },
      { value: "Electrical", label: "Electrical" },
      { value: "Mechanical", label: "Mechanical" },
      { value: "Civil", label: "Civil" },
      { value: "Piping", label: "Piping" },
      { value: "General", label: "General" },
    ],
  },
  equipment: {
    typeOptions: [
      { value: "all", label: "All Ownership" },
      { value: "Own", label: "Own Equipment" },
      { value: "Rental", label: "Rental Equipment" },
    ],
    categoryOptions: [
      { value: "all", label: "All Equipment Types" },
      { value: "Air Compressor", label: "Air Compressor" },
      { value: "Backhoe Loader", label: "Backhoe Loader" },
      { value: "Crawler Crane", label: "Crawler Crane" },
      { value: "Dump Truck", label: "Dump Truck" },
      { value: "Excavator", label: "Excavator" },
      { value: "Forklift", label: "Forklift" },
      { value: "Generator", label: "Generator" },
      { value: "Loader", label: "Loader" },
      { value: "Mobile Crane", label: "Mobile Crane" },
      { value: "Tower Crane", label: "Tower Crane" },
    ],
  },
  materials: {
    typeOptions: [
      { value: "all", label: "All Types" },
      { value: "Direct", label: "Direct" },
      { value: "Indirect", label: "Indirect" },
      { value: "Consumable", label: "Consumable" },
    ],
    categoryOptions: [
      { value: "all", label: "All Categories" },
      { value: "Piping", label: "Piping" },
      { value: "Electrical", label: "Electrical" },
      { value: "Mechanical", label: "Mechanical" },
      { value: "Civil", label: "Civil" },
      { value: "Safety", label: "Safety" },
    ],
  },
  services: {
    typeOptions: [
      { value: "all", label: "All Types" },
      { value: "Lump Sum", label: "Lump Sum" },
      { value: "Rate-Based", label: "Rate-Based" },
      { value: "Fixed", label: "Fixed" },
    ],
    categoryOptions: [
      { value: "all", label: "All Categories" },
      { value: "Engineering", label: "Engineering" },
      { value: "Construction", label: "Construction" },
      { value: "Testing", label: "Testing" },
    ],
  },
  activities: {
    typeOptions: [
      { value: "all", label: "All Types" },
      { value: "Standard", label: "Standard" },
      { value: "Custom", label: "Custom" },
    ],
    categoryOptions: [
      { value: "all", label: "All Phases" },
      { value: "Procurement", label: "Procurement" },
      { value: "Construction", label: "Construction" },
      { value: "Testing", label: "Testing" },
      { value: "Engineering", label: "Engineering" },
    ],
  },
  vendors: {
    typeOptions: [
      { value: "all", label: "All Types" },
      { value: "Supplier", label: "Supplier" },
      { value: "Subcontractor", label: "Subcontractor" },
      { value: "Consultant", label: "Consultant" },
    ],
    categoryOptions: [
      { value: "all", label: "All Categories" },
      { value: "Local", label: "Local" },
      { value: "International", label: "International" },
      { value: "Preferred", label: "Preferred" },
    ],
  },
  employees: {
    typeOptions: [
      { value: "all", label: "All Types" },
      { value: "Own", label: "Own" },
      { value: "Contract", label: "Contract" },
      { value: "Agency", label: "Agency" },
    ],
    categoryOptions: [
      { value: "all", label: "All Departments" },
      { value: "Management", label: "Management" },
      { value: "Engineering", label: "Engineering" },
      { value: "Skilled", label: "Skilled" },
    ],
  },
  tasks: {
    typeOptions: [
      { value: "all", label: "All Types" },
      { value: "Template", label: "Template" },
      { value: "Recurring", label: "Recurring" },
    ],
    categoryOptions: [
      { value: "all", label: "All Categories" },
      { value: "Planning", label: "Planning" },
      { value: "Execution", label: "Execution" },
      { value: "QC", label: "QC" },
    ],
  },
};
