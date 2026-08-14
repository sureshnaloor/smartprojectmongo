## guide to use this app
### project and work breakdown structure

Default currency is already enabled, so projects are ideally created with default currency.

Each project to have multiple WBS. project itself is at 1st level. upto 9 levels are permitted. each level can have as many children as possible without limit, but ideally restricted to less than 9. each wbs to have Work package at its end, to 'end' the wbs level, i.e, no more further wbs level below is possible for that leaf. 

Once wbs are done, 'finalize' then wbs cannot be amended: edit/delete/add of any WBS node or work package is disabled (API and UI). To revise a finalized structure, create a **project amendment** — a full copy of the project named `{projectName}_amd_1`, `{projectName}_amd_2`, etc. The new copy starts with WBS unlocked. Only the project creator or an admin may create amendments (red destructive confirmation button). use it with caution. 

before finalizing, no need to add/edit budget amounts. the finalize is only for wbs structure. 

### WBS import (CSV / Excel)

For large structures or exports from Primavera P6 / ERP, use **Import WBS** (CSV or `.xlsx`).

- Download the CSV or Excel template from the import dialog.
- Columns: `wbsCode`, `wbsName` (required); `wbsType`, `wbsDescription`, `budget` (optional).
- Aliases accepted: Code / Name / Type / Description / Budget (and common P6 labels).
- If `wbsType` is blank, leaves are auto-detected as **WorkPackage**, level 1 as **SUMMARY**, parents as **WBS**.
- Every branch must end in work packages. Budget may be 0 / blank until allocation.
- Import is blocked after WBS is finalized.

### work package

this is below WBS level and can be one to one or one-to-many with the lower-most wbs in any node. 
