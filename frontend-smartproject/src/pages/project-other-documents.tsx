import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, FileText, Download, Eye, Trash2, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface DocFile {
    fileId: string;
    fileName: string;
    uploadTimestamp: number;
    contentLength: number;
    fileInfo: {
        docName?: string;
        description?: string;
        uploadedBy?: string;
    };
}

export default function ProjectOtherDocuments() {
    const { projectId } = useParams();
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);

    const [docName, setDocName] = useState("");
    const [description, setDescription] = useState("");

    const { data: project } = useQuery({
        queryKey: [`/api/projects/${projectId}`],
    });

    const { data: files, isLoading } = useQuery<DocFile[]>({
        queryKey: [`/api/projects/${projectId}/other-documents`],
    });

    const uploadMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const res = await fetch(`/api/projects/${projectId}/other-documents/upload`, {
                method: "POST",
                body: formData,
                credentials: 'include',
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to upload file");
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/other-documents`] });
            toast({
                title: "Success",
                description: "Document uploaded successfully",
            });
            setUploading(false);
            setDocName("");
            setDescription("");
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
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
            const res = await apiRequest("DELETE", `/api/projects/${projectId}/other-documents?fileId=${fileId}&fileName=${encodedFileName}`);
            if (!res.ok) {
                throw new Error("Delete failed");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/other-documents`] });
            toast({
                title: "Success",
                description: "Document deleted successfully",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: "Failed to delete document",
                variant: "destructive",
            });
        },
    });

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!docName) {
            toast({
                title: "Validation Error",
                description: "Please enter a Document Name before uploading.",
                variant: "destructive",
            });
            event.target.value = '';
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("docName", docName);
        formData.append("description", description);

        uploadMutation.mutate(formData);
    };

    const handleDelete = (fileId: string, fileName: string) => {
        if (confirm("Are you sure you want to delete this document?")) {
            deleteMutation.mutate({ fileId, fileName });
        }
    };

    const handleDownload = async (fileId: string, fileName: string) => {
        try {
            window.location.href = `/api/projects/${projectId}/other-documents/download?fileId=${fileId}`;
        } catch (error) {
            console.error("Download error", error);
            toast({
                title: "Error",
                description: "Failed to download file",
                variant: "destructive",
            });
        }
    };

    const handleView = (fileId: string, fileName: string) => {
        window.open(`/api/projects/${projectId}/other-documents/download?fileId=${fileId}`, '_blank');
    };

    return (
        <div className="space-y-8 p-6 bg-background min-h-screen">
            {/* Header Section */}
            <div className="relative flex items-center justify-center mb-8 p-6 rounded-xl bg-card border shadow-[0_10px_20px_rgba(0,0,0,0.1),0_6px_6px_rgba(0,0,0,0.1)] transition-all hover:shadow-[0_14px_28px_rgba(0,0,0,0.15),0_10px_10px_rgba(0,0,0,0.12)]">
                <div className="text-center">
                    <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Other Documents
                    </h1>
                    <p className="text-muted-foreground mt-2">Miscellaneous Project Files and Documents</p>
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
                    <CardTitle className="text-lg">Upload New Document</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            placeholder="Document Name / Title"
                            value={docName}
                            onChange={(e) => setDocName(e.target.value)}
                        />
                        <Input
                            placeholder="Description (Optional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/5 hover:bg-muted/10 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                {uploading ? (
                                    <Loader2 className="w-8 h-8 mb-3 text-primary animate-spin" />
                                ) : (
                                    <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
                                )}
                                <p className="mb-2 text-sm text-muted-foreground">
                                    <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-muted-foreground">Any File Type (MAX. 10MB)</p>
                            </div>
                            <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                accept="*"
                            />
                        </label>
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
                    {files?.map((file) => (
                        <Card key={file.fileId} className="group overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 bg-muted/30">
                                <div className="space-y-1 overflow-hidden">
                                    <CardTitle className="text-base font-semibold truncate" title={(file.fileInfo?.docName || file.fileInfo?.docname)}>
                                        {(file.fileInfo?.docName || file.fileInfo?.docname) || file.fileName}
                                    </CardTitle>
                                    <p className="text-xs text-muted-foreground truncate" title={file.fileName}>
                                        {file.fileName.split('/').pop()}
                                    </p>
                                </div>
                                <div className="p-2 rounded-full bg-gray-100 text-gray-600">
                                    <FolderOpen className="h-5 w-5" />
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
                                        <span className="font-medium">Size:</span> {(file.contentLength / 1024).toFixed(1)} KB
                                    </div>
                                    <div>
                                        <span className="font-medium">Date:</span> {new Date(file.uploadTimestamp).toLocaleDateString()}
                                    </div>
                                    <div className="col-span-2">
                                        <span className="font-medium">Uploaded By:</span> {(file.fileInfo?.uploadedBy || file.fileInfo?.uploadedby) || "Unknown"}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleView(file.fileId, file.fileName)}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        View
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(file.fileId, file.fileName)}>
                                        <Download className="mr-2 h-4 w-4" />
                                        Download
                                    </Button>
                                    <Button variant="destructive" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(file.fileId, file.fileName)}>
                                        <span className="sr-only">Delete</span>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {files?.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                            <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
                            <p className="text-lg font-medium">No other documents uploaded yet</p>
                            <p className="text-sm">Upload miscellaneous files here</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
