export interface RiskEntry {
  id: number;
  projectId: number;
  dateLogged: string;
  risk: string;
  riskType: "Risk" | "Opportunity";
  probability: "High" | "Moderate" | "Low";
  impact: "High" | "Moderate" | "Low";
  userLogged: string;
  actionTaken: string;
  remarks: string | null;
  status: "Open" | "In Progress" | "Closed";
  createdAt: string;
  updatedAt: string;
}

export interface RiskFormData {
  dateLogged: string;
  risk: string;
  riskType: "" | "Risk" | "Opportunity";
  probability: "" | "High" | "Moderate" | "Low";
  impact: "" | "High" | "Moderate" | "Low";
  userLogged: string;
  actionTaken: string;
  remarks: string;
  status: "Open" | "In Progress" | "Closed";
}

export const emptyRiskForm = (): RiskFormData => ({
  dateLogged: new Date().toISOString().split("T")[0],
  risk: "",
  riskType: "",
  probability: "",
  impact: "",
  userLogged: "",
  actionTaken: "",
  remarks: "",
  status: "Open",
});
