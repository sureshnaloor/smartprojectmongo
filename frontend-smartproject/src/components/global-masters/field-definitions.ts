import type { GlobalMasterKey } from "./constants";

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "currency"
  | "date"
  | "toggle"
  | "multiselect";

export interface FieldOption {
  value: string;
  label: string;
}

export interface MasterFieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  fullWidth?: boolean;
  placeholder?: string;
  disabled?: boolean;
  defaultValue?: string | boolean | string[];
  options?: FieldOption[];
  hint?: string;
  section?: string;
}

export interface MasterModalConfig {
  size: "standard" | "wide";
  fields: MasterFieldDef[];
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const MASTER_MODAL_CONFIG: Record<GlobalMasterKey, MasterModalConfig> = {
  manpower: {
    size: "standard",
    fields: [
      { key: "type", label: "Resource Type", type: "select", required: true, fullWidth: true, defaultValue: "manpower", disabled: true, options: [{ value: "manpower", label: "manpower" }] },
      { key: "name", label: "Resource Name", type: "text", required: true, fullWidth: true, placeholder: 'e.g., "Welder - Structural"' },
      { key: "description", label: "Description", type: "textarea", fullWidth: true, placeholder: "Structural steel SMAW/FCAW welder" },
      { key: "unitRate", label: "Hourly Rate (₹)", type: "currency", required: true, placeholder: "42" },
      { key: "trade", label: "Trade / Department", type: "select", required: true, options: ["Welding", "Electrical", "Mechanical", "Instrumentation", "Civil", "Piping", "General"].map((v) => ({ value: v, label: v })) },
      { key: "skillLevel", label: "Skill Level", type: "select", required: true, options: ["Skilled", "Semi-Skilled", "Unskilled", "Supervisor"].map((v) => ({ value: v, label: v })) },
      { key: "status", label: "Status", type: "toggle", required: true, defaultValue: "active" },
      { key: "remarks", label: "Remarks", type: "text", fullWidth: true, placeholder: "Internal notes" },
    ],
  },
  equipment: {
    size: "wide",
    fields: [
      { key: "type", label: "Resource Type", type: "select", required: true, fullWidth: true, defaultValue: "equipment", disabled: true, options: [{ value: "equipment", label: "equipment" }] },
      { key: "name", label: "Equipment Name", type: "text", required: true, fullWidth: true, placeholder: 'e.g., "Excavator - 20T"' },
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
      { key: "code", label: "Equipment Code", type: "text", required: true, placeholder: "EQP-EXC-001" },
      { key: "category", label: "Category", type: "select", required: true, options: ["Heavy", "Light", "Tool", "Vehicle"].map((v) => ({ value: v, label: v })) },
      { key: "subcategory", label: "Subcategory", type: "select", required: true, options: ["Earthmoving", "Lifting", "Welding", "Electrical", "Pneumatic"].map((v) => ({ value: v, label: v })) },
      { key: "unitRate", label: "Hourly Rate (₹)", type: "currency", required: true, placeholder: "200" },
      { key: "unit", label: "Unit", type: "select", required: true, options: ["Hour", "Day", "Shift", "Week", "Month"].map((v) => ({ value: v, label: v })) },
      { key: "manufacturer", label: "Manufacturer", type: "text", placeholder: "Caterpillar" },
      { key: "modelYear", label: "Model / Year", type: "text", placeholder: "320D - 2022" },
      { key: "capacity", label: "Capacity / Specs", type: "text", fullWidth: true },
      { key: "status", label: "Status", type: "toggle", required: true, defaultValue: "active" },
      { key: "remarks", label: "Remarks", type: "text", fullWidth: true },
    ],
  },
  materials: {
    size: "wide",
    fields: [
      { key: "type", label: "Resource Type", type: "select", required: true, fullWidth: true, defaultValue: "materials", disabled: true, options: [{ value: "materials", label: "materials" }] },
      { key: "code", label: "Material Code", type: "text", required: true, placeholder: "EPC-MAT-XXXXX" },
      { key: "name", label: "Material Name", type: "text", required: true, placeholder: "Seamless Pipe SCH-40" },
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
      { key: "category", label: "Category", type: "select", required: true, options: ["Piping", "Electrical", "Mechanical", "Civil", "Safety", "Instrumentation"].map((v) => ({ value: v, label: v })) },
      { key: "subcategory", label: "Subcategory", type: "select", required: true, options: ["Valves", "Cable", "Fasteners", "Concrete", "PPE", "Transmitters"].map((v) => ({ value: v, label: v })) },
      { key: "unitOfMeasure", label: "Unit of Measure", type: "select", required: true, options: ["ea", "kg", "m", "m²", "m³", "set", "lot", "drum"].map((v) => ({ value: v, label: v })) },
      { key: "unitRate", label: "Unit Rate (₹)", type: "currency", required: true, placeholder: "125.90" },
      { key: "leadTime", label: "Lead Time (days)", type: "number", placeholder: "14" },
      { key: "status", label: "Status", type: "toggle", required: true, defaultValue: "active" },
      { key: "remarks", label: "Remarks", type: "text", fullWidth: true },
    ],
  },
  services: {
    size: "standard",
    fields: [
      { key: "type", label: "Resource Type", type: "select", required: true, fullWidth: true, defaultValue: "services", disabled: true, options: [{ value: "services", label: "services" }] },
      { key: "name", label: "Service Name", type: "text", required: true, fullWidth: true },
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
      { key: "serviceType", label: "Service Type", type: "select", required: true, options: ["Lump Sum", "Rate-Based", "Fixed"].map((v) => ({ value: v, label: v })) },
      { key: "unitRate", label: "Rate (₹)", type: "currency", required: true },
      { key: "rateUnit", label: "Rate Unit", type: "select", required: true, options: ["Lump Sum", "Hour", "Day", "Month", "Job"].map((v) => ({ value: v, label: v })) },
      { key: "validFrom", label: "Valid From", type: "date" },
      { key: "validTo", label: "Valid To", type: "date" },
      { key: "status", label: "Status", type: "toggle", required: true, defaultValue: "active" },
      { key: "remarks", label: "Remarks", type: "text", fullWidth: true },
    ],
  },
  activities: {
    size: "wide",
    fields: [
      { key: "type", label: "Resource Type", type: "select", required: true, fullWidth: true, defaultValue: "activities", disabled: true, options: [{ value: "activities", label: "activities" }] },
      { key: "code", label: "Activity Code", type: "text", required: true, placeholder: "ACT-XXXX" },
      { key: "name", label: "Activity Name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
      { key: "phase", label: "Phase", type: "select", required: true, options: ["Procurement", "Construction", "Testing", "Commissioning", "Engineering"].map((v) => ({ value: v, label: v })) },
      { key: "duration", label: "Default Duration (days)", type: "number", required: true, placeholder: "5" },
      { key: "activityType", label: "Activity Type", type: "select", required: true, options: ["Standard", "Custom"].map((v) => ({ value: v, label: v })) },
      { key: "status", label: "Status", type: "toggle", required: true, defaultValue: "active" },
      { key: "remarks", label: "Remarks", type: "text", fullWidth: true },
    ],
  },
  vendors: {
    size: "wide",
    fields: [
      { key: "type", label: "Resource Type", type: "select", required: true, fullWidth: true, defaultValue: "vendors", disabled: true, options: [{ value: "vendors", label: "vendors" }] },
      { key: "vendorCode", label: "Vendor Code", type: "text", required: true, placeholder: "VEN-001" },
      { key: "vendorName", label: "Vendor Name", type: "text", required: true },
      { key: "vendorType", label: "Vendor Type", type: "select", required: true, options: ["Supplier", "Subcontractor", "Consultant", "Manufacturer"].map((v) => ({ value: v, label: v })) },
      { key: "contactPerson", label: "Contact Person", type: "text", required: true },
      { key: "vendorEmail", label: "Email", type: "text", required: true },
      { key: "vendorTelephone", label: "Phone", type: "text", required: true },
      { key: "vendorAddress", label: "Address", type: "textarea", fullWidth: true },
      { key: "vendorCity", label: "City / State", type: "text" },
      { key: "vendorCountry", label: "Country", type: "select", options: ["India", "UAE", "Singapore"].map((v) => ({ value: v, label: v })) },
      { key: "vendorTaxNumber", label: "Tax ID / GST", type: "text" },
      { key: "status", label: "Status", type: "toggle", required: true, defaultValue: "active" },
      { key: "remarks", label: "Remarks", type: "text", fullWidth: true },
    ],
  },
  employees: {
    size: "wide",
    fields: [
      { key: "type", label: "Resource Type", type: "select", required: true, fullWidth: true, defaultValue: "employees", disabled: true, options: [{ value: "employees", label: "employees" }] },
      { key: "employeeNumber", label: "Employee Code", type: "text", required: true, placeholder: "EPC-EMP-00001" },
      { key: "fullName", label: "Full Name", type: "text", required: true },
      { key: "empPosition", label: "Designation", type: "select", required: true, options: ["Manager", "Engineer", "Supervisor", "Foreman", "Technician", "Laborer"].map((v) => ({ value: v, label: v })) },
      { key: "department", label: "Department", type: "select", required: true, options: ["Management", "Engineering", "Supervisory", "Skilled", "Admin"].map((v) => ({ value: v, label: v })) },
      { key: "employmentType", label: "Employment Type", type: "select", required: true, options: ["Own", "Contract", "Agency"].map((v) => ({ value: v, label: v })) },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "entryDate", label: "Joining Date", type: "date" },
      { key: "status", label: "Status", type: "toggle", required: true, defaultValue: "active" },
      { key: "remarks", label: "Remarks", type: "text", fullWidth: true },
    ],
  },
  tasks: {
    size: "standard",
    fields: [
      { key: "type", label: "Resource Type", type: "select", required: true, fullWidth: true, defaultValue: "tasks", disabled: true, options: [{ value: "tasks", label: "tasks" }] },
      { key: "code", label: "Task Code", type: "text", required: true, placeholder: "TSK-XXXX" },
      { key: "name", label: "Task Name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", fullWidth: true },
      { key: "taskType", label: "Task Type", type: "select", required: true, options: ["Template", "Recurring"].map((v) => ({ value: v, label: v })) },
      { key: "category", label: "Category", type: "select", required: true, options: ["Planning", "Execution", "QC", "Documentation"].map((v) => ({ value: v, label: v })) },
      { key: "duration", label: "Estimated Duration (days)", type: "number", required: true, placeholder: "3" },
      { key: "status", label: "Status", type: "toggle", required: true, defaultValue: "active" },
      { key: "remarks", label: "Remarks", type: "text", fullWidth: true },
    ],
  },
};

export function defaultFormValues(key: GlobalMasterKey): Record<string, unknown> {
  const config = MASTER_MODAL_CONFIG[key];
  const values: Record<string, unknown> = {};
  for (const field of config.fields) {
    if (field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue;
    } else if (field.type === "toggle") {
      values[field.key] = true;
    } else if (field.type === "multiselect") {
      values[field.key] = [];
    } else {
      values[field.key] = "";
    }
  }
  return values;
}
