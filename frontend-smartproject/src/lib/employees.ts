export interface EmployeeOption {
  id: number;
  employeeNumber?: string;
  empFirstName?: string;
  empMiddleName?: string | null;
  empLastName?: string;
  empPosition?: string | null;
}

export function employeeOptionLabel(employee: EmployeeOption): string {
  const middle =
    employee.empMiddleName && !employee.empMiddleName.startsWith("@gm:")
      ? employee.empMiddleName
      : "";
  const name = [employee.empFirstName, middle, employee.empLastName].filter(Boolean).join(" ");
  const position = employee.empPosition ? ` · ${employee.empPosition}` : "";
  return `${name || employee.employeeNumber || "Employee"}${position}`;
}
