import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  COMMON_CURRENCY_CODES,
  CurrencyCode,
  getCurrencyLabel,
  resolveCurrencyCode,
} from "@/lib/currencies";

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Portfolio } from "@/lib/portfolios";
import { EmployeeOption, employeeOptionLabel } from "@/lib/employees";

// Form schema for the frontend
const formSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  budget: z.coerce.number().positive("Budget must be a positive number"),
  currency: z.enum(COMMON_CURRENCY_CODES),
  portfolioId: z.string().optional(),
  status: z.enum(["concept", "planning", "active", "in progress", "aborted", "on-hold", "completed"]).optional(),
  startDate: z.date(),
  endDate: z.date(),
  projectVersion: z.enum(["estimation", "planning", "execution"]).default("execution"),
  mappedEstimationProjectId: z.number().optional().nullable(),
  mappedPlanningProjectId: z.number().optional().nullable(),
  projectManagerId: z.string().optional(),
  projectPlannerId: z.string().optional(),
});

type ProjectFormData = z.infer<typeof formSchema>;

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: number) => void;
}

async function fetchGlobalDefaults(): Promise<{ defaultCurrencyCode: string }> {
  const res = await fetch("/api/global-defaults");
  if (!res.ok) throw new Error("Failed to load global defaults");
  return res.json();
}

