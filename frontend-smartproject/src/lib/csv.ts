import { z } from "zod";
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

/** Strip BOM, zero-width chars, normalize unicode (Excel often emits odd spaces). */
function cleanCsvCell(raw: string): string {
  let s = raw
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
 * Naive split(",") breaks when wbsDescription contains commas and shifts wbsType.
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

/** Accept common spreadsheet variants (case, camelCase, spaces). */
function normalizeWbsType(raw: string): (typeof WBS_TYPES)[number] | null {
  const s = cleanCsvCell(raw || "");
  const compact = s.replace(/\s+/g, "");
  if (WBS_TYPES.includes(compact as (typeof WBS_TYPES)[number])) {
    return compact as (typeof WBS_TYPES)[number];
  }
  const key = s.toLowerCase().replace(/[\s_-]+/g, "");
  if (key === "summary") return "SUMMARY";
  if (key === "wbs") return "WBS";
  if (key === "workpackage") return "WorkPackage";
  return null;
}

export function parseWbsCsvText(text: string): { data: any[]; errors: string[] } {
  try {
    const cleanText = text.replace(/^\uFEFF/, "");
    const lines = cleanText.split(/\r?\n/).filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      return { data: [], errors: ["CSV file is empty or contains no valid data"] };
    }
    const delimiter = detectWbsDelimiter(lines[0]);
    const headers = parseCsvRowLine(lines[0], delimiter).map((h) => cleanCsvCell(h));
    const requiredColumns = ["wbsCode", "wbsName", "wbsType"];
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col));
    if (missingColumns.length > 0) {
      return {
        data: [],
        errors: [`Missing required columns: ${missingColumns.join(", ")}. Use: wbsCode, wbsName, wbsType, wbsDescription, budget`],
      };
    }
    const budgetCol = headers.includes("budget") ? "budget" : "amount";
    const data: any[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseCsvRowLine(line, delimiter);
      if (values.length !== headers.length) {
        errors.push(`Line ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      if (!row.wbsCode) {
        errors.push(`Line ${i + 1}: Missing WBS code`);
        continue;
      }
      if (!row.wbsName) {
        errors.push(`Line ${i + 1}: Missing WBS name`);
        continue;
      }
      const normalizedType = normalizeWbsType(row.wbsType ?? "");
      if (!normalizedType) {
        errors.push(`Line ${i + 1}: Invalid wbsType - must be SUMMARY, WBS, or WorkPackage`);
        continue;
      }
      row.wbsType = normalizedType;
      const budgetVal = row[budgetCol] ?? row.amount ?? row.budget ?? "";
      if (row.wbsType === "SUMMARY" || row.wbsType === "WBS" || row.wbsType === "WorkPackage") {
        if (!budgetVal || isNaN(Number(budgetVal)) || Number(budgetVal) < 0) {
          errors.push(`Line ${i + 1}: ${row.wbsType} must have a valid budget (number >= 0)`);
          continue;
        }
      }
      data.push({
        ...row,
        amount: budgetVal,
        wbsDescription: row.wbsDescription ?? "",
      });
    }

    if (data.length > 0) {
      const hierarchyErrors = validateWbsCsvHierarchy(data);
      errors.push(...hierarchyErrors);
    }

    return { data, errors };
  } catch (error) {
    return {
      data: [],
      errors: [error instanceof Error ? error.message : "Unknown error parsing CSV"],
    };
  }
}

export async function parseWbsCsvFile(file: File): Promise<{ data: any[]; errors: string[] }> {
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

  for (const [parentCode, children] of childrenByParent) {
    const types = new Set(children.map((c) => c.wbsType));
    if (types.has("WBS") && types.has("WorkPackage")) {
      errors.push(`Parent ${parentCode}: Cannot mix WBS and WorkPackage children`);
    }
    const parent = rowsByCode.get(parentCode);
    if (parent?.wbsType === "SUMMARY" && types.has("WorkPackage")) {
      errors.push(`Parent ${parentCode}: SUMMARY cannot have WorkPackage children directly`);
    }
  }

  for (const row of rows) {
    if (row.wbsType !== "WBS") continue;
    const children = childrenByParent.get(row.wbsCode) ?? [];
    const hasWbsChild = children.some((c) => c.wbsType === "WBS");
    const hasWpChild = children.some((c) => c.wbsType === "WorkPackage");
    if (children.length === 0) {
      errors.push(`Row ${row.wbsCode}: WBS must have child rows`);
    }
  }

  return errors;
}

/** Template: SUMMARY root → nested WBS (up to 6+ levels) → WorkPackage leaves. */
export function generateWbsCsvTemplate(): string {
  return [
    "wbsCode,wbsName,wbsType,wbsDescription,budget",
    "1,Sample Project,SUMMARY,Project root,120000",
    "1.1,Engineering,WBS,Engineering branch,60000",
    "1.1.1,Design,WBS,Design sub-branch,35000",
    "1.1.1.1,Detailed Design,WBS,Deep structural WBS,22000",
    "1.1.1.1.1,Mechanical Design,WBS,Deepest WBS before work packages,12000",
    "1.1.1.1.1.1,Piping Drawings,WorkPackage,Leaf work package,4000",
    "1.1.1.1.1.2,Equipment Layout,WorkPackage,Leaf work package,4000",
    "1.1.1.1.1.3,Stress Analysis,WorkPackage,Leaf work package,4000",
    "1.1.1.1.2,Electrical Design,WBS,Sibling branch ends in work packages,10000",
    "1.1.1.1.2.1,Single Line Diagrams,WorkPackage,Leaf work package,3500",
    "1.1.1.1.2.2,Cable Schedules,WorkPackage,Leaf work package,3500",
    "1.1.1.1.2.3,Load Studies,WorkPackage,Leaf work package,3000",
    "1.1.2,Procurement,WBS,Shorter branch,15000",
    "1.1.2.1,Long Lead Items,WorkPackage,Direct work packages under WBS,5000",
    "1.1.2.2,Standard Items,WorkPackage,Direct work packages under WBS,5000",
    "1.1.2.3,Spare Parts,WorkPackage,Direct work packages under WBS,5000",
    "1.2,Construction,WBS,Construction branch,40000",
    "1.2.1,Civil Works,WBS,Civil sub-branch,25000",
    "1.2.1.1,Foundation,WorkPackage,Leaf work package,9000",
    "1.2.1.2,Structure,WorkPackage,Leaf work package,8000",
    "1.2.1.3,Finishing,WorkPackage,Leaf work package,8000",
    "1.2.2,Mechanical Install,WBS,Mechanical install branch,15000",
    "1.2.2.1,Equipment Setting,WorkPackage,Leaf work package,7500",
    "1.2.2.2,Piping Install,WorkPackage,Leaf work package,7500",
    "1.3,Commissioning,WBS,Shallow branch,20000",
    "1.3.1,Cold Commissioning,WorkPackage,Leaf work package,7000",
    "1.3.2,Hot Commissioning,WorkPackage,Leaf work package,7000",
    "1.3.3,Handover,WorkPackage,Leaf work package,6000",
  ].join("\n");
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

