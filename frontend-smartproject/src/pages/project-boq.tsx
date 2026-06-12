import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, FileText, Download, Eye, Trash2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface BoqFile {
    fileId: string;
    fileName: string;
    uploadTimestamp: number;
    contentLength: number;
    fileInfo: {
        boqName?: string;
        description?: string;
        uploadedBy?: string;
    };
}

export default function ProjectBoq() {
    const { projectId } = useParams();
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

    const [boqName, setBoqName] = useState("");
    const [description, setDescription] = useState("");

    const { data: project } = useQuery({
        queryKey: [`/api/projects/${projectId}`],
    });

    const { data: boqFiles, isLoading } = useQuery<BoqFile[]>({
        queryKey: [`/api/projects/${projectId}/boq`],
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("boqName", boqName);
            formData.append("description", description);

            const res = await fetch(`/api/projects/${projectId}/boq/upload`, {
                method: "POST",
                body: formData,
                credentials: 'include',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Upload failed");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/boq`] });
            toast({
                title: "Success",
                description: "BOQ file uploaded successfully",
            });
            setUploading(false);
            setBoqName("");
            setDescription("");
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
            setUploading(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ fileId, fileName }: { fileId: string; fileName: string }) => {
            const encodedFileName = encodeURIComponent(fileName);
            const res = await apiRequest("DELETE", `/api/projects/${projectId}/boq?fileId=${fileId}&fileName=${encodedFileName}`);
            if (!res.ok) {
                throw new Error("Delete failed");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/boq`] });
            toast({
                title: "Success",
                description: "BOQ file deleted successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: "Failed to delete BOQ file",
                variant: "destructive",
            });
        },
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            uploadMutation.mutate(e.target.files[0]);
        }
    };

    const handleDelete = (fileId: string, fileName: string) => {
        if (confirm("Are you sure you want to delete this BOQ file?")) {
            deleteMutation.mutate({ fileId, fileName });
        }
    };

    const handleDownload = async (fileName: string) => {
        try {
            const encodedFileName = encodeURIComponent(fileName);
            const res = await apiRequest("GET", `/api/projects/${projectId}/boq/foo/download?fileName=${encodedFileName}`);
            const data = await res.json();

            // Trigger download
            window.open(data.url, "_blank");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to get download URL",
                variant: "destructive",
            });
        }
    };

    const handleViewPdf = async (fileName: string) => {
        try {
            const encodedFileName = encodeURIComponent(fileName);
            const res = await apiRequest("GET", `/api/projects/${projectId}/boq/foo/download?fileName=${encodedFileName}`);
            const data = await res.json();
            setSelectedPdf(data.url);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load PDF",
                variant: "destructive",
            });
        }
    };

    const handleExtractBoq = (fileName: string) => {
        toast({
            title: "Info",
            description: "Extract BOQ functionality coming soon!",
        });
    };

    // Helper to get display name from full path
    const getDisplayName = (fullPath: string) => {
        const parts = fullPath.split("/");
        const fileNameWithTimestamp = parts[parts.length - 1];
        return fileNameWithTimestamp.replace(/^\d+_/, "");
    };

    const isPdf = (fileName: string) => fileName.toLowerCase().endsWith(".pdf");

    return (
        <div className="space-y-8 p-6 bg-background min-h-screen">
            {/* Header Section */}
            <div className="relative flex items-center justify-center mb-8 p-6 rounded-xl bg-card border shadow-[0_10px_20px_rgba(0,0,0,0.1),0_6px_6px_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_14px_28px_rgba(0,0,0,0.15),0_10px_10px_rgba(0,0,0,0.12)]">
                <div className="text-center">
                    <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Project BOQ
                    </h1>
                    <p className="text-muted-foreground mt-2">Manage Bill of Quantities and Specifications</p>
                </div>

                {project && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:block">
                        <div className="text-right">
                            <span className="block text-xs text-muted-foreground uppercase tracking-wider">Project</span>
                            <span className="text-xl font-serif font-bold text-primary">{project.name}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Upload Section - narrow centered */}
            <div className="flex justify-center">
              <div className="w-full max-w-md">
            <Card className="border-2 border-dashed shadow-sm hover:border-primary/50 transition-colors">
                <CardHeader>
                    <CardTitle className="text-lg">Upload New BOQ / Spec</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            placeholder="Document Name (e.g., Civil Works BOQ)"
                            value={boqName}
                            onChange={(e) => setBoqName(e.target.value)}
                        />
                        <Input
                            placeholder="Description (Optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Input
                            type="file"
                            className="hidden"
                            id="file-upload"
                            accept=".pdf,.xls,.xlsx,.csv,.doc,.docx"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <label htmlFor="file-upload" className="w-full md:w-auto">
                            <Button asChild disabled={uploading} className="w-full cursor-pointer bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all">
                                <span>
                                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    {uploading ? "Uploading..." : "Select File to Upload"}
                                </span>
                            </Button>
                        </label>
                        <p className="text-sm text-muted-foreground">Supported: PDF, Excel, Word, CSV</p>
                    </div>
                </CardContent>
            </Card>
              </div>
            </div>

            {/* Files Grid */}
            {isLoading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {boqFiles?.map((file: any) => (
                        <Card key={file.fileId} className="group overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 bg-muted/30">
                                <div className="space-y-1 overflow-hidden">
                                    <CardTitle className="text-base font-semibold truncate" title={(file.fileInfo?.boqName || file.fileInfo?.boqname) || getDisplayName(file.fileName)}>
                                        {(file.fileInfo?.boqName || file.fileInfo?.boqname) || getDisplayName(file.fileName)}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground truncate" title={file.fileName}>
                                        {getDisplayName(file.fileName)}
                                    </p>
                                </div>
                                <div className={`p-2 rounded-full ${isPdf(file.fileName) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {isPdf(file.fileName) ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                {file.fileInfo?.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                                        {file.fileInfo.description}
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground py-2 border-t border-b">
                                    <div>
                                        <span className="font-medium">Size:</span> {(file.contentLength / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                    <div>
                                        <span className="font-medium">Date:</span> {new Date(file.uploadTimestamp).toLocaleDateString()}
                                    </div>
                                    <div className="col-span-2">
                                        <span className="font-medium">Uploaded By:</span> {(file.fileInfo?.uploadedBy || file.fileInfo?.uploadedby) || "Unknown"}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    <div className="flex gap-2">
                                        {isPdf(file.fileName) && (
                                            <Button variant="secondary" size="sm" className="flex-1" onClick={() => handleViewPdf(file.fileName)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                View
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(file.fileName)}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>
                                    <Button variant="default" size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => handleExtractBoq(file.fileName)}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                                        Extract BOQ
                                    </Button>
                                    <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(file.fileId, file.fileName)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete File
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {boqFiles?.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                            <FileSpreadsheet className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No BOQ documents uploaded yet</p>
                            <p className="text-sm">Upload a PDF or Excel file to get started</p>
                        </div>
                    )}
                </div>
            )}

            {selectedPdf && (
                <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
                    <div className="bg-background w-full h-full max-w-7xl rounded-xl shadow-2xl flex flex-col border ring-1 ring-border">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30 rounded-t-xl">
                            <h3 className="font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                PDF Viewer
                            </h3>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPdf(null)} className="hover:bg-destructive/10 hover:text-destructive">
                                Close
                            </Button>
                        </div>
                        <div className="flex-1 bg-muted/10 p-1 overflow-hidden rounded-b-xl">
                            <iframe src={selectedPdf} className="w-full h-full rounded-lg border shadow-inner" title="PDF Viewer" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
