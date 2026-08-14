import { z } from "zod";
import * as XLSX from "xlsx";
import { csvImportSchema } from "@/types";

export async function parseCsvFile(file: File): Promise<{ data: any[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csvData = event.target?.result as string;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        const validatedData = csvImportSchema.parse(data);
        resolve({ data: validatedData, errors: [] });
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve({
            data: [],
            errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
          });
        } else {
          reject(error);
        }
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
}

export function parseCsvText(text: string): { data: any[]; errors: string[] } {
  try {
    // Remove Byte Order Mark (BOM) if present
    const cleanText = text.replace(/^\uFEFF/, '');

    // Split by any line ending and filter empty lines
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== "");

    if (lines.length === 0) {
      return {
        data: [],
        errors: ["CSV file is empty or contains no valid data"]
      };
    }

    const headers = lines[0].split(",").map(header => header.trim());

    // Check if required columns exist
    const requiredColumns = ["wbsCode", "wbsName", "wbsType"];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      return {
        data: [],
        errors: [`Missing required columns: ${missingColumns.join(", ")}`]
      };
    }

    const data = [];
    const errors = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map(value => value.trim());

      // Skip if number of values doesn't match headers
      if (values.length !== headers.length) {
        errors.push(`Line ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }

      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Basic validation for required fields
      if (!row.wbsCode) {
        errors.push(`Line ${i + 1}: Missing WBS code`);
        continue;
      }

      if (!row.wbsName) {
        errors.push(`Line ${i + 1}: Missing WBS name`);
        continue;
      }

      if (!row.wbsType || !["Summary", "WorkPackage", "Activity"].includes(row.wbsType)) {
        errors.push(`Line ${i + 1}: Invalid WBS type - must be Summary, WorkPackage, or Activity`);
        continue;
      }

      // Type-specific validations
      if (row.wbsType === "Summary" || row.wbsType === "WorkPackage") {
        // Check for budget amount
        if (!row.amount || isNaN(Number(row.amount))) {
          errors.push(`Line ${i + 1}: ${row.wbsType} type must have a valid budget amount`);
          continue;
        }
      }

      if (row.wbsType === "Activity") {
        // Activities can't have budget
        if (row.amount && Number(row.amount) !== 0) {
          errors.push(`Line ${i + 1}: Activity type cannot have a budget amount (must be 0 or empty)`);
          continue;
        }
      }

      data.push(row);
    }

    return { data, errors };
  } catch (error) {
    console.error("CSV parsing error:", error);
    return {
      data: [],
      errors: [(error instanceof Error) ? error.message : "Unknown error parsing CSV"]
    };
  }
}

export function generateCsvTemplate(): string {
  return "wbsCode,wbsName,wbsType,wbsDescription,amount\n" +
    "1,Engineering & Design,Summary,Engineering and design phase,5000\n" +
    "1.1,Preliminary Design,WorkPackage,Initial design work,2000\n" +
    "1.1.1,Requirements Analysis,Activity,Gather requirements,\n" +
    "2,Procurement & Construction,Summary,Procurement and construction,85000\n" +
    "2.1,Material Procurement,WorkPackage,Purchase materials,15000\n" +
    "2.1.1,Vendor Selection,Activity,Select vendors,\n" +
    "3,Testing & Commissioning,Summary,Testing and commissioning,10000";
}

export function downloadCsvTemplate(): void {
  const csvContent = generateCsvTemplate();
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "wbs_import_template.csv");
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function validateCsvData(data: any[]): any {
  return csvImportSchema.parse(data);
}

// --- WBS upload: SUMMARY (root), WBS (structural), WorkPackage (leaves) ---
const WBS_TYPES = ["SUMMARY", "WBS", "WorkPackage"] as const;
const MAX_WBS_LEVEL = 9;

export type WbsImportRow = {
  wbsCode: string;
  wbsName: string;
  wbsType: (typeof WBS_TYPES)[number];
  wbsDescription: string;
  budget: string;
  amount: string;
};

/** Strip BOM, zero-width chars, normalize unicode (Excel often emits odd spaces). */
function cleanCsvCell(raw: string): string {
  let s = String(raw ?? "")
    .replace(/^\uFEFF/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .normalize("NFKC")
    .trim();
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).replace(/""/g, '"');
  }
  return s.trim();
}

/**
 * Parse one CSV line respecting quoted fields (commas inside "..." do not split).
 */
function parseCsvRowLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      out.push(cleanCsvCell(cur));
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cleanCsvCell(cur));
  return out;
}

function detectWbsDelimiter(headerLine: string): string {
  const byComma = parseCsvRowLine(headerLine, ",");
  const bySemi = parseCsvRowLine(headerLine, ";");
  if (byComma.length >= 3) return ",";
  if (bySemi.length >= 3) return ";";
  return ",";
}

/** Map spreadsheet / P6 / ERP header labels onto canonical field names. */
function canonicalizeWbsHeader(raw: string): string {
  const key = cleanCsvCell(raw)
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "");
  const map: Record<string, string> = {
    wbscode: "wbsCode",
    code: "wbsCode",
    wbs: "wbsCode",
    wbsid: "wbsCode",
    activityid: "wbsCode",
    activitycode: "wbsCode",
    taskcode: "wbsCode",
    outlinecode: "wbsCode",
    wbsname: "wbsName",
    name: "wbsName",
    activityname: "wbsName",
    taskname: "wbsName",
    title: "wbsName",
    description: "wbsDescription",
    wbsdescription: "wbsDescription",
    desc: "wbsDescription",
    remarks: "wbsDescription",
    wbstype: "wbsType",
    type: "wbsType",
    nodetype: "wbsType",
    itemtype: "wbsType",
    budget: "budget",
    amount: "budget",
    budgetedcost: "budget",
    originalbudget: "budget",
    plannedbudget: "budget",
    cost: "budget",
  };
  return map[key] ?? cleanCsvCell(raw);
}

/** Accept common spreadsheet variants (case, camelCase, spaces). */
function normalizeWbsType(raw: string): (typeof WBS_TYPES)[number] | null {
  const s = cleanCsvCell(raw || "");
  if (!s) return null;
  const compact = s.replace(/\s+/g, "");
  if (WBS_TYPES.includes(compact as (typeof WBS_TYPES)[number])) {
    return compact as (typeof WBS_TYPES)[number];
  }
  const key = s.toLowerCase().replace(/[\s_-]+/g, "");
  if (key === "summary" || key === "project" || key === "root") return "SUMMARY";
  if (key === "wbs" || key === "wbsitem" || key === "phase" || key === "summarywbs") return "WBS";
  if (
    key === "workpackage" ||
    key === "wp" ||
    key === "leaf" ||
    key === "activity" || // P6 leaf activities map to our work packages
    key === "task"
  ) {
    return "WorkPackage";
  }
  return null;
}

/**
 * When wbsType is blank: level 1 → SUMMARY; nodes with children → WBS; leaves (depth ≥ 3) → WorkPackage.
 */
export function inferWbsTypes(
  rows: { wbsCode: string; wbsType?: string | null }[]
): { wbsCode: string; wbsType: (typeof WBS_TYPES)[number] }[] {
  const codes = new Set(rows.map((r) => r.wbsCode));
  const hasChild = new Set<string>();
  Array.from(codes).forEach((code) => {
    const parts = code.split(".");
    if (parts.length > 1) {
      hasChild.add(parts.slice(0, -1).join("."));
    }
  });

  return rows.map((row) => {
    const explicit = normalizeWbsType(String(row.wbsType ?? ""));
    if (explicit) return { wbsCode: row.wbsCode, wbsType: explicit };

    const level = row.wbsCode.split(".").length;
    if (level === 1) return { wbsCode: row.wbsCode, wbsType: "SUMMARY" };
    if (hasChild.has(row.wbsCode)) return { wbsCode: row.wbsCode, wbsType: "WBS" };
    // Leaf under root (1.x) cannot be WP (min depth 3) — treat as WBS needing children
    if (level < 3) return { wbsCode: row.wbsCode, wbsType: "WBS" };
    return { wbsCode: row.wbsCode, wbsType: "WorkPackage" };
  });
}

function parseBudgetCell(raw: string): { ok: boolean; value: string; error?: string } {
  const s = cleanCsvCell(raw);
  if (!s) return { ok: true, value: "0" }; // optional — structure first
  const cleaned = s.replace(/,/g, "").replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  if (isNaN(n) || n < 0) return { ok: false, value: "0", error: "budget must be a number >= 0" };
  return { ok: true, value: String(n) };
}

function rowsFromHeaderAndMatrix(
  headersRaw: string[],
  matrix: string[][]
): { data: WbsImportRow[]; errors: string[] } {
  const headers = headersRaw.map(canonicalizeWbsHeader);
  const codeIdx = headers.indexOf("wbsCode");
  const nameIdx = headers.indexOf("wbsName");
  if (codeIdx < 0 || nameIdx < 0) {
    return {
      data: [],
      errors: [
        "Missing required columns for code and name. Use headers like: wbsCode, wbsName, wbsType, wbsDescription, budget (aliases: Code, Name, Type, Description, Budget).",
      ],
    };
  }

  const typeIdx = headers.indexOf("wbsType");
  const descIdx = headers.indexOf("wbsDescription");
  const budgetIdx = headers.indexOf("budget");

  const draft: {
    wbsCode: string;
    wbsName: string;
    wbsType?: string;
    wbsDescription: string;
    budget: string;
    line: number;
  }[] = [];
  const errors: string[] = [];

  for (let i = 0; i < matrix.length; i++) {
    const values = matrix[i];
    const line = i + 2; // header is line 1
    const wbsCode = cleanCsvCell(values[codeIdx] ?? "");
    const wbsName = cleanCsvCell(values[nameIdx] ?? "");
    if (!wbsCode && !wbsName) continue;
    if (!wbsCode) {
      errors.push(`Line ${line}: Missing WBS code`);
      continue;
    }
    if (!wbsName) {
      errors.push(`Line ${line}: Missing WBS name`);
      continue;
    }
    const budgetRaw = budgetIdx >= 0 ? values[budgetIdx] ?? "" : "";
    const budgetParsed = parseBudgetCell(budgetRaw);
    if (!budgetParsed.ok) {
      errors.push(`Line ${line}: ${budgetParsed.error}`);
      continue;
    }
    draft.push({
      wbsCode,
      wbsName,
      wbsType: typeIdx >= 0 ? values[typeIdx] : "",
      wbsDescription: descIdx >= 0 ? cleanCsvCell(values[descIdx] ?? "") : "",
      budget: budgetParsed.value,
      line,
    });
  }

  const inferred = inferWbsTypes(draft);
  const inferredByCode = new Map(inferred.map((r) => [r.wbsCode, r.wbsType]));

  const data: WbsImportRow[] = [];
  for (const row of draft) {
    const wbsType = inferredByCode.get(row.wbsCode);
    if (!wbsType) {
      errors.push(`Line ${row.line}: Could not determine type for ${row.wbsCode}`);
      continue;
    }
    // If user supplied an invalid non-empty type, flag it
    if (row.wbsType && cleanCsvCell(row.wbsType) && !normalizeWbsType(row.wbsType)) {
      errors.push(
        `Line ${row.line}: Invalid wbsType '${row.wbsType}' — use SUMMARY, WBS, WorkPackage, or leave blank to auto-detect leaves as WorkPackage`
      );
      continue;
    }
    data.push({
      wbsCode: row.wbsCode,
      wbsName: row.wbsName,
      wbsType,
      wbsDescription: row.wbsDescription,
      budget: row.budget,
      amount: row.budget,
    });
  }

  if (data.length > 0) {
    errors.push(...validateWbsCsvHierarchy(data));
  }

  return { data, errors };
}

export function parseWbsCsvText(text: string): { data: WbsImportRow[]; errors: string[] } {
  try {
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      return { data: [], errors: ["File is empty or contains no valid data"] };
    }
    const delimiter = detectWbsDelimiter(lines[0]);
    const headers = parseCsvRowLine(lines[0], delimiter);
    const matrix = lines.slice(1).map((line) => parseCsvRowLine(line, delimiter));
    return rowsFromHeaderAndMatrix(headers, matrix);
  } catch (error) {
    return {
      data: [],
      errors: [error instanceof Error ? error.message : "Unknown error parsing CSV"],
    };
  }
}

export async function parseWbsCsvFile(file: File): Promise<{ data: WbsImportRow[]; errors: string[] }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return parseWbsSpreadsheetFile(file);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = (event.target?.result as string) || "";
        resolve(parseWbsCsvText(text));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

export async function parseWbsSpreadsheetFile(file: File): Promise<{ data: WbsImportRow[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          resolve({ data: [], errors: ["Failed to read spreadsheet"] });
          return;
        }
        const wb = XLSX.read(data, { type: "array" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) {
          resolve({ data: [], errors: ["Spreadsheet has no sheets"] });
          return;
        }
        const ws = wb.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(ws, {
          header: 1,
          defval: "",
          raw: false,
        }) as (string | number | null | undefined)[][];
        if (!matrix.length) {
          resolve({ data: [], errors: ["Spreadsheet is empty"] });
          return;
        }
        const headers = (matrix[0] ?? []).map((c) => String(c ?? ""));
        const body = matrix.slice(1).map((row) => (row ?? []).map((c) => String(c ?? "")));
        resolve(rowsFromHeaderAndMatrix(headers, body));
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Failed to parse spreadsheet"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read spreadsheet"));
    reader.readAsArrayBuffer(file);
  });
}

/** Cross-row hierarchy checks (mirrors backend import + wbs-validation). */
export function validateWbsCsvHierarchy(rows: { wbsCode: string; wbsType: string }[]): string[] {
  const errors: string[] = [];
  const rowsByCode = new Map(rows.map((r) => [r.wbsCode, r]));
  const childrenByParent = new Map<string, typeof rows>();

  for (const row of rows) {
    const parts = row.wbsCode.split(".").map((p) => p.trim());
    if (parts.some((p) => !/^\d+$/.test(p))) {
      errors.push(`Row ${row.wbsCode}: wbsCode segments must be numeric`);
      continue;
    }
    const level = parts.length;
    const csvType = row.wbsType;

    if (level === 1 && csvType !== "SUMMARY") {
      errors.push(`Row ${row.wbsCode}: Level 1 must be SUMMARY`);
    }
    if (level > 1 && csvType === "SUMMARY") {
      errors.push(`Row ${row.wbsCode}: SUMMARY is only allowed at level 1`);
    }
    if (csvType === "WBS" && level > MAX_WBS_LEVEL) {
      errors.push(`Row ${row.wbsCode}: WBS exceeds maximum depth of ${MAX_WBS_LEVEL}`);
    }
    if (csvType === "WorkPackage" && level < 3) {
      errors.push(`Row ${row.wbsCode}: WorkPackage must be at depth 3 or deeper (e.g. 1.1.1)`);
    }

    if (level > 1) {
      const parentCode = parts.slice(0, -1).join(".");
      if (!rowsByCode.has(parentCode)) {
        errors.push(`Row ${row.wbsCode}: Parent '${parentCode}' not found in file`);
      }
      const list = childrenByParent.get(parentCode) ?? [];
      list.push(row);
      childrenByParent.set(parentCode, list);
    }
  }

  Array.from(childrenByParent.entries()).forEach(([parentCode, children]) => {
    const types = new Set(children.map((c: { wbsType: string }) => c.wbsType));
    if (types.has("WBS") && types.has("WorkPackage")) {
      errors.push(`Parent ${parentCode}: Cannot mix WBS and WorkPackage children`);
    }
    const parent = rowsByCode.get(parentCode);
    if (parent?.wbsType === "SUMMARY" && types.has("WorkPackage")) {
      errors.push(`Parent ${parentCode}: SUMMARY cannot have WorkPackage children directly`);
    }
  });

  for (const row of rows) {
    if (row.wbsType !== "WBS") continue;
    const children = childrenByParent.get(row.wbsCode) ?? [];
    if (children.length === 0) {
      errors.push(`Row ${row.wbsCode}: WBS must have child rows (or mark leaf as WorkPackage)`);
    }
  }

  return errors;
}

/** Template rows shared by CSV and XLSX downloads. */
export function getWbsTemplateRows(): Record<string, string | number>[] {
  return [
    { wbsCode: "1", wbsName: "Sample Project", wbsType: "SUMMARY", wbsDescription: "Project root", budget: 120000 },
    { wbsCode: "1.1", wbsName: "Engineering", wbsType: "WBS", wbsDescription: "Engineering branch", budget: 60000 },
    { wbsCode: "1.1.1", wbsName: "Design", wbsType: "WBS", wbsDescription: "Design sub-branch", budget: 35000 },
    { wbsCode: "1.1.1.1", wbsName: "Detailed Design", wbsType: "WBS", wbsDescription: "Deep structural WBS", budget: 22000 },
    { wbsCode: "1.1.1.1.1", wbsName: "Mechanical Design", wbsType: "WBS", wbsDescription: "Deepest WBS before work packages", budget: 12000 },
    { wbsCode: "1.1.1.1.1.1", wbsName: "Piping Drawings", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 4000 },
    { wbsCode: "1.1.1.1.1.2", wbsName: "Equipment Layout", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 4000 },
    { wbsCode: "1.1.1.1.1.3", wbsName: "Stress Analysis", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 4000 },
    { wbsCode: "1.1.1.1.2", wbsName: "Electrical Design", wbsType: "WBS", wbsDescription: "Sibling branch ends in work packages", budget: 10000 },
    { wbsCode: "1.1.1.1.2.1", wbsName: "Single Line Diagrams", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 3500 },
    { wbsCode: "1.1.1.1.2.2", wbsName: "Cable Schedules", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 3500 },
    { wbsCode: "1.1.1.1.2.3", wbsName: "Load Studies", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 3000 },
    { wbsCode: "1.1.2", wbsName: "Procurement", wbsType: "WBS", wbsDescription: "Shorter branch", budget: 15000 },
    { wbsCode: "1.1.2.1", wbsName: "Long Lead Items", wbsType: "WorkPackage", wbsDescription: "Direct work packages under WBS", budget: 5000 },
    { wbsCode: "1.1.2.2", wbsName: "Standard Items", wbsType: "WorkPackage", wbsDescription: "Direct work packages under WBS", budget: 5000 },
    { wbsCode: "1.1.2.3", wbsName: "Spare Parts", wbsType: "WorkPackage", wbsDescription: "Direct work packages under WBS", budget: 5000 },
    { wbsCode: "1.2", wbsName: "Construction", wbsType: "WBS", wbsDescription: "Construction branch", budget: 40000 },
    { wbsCode: "1.2.1", wbsName: "Civil Works", wbsType: "WBS", wbsDescription: "Civil sub-branch", budget: 25000 },
    { wbsCode: "1.2.1.1", wbsName: "Foundation", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 9000 },
    { wbsCode: "1.2.1.2", wbsName: "Structure", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 8000 },
    { wbsCode: "1.2.1.3", wbsName: "Finishing", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 8000 },
    { wbsCode: "1.2.2", wbsName: "Mechanical Install", wbsType: "WBS", wbsDescription: "Mechanical install branch", budget: 15000 },
    { wbsCode: "1.2.2.1", wbsName: "Equipment Setting", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 7500 },
    { wbsCode: "1.2.2.2", wbsName: "Piping Install", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 7500 },
    { wbsCode: "1.3", wbsName: "Commissioning", wbsType: "WBS", wbsDescription: "Shallow branch", budget: 20000 },
    { wbsCode: "1.3.1", wbsName: "Cold Commissioning", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 7000 },
    { wbsCode: "1.3.2", wbsName: "Hot Commissioning", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 7000 },
    { wbsCode: "1.3.3", wbsName: "Handover", wbsType: "WorkPackage", wbsDescription: "Leaf work package", budget: 6000 },
  ];
}

/** Template: SUMMARY root → nested WBS → WorkPackage leaves. */
export function generateWbsCsvTemplate(): string {
  const rows = getWbsTemplateRows();
  const header = "wbsCode,wbsName,wbsType,wbsDescription,budget";
  const lines = rows.map((r) =>
    [r.wbsCode, r.wbsName, r.wbsType, `"${String(r.wbsDescription).replace(/"/g, '""')}"`, r.budget].join(",")
  );
  return [header, ...lines].join("\n");
}

