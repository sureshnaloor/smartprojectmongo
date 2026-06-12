import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatHourlyRate } from "@/lib/resource-uom";
import { useMapSuccessAutoClose } from "@/hooks/use-map-success-auto-close";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, Link2, X } from "lucide-react";

interface Resource {
  id: number;
  name: string;
  description?: string;
  type: string;
  unitOfMeasure: string;
  unitRate: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

interface ToolResourceMapping {
  id: number;
  toolId: number;
  resourceId: number;
  createdAt: string;
  updatedAt: string;
}

interface ToolResourceMapperProps {
  toolId: number;
  toolName: string;
  onMappingChanged?: () => void;
}

async function getToolsResources(): Promise<Resource[]> {
  const response = await fetch("/api/resources/tools/all");
  if (!response.ok) throw new Error("Failed to fetch tools resources");
  return response.json();
}

async function getToolResourceMapping(
  toolId: number
): Promise<ToolResourceMapping | null> {
  const response = await fetch(`/api/tools/${toolId}/resource-mapping`);
  if (!response.ok) throw new Error("Failed to fetch resource mapping");
  return response.json();
}

async function mapResourceToTool(
  toolId: number,
  resourceId: number
): Promise<ToolResourceMapping> {
  const response = await fetch(`/api/tools/${toolId}/map-resource`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceId }),
  });
  if (!response.ok) throw new Error("Failed to map resource to tool");
  return response.json();
}

async function unmapResourceFromTool(toolId: number): Promise<void> {
  const response = await fetch(`/api/tools/${toolId}/resource-mapping`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error("Failed to unmap resource from tool");
}

export function ToolResourceMapper({
  toolId,
  toolName,
  onMappingChanged,
}: ToolResourceMapperProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<number | null>(null);
  const { mapSuccess, beginSuccessAndScheduleClose, handleDialogOpenChange } =
    useMapSuccessAutoClose();

  const {
    data: resources = [],
    isLoading: resourcesLoading,
    error: resourcesError,
  } = useQuery({
    queryKey: ["toolsResources"],
    queryFn: getToolsResources,
  });

  const {
    data: currentMapping,
    isLoading: mappingLoading,
    refetch: refetchMapping,
  } = useQuery({
    queryKey: ["toolResourceMapping", toolId],
    queryFn: () => getToolResourceMapping(toolId),
  });

  const isMapped = !!currentMapping;

  const mapResourceMutation = useMutation({
    mutationFn: (resourceId: number) =>
      mapResourceToTool(toolId, resourceId),
    onSuccess: () => {
      toast({ title: "Resource mapped successfully" });
      queryClient.invalidateQueries({
        queryKey: ["toolResourceMapping", toolId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/allocation/tools"] });
      refetchMapping();
      onMappingChanged?.();
      beginSuccessAndScheduleClose(() => {
        setIsOpen(false);
        setSelectedResourceId(null);
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unmapResourceMutation = useMutation({
    mutationFn: () => unmapResourceFromTool(toolId),
    onSuccess: () => {
      toast({ title: "Resource unmapped successfully" });
      setIsOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["toolResourceMapping", toolId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/allocation/tools"] });
      refetchMapping();
      setSelectedResourceId(null);
      onMappingChanged?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const currentMappedResource = currentMapping
    ? resources.find((r) => r.id === currentMapping.resourceId)
    : null;

  const handleMapResource = (resourceId: number) => {
    if (mapResourceMutation.isPending) return;
    mapResourceMutation.mutate(resourceId);
    setSelectedResourceId(null);
  };

  const handleUnmapResource = () => {
    if (unmapResourceMutation.isPending) return;
    unmapResourceMutation.mutate();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => handleDialogOpenChange(open, setIsOpen)}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        {isMapped ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 opacity-50 cursor-not-allowed pointer-events-none"
              disabled
              title="This tool is already mapped to a resource"
            >
              <Link2 className="h-4 w-4" />
              Map Resource
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setIsOpen(true)}
              title="View or remove resource mapping"
            >
              Manage
            </Button>
          </>
        ) : (
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              title="Map this tool to a tools resource"
            >
              <Link2 className="h-4 w-4" />
              Map Resource
            </Button>
          </DialogTrigger>
        )}
      </div>

      <DialogContent className="max-w-2xl duration-500">
        <DialogHeader>
          <DialogTitle>Map Tool to Tools Resource</DialogTitle>
          {!mapSuccess && (
            <p className="text-sm text-gray-500 mt-2">
              Tool:{" "}
              <span className="font-semibold text-gray-700">{toolName}</span>
            </p>
          )}
        </DialogHeader>

        {mapSuccess ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center animate-in fade-in zoom-in-95 duration-300">
            <CheckCircle2
              className="h-14 w-14 text-green-600 shrink-0"
              aria-hidden
            />
            <p className="mt-4 text-lg font-medium text-foreground">
              Resource mapped successfully
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Closing shortly...</p>
          </div>
        ) : (
        <div className="space-y-6">
          {currentMapping && currentMappedResource && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">Current Mapping</h3>
                  <div className="mt-3 space-y-2 text-sm text-blue-800">
                    <p>
                      <span className="font-medium">Resource:</span>{" "}
                      {currentMappedResource.name}
                    </p>
                    {currentMappedResource.description && (
                      <p>
                        <span className="font-medium">Description:</span>{" "}
                        {currentMappedResource.description}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Hourly Rate:</span>{" "}
                      {formatHourlyRate(currentMappedResource.unitRate)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnmapResource}
                  disabled={unmapResourceMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {mappingLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : resourcesLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : resourcesError ? (
            <div className="text-center py-4 text-red-600">
              <p>Error loading resources</p>
            </div>
          ) : (() => {
              const availableResources = resources.filter(
                (r) => r.id !== currentMapping?.resourceId
              );
              return availableResources.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>No other tools resources available to map</p>
                </div>
              ) : (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Available Tools Resources
              </h3>
              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {availableResources.map((resource) => (
                  <div
                    key={resource.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedResourceId === resource.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedResourceId(resource.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {resource.name}
                        </h4>
                        {resource.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {resource.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-3 text-sm">
                          <span className="text-gray-600">
                            <span className="font-medium">Hourly Rate:</span>{" "}
                            {formatHourlyRate(resource.unitRate)}
                          </span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="resource"
                        checked={selectedResourceId === resource.id}
                        onChange={() => setSelectedResourceId(resource.id)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
              );
            })()}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={
                mapResourceMutation.isPending ||
                unmapResourceMutation.isPending
              }
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedResourceId) {
                  handleMapResource(selectedResourceId);
                }
              }}
              disabled={
                !selectedResourceId ||
                selectedResourceId === currentMapping?.resourceId ||
                mapResourceMutation.isPending
              }
            >
              {mapResourceMutation.isPending ? "Mapping..." : "Save Mapping"}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
