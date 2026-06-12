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

// --- WBS upload: SUMMARY (root), WBS (2nd/3rd level), WorkPackage (leaves) ---
const WBS_TYPES = ["SUMMARY", "WBS", "WorkPackage"] as const;

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

/** Template: Project -> SUMMARY (root) -> WBS (2nd) -> WBS (3rd) -> WorkPackage. Budgets are preliminary until Edit Allocation (version 0). */
export function generateWbsCsvTemplate(): string {
  return [
    "wbsCode,wbsName,wbsType,wbsDescription,budget",
    "1,Engineering & Design,SUMMARY,Top-level phase,50000",
    "1.1,Design,WBS,Design sub-phase,20000",
    "1.1.1,Detailed Design,WBS,Detailed design only WBS,15000",
    "1.1.1.1,Drawings,WorkPackage,Preliminary budget,8000",
    "1.1.1.2,Specifications,WorkPackage,Preliminary budget,7000",
    "1.2,Procurement,WBS,Procurement sub-phase,30000",
    "1.2.1,Equipment,WBS,Equipment only WBS,30000",
    "1.2.1.1,Boilers,WorkPackage,Preliminary budget,12000",
    "1.2.1.2,Pumps,WorkPackage,Preliminary budget,18000",
    "2,Construction,SUMMARY,Construction phase,40000",
    "2.1,Civil Works,WBS,Civil only WBS,40000",
    "2.1.1,Foundation,WorkPackage,Preliminary budget,25000",
    "2.1.2,Structure,WorkPackage,Preliminary budget,15000",
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