export function downloadWbsCsvTemplate(): void {
  const csvContent = generateWbsCsvTemplate();
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "WBS_upload_template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadWbsXlsxTemplate(): void {
  const rows = getWbsTemplateRows();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "WBS");
  // Instructions sheet for P6 / ERP exports
  const help = XLSX.utils.aoa_to_sheet([
    ["WBS Import Template"],
    [""],
    ["Required columns"],
    ["wbsCode", "Hierarchical code using dots (1, 1.1, 1.1.1). Required."],
    ["wbsName", "Display name. Required."],
    [""],
    ["Optional columns"],
    ["wbsType", "SUMMARY | WBS | WorkPackage. Leave blank to auto-detect: leaves become WorkPackage."],
    ["wbsDescription", "Free text description."],
    ["budget", "Number >= 0. Optional (defaults to 0). Can finalize structure before budgeting."],
    [""],
    ["Rules"],
    ["1", "Level 1 must be SUMMARY (project root)."],
    ["2", "WBS nodes are structural; every branch must end in WorkPackage leaves."],
    ["3", "Do not mix WBS and WorkPackage under the same parent."],
    ["4", "WorkPackage minimum depth is 3 (e.g. 1.1.1)."],
    ["5", "Compatible with exports from Primavera P6 / ERP after mapping Code & Name columns."],
    ["6", "Import is blocked after WBS is finalized — create a project amendment to revise."],
  ]);
  XLSX.utils.book_append_sheet(wb, help, "Instructions");
  XLSX.writeFile(wb, "WBS_upload_template.xlsx");
}