export function AddProjectModal({ isOpen, onClose, onSuccess }: AddProjectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [review, setReview] = useState<ProjectFormData | null>(null);
  const prevOpenRef = useRef(false);
  const globalDefaultCurrencyRef = useRef<CurrencyCode>("USD");

  const { data: globalDefaults } = useQuery({
    queryKey: ["/api/global-defaults"],
    queryFn: fetchGlobalDefaults,
    staleTime: 60_000,
  });

  const globalDefaultCurrency = resolveCurrencyCode(globalDefaults?.defaultCurrencyCode);
  globalDefaultCurrencyRef.current = globalDefaultCurrency;

  const { data: allProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    enabled: isOpen,
  });

  const { data: portfolios = [] } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolios"],
    enabled: isOpen,
  });

  const { data: employees = [] } = useQuery<EmployeeOption[]>({
    queryKey: ["/api/employee-masters"],
    enabled: isOpen,
  });

  const buildDefaultValues = (currency: CurrencyCode): ProjectFormData => ({
    name: "",
    description: "",
    budget: 0,
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
    currency,
    portfolioId: "",
    status: "concept",
    projectVersion: "execution",
    mappedEstimationProjectId: null,
    mappedPlanningProjectId: null,
    projectManagerId: "",
    projectPlannerId: "",
  });

  // Form definition with frontend schema
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: buildDefaultValues("USD"),
  });

  useEffect(() => {
    const justOpened = isOpen && !prevOpenRef.current;
    prevOpenRef.current = isOpen;
    if (!justOpened) return;
    setReview(null);
    form.reset(buildDefaultValues(globalDefaultCurrencyRef.current));
  }, [isOpen, form]);

  useEffect(() => {
    if (!isOpen || !globalDefaults) return;
    const resolved = resolveCurrencyCode(globalDefaults.defaultCurrencyCode);
    globalDefaultCurrencyRef.current = resolved;
    if (form.getValues("currency") === resolved) return;
    const current = form.getValues("currency");
    if (current === "USD" && resolved !== "USD") {
      form.setValue("currency", resolved);
    }
  }, [isOpen, globalDefaults, form]);

  // Get form values
  const { startDate, endDate } = form.watch();
  const selectedVersion = form.watch("projectVersion") || "execution";

  // Update dates and duration when one changes
  const updateEndDate = (newStartDate: Date) => {
    const currentEndDate = form.getValues("endDate");
    if (currentEndDate && newStartDate > currentEndDate) {
      // If new start date is after current end date, set end date to start date + 1 month
      const newEndDate = new Date(newStartDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);
      form.setValue("endDate", newEndDate);
    }
  };

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      // Transform form data to match backend schema
      const portfolio = portfolios.find((item) => String(item.id) === data.portfolioId);
      const apiData = {
        name: data.name,
        description: data.description || null,
        budget: data.budget,
        currency: data.currency,
        portfolioId: portfolio?.id ?? null,
        projectType: portfolio?.name ?? null,
        status: data.status || null,
        startDate: data.startDate.toISOString().split('T')[0],
        endDate: data.endDate.toISOString().split('T')[0],
        projectVersion: data.projectVersion || "execution",
        mappedEstimationProjectId: data.projectVersion === "estimation" ? null : (data.mappedEstimationProjectId || null),
        mappedPlanningProjectId: data.projectVersion === "execution" ? (data.mappedPlanningProjectId || null) : null,
        projectManagerId: data.projectManagerId ? Number(data.projectManagerId) : null,
        projectPlannerId: data.projectPlannerId ? Number(data.projectPlannerId) : null,
      };
      const response = await apiRequest("POST", "/api/projects", apiData);
      return response.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Created",
        description: "The project has been created successfully.",
        variant: "default",
      });
      form.reset(buildDefaultValues(globalDefaultCurrencyRef.current));
      onClose();
      if (created?.id != null) onSuccess?.(created.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: ProjectFormData) => {
    setReview(data);
  };

  const personLabel = (id?: string) => {
    if (!id) return "None";
    const match = employees.find((employee) => String(employee.id) === id);
    return match ? employeeOptionLabel(match) : "None";
  };
  const projectLabel = (id?: number | null) => {
    if (!id) return "None";
    return allProjects.find((project) => project.id === id)?.name || `Project #${id}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{review ? "Confirm new project" : "Add New Project"}</DialogTitle>
          <DialogDescription>
            {review
              ? "Check these details. Edit anything that needs a change, then save."
              : "Create a new construction project to track and manage."}
          </DialogDescription>
        </DialogHeader>

        {review ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              {(
                [
                  ["Name", review.name],
                  ["Portfolio", portfolios.find((item) => String(item.id) === review.portfolioId)?.name || "None"],
                  ["Stage", review.status || "concept"],
                  ["Version", review.projectVersion || "execution"],
                  ["Budget", `${review.currency} ${Number(review.budget).toLocaleString()}`],
                  ["Start", review.startDate.toLocaleDateString()],
                  ["End", review.endDate.toLocaleDateString()],
                  ["Manager", personLabel(review.projectManagerId)],
                  ["Planner", personLabel(review.projectPlannerId)],
                  ["Estimation link", projectLabel(review.mappedEstimationProjectId)],
                  ["Planning link", projectLabel(review.mappedPlanningProjectId)],
                  ["Description", review.description?.trim() || "None"],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReview(null)}>
                Edit
              </Button>
              <Button type="button" disabled={createProject.isPending} onClick={() => createProject.mutate(review)}>
                {createProject.isPending ? "Saving…" : "Save project"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter project name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="budget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Budget</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        value={field.value}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const globalDefault = globalDefaultCurrencyRef.current;
                        if (value !== globalDefault) {
                          toast({
                            title: "Currency differs from global default",
                            description: `System default is ${globalDefault}. Change project currency only when required by contract or business need. Once set, currency cannot be changed after WBS items are added.`,
                          });
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_CURRENCY_CODES.map((code) => (
                          <SelectItem key={code} value={code}>
                            {getCurrencyLabel(code)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Pre-filled from global default ({globalDefaultCurrency}).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="portfolioId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Portfolio</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select portfolio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {portfolios.length === 0 ? (
                          <SelectItem value="__none" disabled>No portfolios yet</SelectItem>
                        ) : (
                          portfolios.map((portfolio) => (
                            <SelectItem key={portfolio.id} value={String(portfolio.id)}>
                              {portfolio.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Sector this project belongs to. Manage the list from Portfolios.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="concept">Concept</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="in progress">In Progress</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                        <SelectItem value="aborted">Aborted</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Stage can be changed later. It will follow project progress automatically in a later update.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="projectVersion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Version</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      if (val === "estimation") {
                        form.setValue("mappedEstimationProjectId", null);
                        form.setValue("mappedPlanningProjectId", null);
                      } else if (val === "planning") {
                        form.setValue("mappedPlanningProjectId", null);
                      }
                    }}
                    value={field.value || "execution"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project version" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="estimation">Estimation</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="execution">Execution</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select Estimation, Planning, or Execution (default).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectManagerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Manager</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project manager" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={String(employee.id)}>
                            {employeeOptionLabel(employee)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectPlannerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Planner</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project planner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={String(employee.id)}>
                            {employeeOptionLabel(employee)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(selectedVersion === "planning" || selectedVersion === "execution") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-md border border-slate-200 bg-slate-50/50 p-3">
                <FormField
                  control={form.control}
                  name="mappedEstimationProjectId"
                  render={({ field }) => {
                    const estimationProjects = allProjects.filter(
                      (p) => (p as any).projectVersion === "estimation"
                    );
                    return (
                      <FormItem>
                        <FormLabel className="text-xs">Mapped Estimation Project (Optional)</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))}
                          value={field.value ? String(field.value) : "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select estimation project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {estimationProjects.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {selectedVersion === "execution" && (
                <FormField
                  control={form.control}
                  name="mappedPlanningProjectId"
                  render={({ field }) => {
                    const planningProjects = allProjects.filter(
                      (p) => (p as any).projectVersion === "planning"
                    );
                    return (
                      <FormItem>
                        <FormLabel className="text-xs">Mapped Planning Project (Optional)</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))}
                          value={field.value ? String(field.value) : "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select planning project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {planningProjects.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={(date) => {
                          if (date) {
                            field.onChange(date);
                            updateEndDate(date);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        date={field.value}
                        setDate={(date) => {
                          if (date) {
                            field.onChange(date);
                          }
                        }}
                        disabledDates={(date) => {
                          const startDate = form.getValues("startDate");
                          return startDate ? date < startDate : false;
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional project description"
                      rows={3}
                      value={field.value || ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createProject.isPending}
              >
                {createProject.isPending && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Review project
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
