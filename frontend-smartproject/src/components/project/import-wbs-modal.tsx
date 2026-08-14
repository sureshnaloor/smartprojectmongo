import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { WbsItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  parseWbsCsvFile,
  downloadWbsCsvTemplate,
  downloadWbsXlsxTemplate,
  type WbsImportRow,
} from "@/lib/csv";

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
import { FileUp, FileX, Download, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ImportWbsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
}

const formSchema = z.object({
  csvFile: z.instanceof(FileList).refine((files) => files.length === 1, "Please select a CSV or Excel file"),
});

type FormValues = z.infer<typeof formSchema>;

export function ImportWbsModal({ isOpen, onClose, projectId }: ImportWbsModalProps) {
  const [csvData, setCsvData] = useState<WbsImportRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isParsingComplete, setIsParsingComplete] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wbsItems = [] } = useQuery<WbsItem[]>({
    queryKey: [`/api/projects/${projectId}/wbs`],
    enabled: isOpen,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      csvFile: undefined,
    },
  });

  const handleFileChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    try {
      setCsvData([]);
      setParseErrors([]);
      setIsParsingComplete(false);

      const { data, errors } = await parseWbsCsvFile(file);

      setCsvData(data);
      setParseErrors(errors);
      setIsParsingComplete(true);

      if (errors.length > 0) {
        toast({
          title: "Validation errors",
          description: `${errors.length} issue(s) found in the file.`,
          variant: "destructive",
        });
      } else if (data.length > 0) {
        toast({
          title: "File ready",
          description: `${data.length} rows parsed. Review the preview, then import.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error parsing file",
        description: error instanceof Error ? error.message : "Failed to parse file",
        variant: "destructive",
      });
    }
  };

  const importWbsItems = useMutation({
    mutationFn: async (data: WbsImportRow[]) => {
      const response = await apiRequest("POST", "/api/wbs/import", {
        projectId,
        csvData: data,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const err = new Error(body.message || "Failed to import WBS") as Error & { errors?: string[] };
        err.errors = body.errors;
        throw err;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/wbs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/work-packages`] });
      toast({
        title: "Import successful",
        description: `${csvData.length} rows imported (WBS + work packages).`,
      });
      handleClose();
    },
    onError: (error: Error & { errors?: string[] }) => {
      let errorMessage = error.message || "Failed to import WBS items.";
      if (error.errors?.length) {
        errorMessage = `${error.errors.length} validation error(s). See details below.`;
        setParseErrors(error.errors);
        setIsParsingComplete(true);
      }
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = () => {
    if (csvData.length === 0) {
      toast({
        title: "No data",
        description: "No valid rows to import. Check your file.",
        variant: "destructive",
      });
      return;
    }
    if (parseErrors.length > 0) {
      toast({
        title: "Validation errors",
        description: "Fix errors in the file before importing.",
        variant: "destructive",
      });
      return;
    }
    importWbsItems.mutate(csvData);
  };

  const handleClose = () => {
    form.reset();
    setCsvData([]);
    setParseErrors([]);
    setIsParsingComplete(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import WBS structure</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel (.xlsx) file for large trees, or map exports from Primavera P6 / ERP
            systems. Every leaf must be a work package.
          </DialogDescription>
        </DialogHeader>

        <Alert className="mb-2">
          <AlertDescription>
            <p className="mb-1 font-semibold">Columns</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>
                <strong>Required:</strong> code (<code>wbsCode</code> / Code) and name (
                <code>wbsName</code> / Name)
              </li>
              <li>
                <strong>Optional:</strong> <code>wbsType</code>, <code>wbsDescription</code>,{" "}
                <code>budget</code> (defaults to 0 — structure can be imported before budgeting)
              </li>
              <li>
                If <code>wbsType</code> is blank, leaves are auto-detected as <strong>WorkPackage</strong>,
                level 1 as <strong>SUMMARY</strong>, and parents as <strong>WBS</strong>
              </li>
              <li>
                Dot codes: <code>1</code>, <code>1.1</code>, <code>1.1.1</code>… Same code updates an
                existing item
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <FormField
                control={form.control}
                name="csvFile"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem className="flex-1 min-w-[220px]">
                    <FormLabel>Upload CSV or Excel</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="file"
                          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
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
                              setCsvData([]);
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
                      Formats: .csv, .xlsx — download a template if you need the exact layout
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="mt-8">
                    <Download className="h-4 w-4 mr-2" />
                    Download template
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => downloadWbsCsvTemplate()}>
                    CSV template (.csv)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => downloadWbsXlsxTemplate()}>
                    Excel template (.xlsx)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Alert className="border-amber-300 bg-amber-50">
              <AlertDescription className="flex">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 flex-shrink-0" />
                <p className="text-sm">
                  <strong>Hierarchy:</strong> SUMMARY (root) → WBS → WorkPackage leaves. Do not mix WBS
                  and WorkPackage under the same parent. Import is blocked after WBS is finalized.
                </p>
              </AlertDescription>
            </Alert>

            {parseErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-semibold mb-1">Errors in file:</div>
                  <ul className="list-disc pl-5 text-sm space-y-1 max-h-[120px] overflow-y-auto">
                    {parseErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {isParsingComplete && csvData.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Preview ({csvData.length} rows)</h4>
                <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Budget</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.map((row, index) => {
                        const existingItem = wbsItems.find((item) => item.code === row.wbsCode);
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              {row.wbsCode}
                              {existingItem && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Exists
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{row.wbsName}</TableCell>
                            <TableCell>{row.wbsType}</TableCell>
                            <TableCell className="text-right font-mono">
                              {row.budget != null && row.budget !== ""
                                ? Number(row.budget).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })
                                : "0"}
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
                disabled={importWbsItems.isPending || csvData.length === 0 || parseErrors.length > 0}
              >
                {importWbsItems.isPending ? (
                  <>Importing…</>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import WBS
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
