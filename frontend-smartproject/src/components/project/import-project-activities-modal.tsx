import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FileUp, FileX, Download, AlertTriangle } from "lucide-react";

interface WorkPackage {
  id: number;
  projectId: number;
  wbsItemId: number;
  code: string;
  name: string;
  description: string | null;
}

interface ImportProjectActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
}

const formSchema = z.object({
  csvFile: z
    .instanceof(FileList)
    .refine((files) => files.length === 1, "Please select a CSV file"),
});

type FormValues = z.infer<typeof formSchema>;

type ParsedRow = {
  workPackageCode: string;
  name: string;
  description?: string;
  unitOfMeasure: string;
  unitRate: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  quantity?: string;
};

const normalizeHeader = (header: string): string => {
  const key = header.trim().toLowerCase().replace(/[\s_-]/g, "");
  switch (key) {
    case "workpackagecode":
    case "workpackage":
    case "workpackagecode1":
      return "workPackageCode";
    case "name":
    case "activityname":
      return "name";
    case "description":
      return "description";
    case "unitofmeasure":
    case "uom":
    case "unit":
      return "unitOfMeasure";
    case "unitrate":
    case "rate":
      return "unitRate";
    case "duration":
    case "durationdays":
      return "duration";
    case "startdate":
    case "start":
    case "start_date":
      return "startDate";
    case "enddate":
    case "end":
    case "end_date":
      return "endDate";
    case "quantity":
    case "qty":
      return "quantity";
    default:
      return header.trim();
  }
};

const parseProjectActivityCsvFile = async (
  file: File,
): Promise<{ data: ParsedRow[]; errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") {
        return reject(new Error("Failed to read file as text"));
      }

      try {
        const cleanText = text.replace(/^\uFEFF/, "");
        const lines = cleanText.split(/\r?\n/).filter((line) => line.trim() !== "");

        if (lines.length === 0) {
          return resolve({
            data: [],
            errors: ["CSV file is empty or contains no valid data"],
          });
        }

        const rawHeaders = lines[0].split(",").map((h) => h.trim());
        const headerMap = rawHeaders.map((h) => normalizeHeader(h));

        const requiredColumns = ["workPackageCode", "name", "unitOfMeasure", "unitRate"];
        const missingColumns = requiredColumns.filter(
          (col) => !headerMap.includes(col),
        );

        if (missingColumns.length > 0) {
          return resolve({
            data: [],
            errors: [
              `Missing required columns: ${missingColumns.join(
                ", ",
              )}. Make sure you're using the project activities CSV template.`,
            ],
          });
        }

        const data: ParsedRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(",").map((v) => v.trim());
          const row: any = {};

          headerMap.forEach((canonical, index) => {
            row[canonical] = values[index] ?? "";
          });

          data.push({
            workPackageCode: row.workPackageCode || "",
            name: row.name || "",
            description: row.description || "",
            unitOfMeasure: row.unitOfMeasure || "",
            unitRate: row.unitRate || "",
            duration: row.duration || "",
            startDate: row.startDate || "",
            endDate: row.endDate || "",
            quantity: row.quantity || "",
          });
        }

        resolve({ data, errors: [] });
      } catch (error) {
        reject(
          error instanceof Error ? error : new Error("Unknown error parsing CSV file"),
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsText(file);
  });
};

const downloadTemplate = () => {
  const csvContent = [
    "workPackageCode,name,description,unitOfMeasure,unitRate,duration,startDate,endDate,quantity",
    '1.1.1,Excavation,Excavation works,M3,10.5,5,2025-01-01,2025-01-05,100',
    '1.1.2,Concrete,Concrete works,M3,75,10,2025-01-06,2025-01-15,200',
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "project_activities_import_template.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function ImportProjectActivitiesModal({
  isOpen,
  onClose,
  projectId,
}: ImportProjectActivitiesModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isParsingComplete, setIsParsingComplete] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      csvFile: undefined,
    },
  });

  const { data: workPackages = [] } = useQuery<WorkPackage[]>({
    queryKey: [`/api/projects/${projectId}/work-packages`],
    enabled: isOpen,
  });

  const workPackageByCode = new Map(
    workPackages.map((wp) => [wp.code, wp]),
  );

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setRows([]);
      setParseErrors([]);
      setIsParsingComplete(false);

      const { data, errors } = await parseProjectActivityCsvFile(file);

      const validationErrors: string[] = [];

      data.forEach((row, index) => {
        if (!row.workPackageCode) {
          validationErrors.push(
            `Row ${index + 1}: Missing required field 'workPackageCode'`,
          );
        } else if (!workPackageByCode.get(row.workPackageCode)) {
          validationErrors.push(
            `Row ${index + 1}: Work Package '${row.workPackageCode}' not found in this project`,
          );
        }

        if (!row.name) {
          validationErrors.push(`Row ${index + 1}: Missing required field 'name'`);
        }

        if (!row.unitOfMeasure) {
          validationErrors.push(
            `Row ${index + 1}: Missing required field 'unitOfMeasure'`,
          );
        }

        if (!row.unitRate) {
          validationErrors.push(`Row ${index + 1}: Missing required field 'unitRate'`);
        }

        const hasDuration = row.duration && row.duration.trim() !== "";
        const hasDates =
          row.startDate &&
          row.startDate.trim() !== "" &&
          row.endDate &&
          row.endDate.trim() !== "";

        if (!hasDuration && !hasDates) {
          validationErrors.push(
            `Row ${index + 1}: Either duration or both startDate and endDate must be provided`,
          );
        }
      });

      setRows(data);
      setParseErrors([...errors, ...validationErrors]);
      setIsParsingComplete(true);

      if (errors.length > 0 || validationErrors.length > 0) {
        toast({
          title: "CSV Validation Errors",
          description: `${errors.length + validationErrors.length} issues found in the CSV file.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error Parsing CSV",
        description:
          error instanceof Error ? error.message : "Failed to parse CSV file",
        variant: "destructive",
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/projects/${projectId}/activities/import-csv`,
        {
          csvData: rows,
        },
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["wp-activities"] });
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });

      toast({
        title: "Import Successful",
        description:
          data?.createdCount !== undefined
            ? `${data.createdCount} activities have been imported.`
            : "Activities have been imported successfully.",
      });

      handleClose();
    },
    onError: (error: any) => {
      let message =
        "Failed to import activities. Please check your CSV file and try again.";
      if (error instanceof Error) {
        message = error.message;
      }

      toast({
        title: "Import Failed",
        description: message,
        variant: "destructive",
      });

      if (error?.errors && Array.isArray(error.errors)) {
        setParseErrors(error.errors);
        setIsParsingComplete(true);
      }
    },
  });

  const onSubmit = () => {
    if (rows.length === 0) {
      toast({
        title: "No Data",
        description: "No valid data to import. Please check your CSV file.",
        variant: "destructive",
      });
      return;
    }

    if (parseErrors.length > 0) {
      toast({
        title: "Validation Errors",
        description: "Please fix errors in your CSV file before importing.",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate();
  };

  const handleClose = () => {
    form.reset();
    setRows([]);
    setParseErrors([]);
    setIsParsingComplete(false);
    onClose();
  };

  const hasUnresolvedWorkPackages = rows.some(
    (row) => !workPackageByCode.get(row.workPackageCode),
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Project Activities from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing activities for this project. Each row must
            reference a Work Package by its code.
          </DialogDescription>
        </DialogHeader>

        <Alert className="mb-4 border-blue-300 bg-blue-50">
          <AlertDescription>
            <p className="mb-1 font-semibold">CSV Format:</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>
                <strong>Required columns:</strong> workPackageCode, name,
                unitOfMeasure, unitRate
              </li>
              <li>
                <strong>Schedule:</strong> provide either{" "}
                <span className="font-semibold">duration</span> (days) or both{" "}
                <span className="font-semibold">startDate</span> and{" "}
                <span className="font-semibold">endDate</span>.
              </li>
              <li>
                <strong>Optional:</strong> description, quantity
              </li>
              <li>
                Dates should be in <span className="font-mono">YYYY-MM-DD</span>{" "}
                format.
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex justify-between items-start gap-4">
              <FormField
                control={form.control}
                name="csvFile"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Upload CSV File</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            onChange(e.target.files);
                            handleFileChange(e.target.files);
                          }}
                          {...rest}
                        />
                        {value && value.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="ml-2"
                            onClick={() => {
                              onChange(undefined);
                              setRows([]);
                              setParseErrors([]);
                              setIsParsingComplete(false);
                            }}
                          >
                            <FileX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a CSV file with project activity details to create them
                      under the relevant work packages.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                className="mt-8"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <Alert className="mb-4 border-yellow-300 bg-yellow-50">
              <AlertDescription className="flex">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 flex-shrink-0" />
                <p className="text-sm">
                  <strong>Note:</strong> If a Work Package code in the CSV does not
                  exist in this project, that row will be skipped.
                </p>
              </AlertDescription>
            </Alert>

            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-semibold mb-1">
                    Errors found in CSV file:
                  </div>
                  <ul className="list-disc pl-5 text-sm space-y-1 max-h-[120px] overflow-y-auto">
                    {parseErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {isParsingComplete && rows.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Preview ({rows.length} items)
                </h4>
                <div className="border rounded-md overflow-hidden max-h-[320px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Work Package</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, index) => {
                        const wp = workPackageByCode.get(row.workPackageCode);
                        const hasDuration = row.duration && row.duration.trim() !== "";
                        const hasDates =
                          row.startDate &&
                          row.startDate.trim() !== "" &&
                          row.endDate &&
                          row.endDate.trim() !== "";
                        const isValid =
                          !!wp &&
                          !!row.name &&
                          !!row.unitOfMeasure &&
                          !!row.unitRate &&
                          (hasDuration || hasDates);

                        return (
                          <TableRow
                            key={index}
                            className={
                              !isValid
                                ? "bg-red-50"
                                : !wp
                                  ? "bg-yellow-50"
                                  : undefined
                            }
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {row.workPackageCode || "-"}
                                </span>
                                {wp && (
                                  <span className="text-xs text-muted-foreground">
                                    {wp.name}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{row.name || "-"}</TableCell>
                            <TableCell>{row.unitOfMeasure || "-"}</TableCell>
                            <TableCell>{row.unitRate || "-"}</TableCell>
                            <TableCell>{row.quantity || "1"}</TableCell>
                            <TableCell>{row.duration || "-"}</TableCell>
                            <TableCell>{row.startDate || "-"}</TableCell>
                            <TableCell>{row.endDate || "-"}</TableCell>
                            <TableCell>
                              {!isValid ? (
                                <Badge variant="destructive" className="text-xs">
                                  Invalid
                                </Badge>
                              ) : !wp ? (
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-100 text-yellow-800 text-xs border-yellow-200"
                                >
                                  WP not found
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-green-100 text-green-800 text-xs border-green-200"
                                >
                                  Ready
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  importMutation.isPending ||
                  rows.length === 0 ||
                  parseErrors.length > 0 ||
                  hasUnresolvedWorkPackages
                }
              >
                {importMutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Importing...
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import Activities
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

