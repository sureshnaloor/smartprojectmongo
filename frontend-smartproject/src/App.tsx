import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import ProjectWbsWorkPackages from "@/pages/project-wbs-work-packages";
import Landing from '@/pages/landing';
import WbsStructure from "@/pages/wbs-structure";
import Schedule from "@/pages/schedule";
import CostControl from "@/pages/cost-control";
import Reports from "@/pages/reports";
import UnderConstruction from "@/pages/under-construction";
import ActivityMaster from "@/pages/activity-master";
import ActivityMasterLayout from "@/layouts/activity-master-layout";
import ActivityMasterUom from "@/pages/activity-master-uom";
import TaskMaster from "@/pages/task-master";
import TaskMasterLayout from "@/layouts/task-master-layout";
import ProjectLayout from "@/layouts/project-layout";
import MasterLayout from "@/layouts/master-layout";
import ResourceMaster from "@/pages/resource-master";
import ResourceMasterLayout from "@/layouts/resource-master-layout";
import GlobalToolsPlaceholder from "@/pages/global-tools-placeholder";
import MaterialMaster from "@/pages/material-master";
import MaterialMasterLayout from "@/layouts/material-master-layout";
import MaterialMasterUom from "@/pages/material-master-uom";
import MaterialMasterType from "@/pages/material-master-type";
import MaterialMasterGroup from "@/pages/material-master-group";
import ServiceMaster from "@/pages/service-master";
import ServiceMasterLayout from "@/layouts/service-master-layout";
import ServiceMasterUom from "@/pages/service-master-uom";
import ServiceMasterType from "@/pages/service-master-type";
import ServiceMasterGroup from "@/pages/service-master-group";
import VendorMaster from "@/pages/vendor-master";
import VendorMasterCountry from "@/pages/vendor-master-country";
import VendorMasterCity from "@/pages/vendor-master-city";
import VendorMasterLayout from "@/layouts/vendor-master-layout";
import EmployeeMaster from "@/pages/employee-master";
import EmployeeMasterRental from "@/pages/employee-master-rental";
import EmployeeMasterLayout from "@/layouts/employee-master-layout";
import EmployeeMasterNationality from "@/pages/employee-master-nationality";
import EmployeeMasterTitle from "@/pages/employee-master-title";
import EmployeeMasterPosition from "@/pages/employee-master-position";
import EmployeeMasterGrade from "@/pages/employee-master-grade";
import EmployeeMasterTrade from "@/pages/employee-master-trade";
import EquipmentMaster from "@/pages/equipment-master";
import EquipmentMasterLayout from "@/layouts/equipment-master-layout";
import EquipmentMasterRental from "@/pages/equipment-master-rental";
import EquipmentMasterManufacturers from "@/pages/equipment-master-manufacturers";
import EquipmentMasterTypes from "@/pages/equipment-master-types";
import EquipmentMasterRentalPr from "@/pages/equipment-master-rental-pr";
import ToolMaster from "@/pages/tool-master";
import ToolMasterLayout from "@/layouts/tool-master-layout";
import ToolMasterManufacturers from "@/pages/tool-master-manufacturers";
import ToolMasterModels from "@/pages/tool-master-models";
import ToolMasterTypes from "@/pages/tool-master-types";
import ToolMasterPr from "@/pages/tool-master-pr";
import GlobalMastersLayout from "@/layouts/global-masters-layout";
import GlobalMastersCompany from "@/pages/global-masters-company";
import GlobalMastersDefaults from "@/pages/global-masters-defaults";
import GlobalMastersCalendar from "@/pages/global-masters-calendar";
import RiskRegister from "@/pages/risk-register";
import ProjectDailyProgress from "@/pages/project-daily-progress";
import ResourcePlan from "@/pages/resource-plan";
import LessonLearntRegister from "@/pages/lesson-learnt-register";
import SafetyIncidents from "@/pages/safety-incidents";
import SafetyToolboxTalk from "@/pages/safety-toolbox-talk";
import EnvironmentalIncidents from "@/pages/environmental-incidents";
import WikiOthers from "@/pages/wiki-others";
import DirectManpowerList from "@/pages/direct-manpower-list";
import IndirectManpowerList from "@/pages/indirect-manpower-list";
import PlannedActivityTasks from "@/pages/planned-activity-tasks";
import CollabPage from "@/pages/collab";
import ThreadDetailPage from "@/pages/thread-detail";
import KanbanPage from "@/pages/kanban";
import ProjectActivities from "@/pages/project-activities";
import ProjectTasks from "@/pages/project-tasks";
import ProjectResources from "@/pages/project-resources";
import ProjectMaterialsServices from "@/pages/project-materials-services";
import ProjectResourcesPage1 from "@/pages/project-resources-page1";
import ProjectResourcesPage2 from "@/pages/project-resources-page2";
import ProjectResourcesPage3 from "@/pages/project-resources-page3";
import ProjectResourcesPage4 from "@/pages/project-resources-page4";
import ProjectResourcesPage5 from "@/pages/project-resources-page5";
import ProjectActivityPlan from "@/pages/project-activity-plan";
import ProjectActivitiesPage2 from "@/pages/project-activities-page2";
import ProjectActivitiesPage3 from "@/pages/project-activities-page3";
import ProjectActivitiesPage4 from "@/pages/project-activities-page4";
import ProjectTasksPage1 from "@/pages/project-tasks-page1";
import ProjectTasksPage2 from "@/pages/project-tasks-page2";
import ProjectTasksPage3 from "@/pages/project-tasks-page3";
import ProjectTasksPage4 from "@/pages/project-tasks-page4";
import ProjectTasksPage5 from "@/pages/project-tasks-page5";
import ProjectCollabPage2 from "@/pages/project-collab-page2";
import ProjectCollabPage3 from "@/pages/project-collab-page3";
import ProjectCollabPage4 from "@/pages/project-collab-page4";
import ProjectCollabPage5 from "@/pages/project-collab-page5";
import ProjectDrawings from "@/pages/project-drawings";
import ProjectBoq from "@/pages/project-boq";
import ProjectScope from "@/pages/project-scope";
import ProjectCorrespondence from "@/pages/project-correspondence";
import ProjectSupplierCorrespondence from "@/pages/project-supplier-correspondence";
import ProjectSubcontractCorrespondence from "@/pages/project-subcontract-correspondence";
import ProjectInternalCorrespondence from "@/pages/project-internal-correspondence";
import ProjectRequestForInspection from "@/pages/project-request-for-inspection";
import ProjectItpAndReports from "@/pages/project-itp-and-reports";
import ProjectOtherDocuments from "@/pages/project-other-documents";
import ProjectEquipmentCatalogue from "@/pages/project-equipment-catalogue";
import NewLanding from "@/pages/new-landing";
import NewProject from "@/pages/new-project";
import ProjectCharts from "@/pages/project-charts";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import PurchaseRequisitionsPage from "@/pages/purchase-requisitions";
import AllocationMaterials from "@/pages/allocation-materials";
import AllocationManpower from "@/pages/allocation-manpower";
import AllocationEquipment from "@/pages/allocation-equipment";
import AllocationRentalManpower from "@/pages/allocation-rental-manpower";
import AllocationRentalEquipment from "@/pages/allocation-rental-equipment";
import AllocationTools from "@/pages/allocation-tools";
import TimesheetsPage from "@/pages/timesheets";


// Implementing a flatter routing approach without nesting
function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={Landing} />
      <Route path="/playground" component={Home} />

      {/* Project WBS & Work Packages (project home) */}
      <Route path="/projects/:projectId">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectWbsWorkPackages />
          </ProjectLayout>
        )}
      </Route>

      {/* WBS Structure */}
      <Route path="/projects/:projectId/wbs">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <WbsStructure />
          </ProjectLayout>
        )}
      </Route>

      {/* Schedule */}
      <Route path="/projects/:projectId/schedule">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <Schedule />
          </ProjectLayout>
        )}
      </Route>

      {/* Cost Control */}
      <Route path="/projects/:projectId/costs">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <CostControl />
          </ProjectLayout>
        )}
      </Route>

      {/* Reports */}
      <Route path="/projects/:projectId/reports">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <Reports />
          </ProjectLayout>
        )}
      </Route>

      {/* PERT and Gantt Charts */}
      <Route path="/projects/:projectId/charts">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectCharts />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Documents - Specific Routes */}
      <Route path="/projects/:projectId/project-docs/ProjectDrawings">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectDrawings />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/ProjectBOQ">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectBoq />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/ProjectScope">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectScope />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/ClientCorrespondence">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectCorrespondence />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/SupplierCorrespondence">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectSupplierCorrespondence />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/SubcontractCorrespondence">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectSubcontractCorrespondence />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/InternalCorrespondence">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectInternalCorrespondence />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/RequestForInspection">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectRequestForInspection />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/ITPAndReports">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectItpAndReports />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/OtherDocuments">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectOtherDocuments />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/project-docs/EquipmentCatalogue">
        {(params) => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectEquipmentCatalogue />
          </ProjectLayout>
        )}
      </Route>

      {/* Project docs catch-all (e.g. OtherWiki) */}
      <Route path="/projects/:projectId/project-docs/:pageName">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <UnderConstruction />
          </ProjectLayout>
        )}
      </Route>

      {/* Risk Register */}
      <Route path="/projects/:projectId/risk-register">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <RiskRegister />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Daily Progress */}
      <Route path="/projects/:projectId/project-daily-progress">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectDailyProgress />
          </ProjectLayout>
        )}
      </Route>

      {/* Resource Plan */}
      <Route path="/projects/:projectId/resource-plan">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ResourcePlan />
          </ProjectLayout>
        )}
      </Route>

      {/* Lesson Learnt Register */}
      <Route path="/projects/:projectId/lesson-learnt-register">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <LessonLearntRegister />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Wiki — safety & environmental */}
      <Route path="/projects/:projectId/safety-incidents">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <SafetyIncidents />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/safety-toolbox-talk">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <SafetyToolboxTalk />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/environmental-incidents">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <EnvironmentalIncidents />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/wiki-others">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <WikiOthers />
          </ProjectLayout>
        )}
      </Route>

      {/* Direct Manpower List */}
      <Route path="/projects/:projectId/direct-manpower-list">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <DirectManpowerList />
          </ProjectLayout>
        )}
      </Route>

      {/* Indirect Manpower List */}
      <Route path="/projects/:projectId/indirect-manpower-list">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <IndirectManpowerList />
          </ProjectLayout>
        )}
      </Route>

      {/* Planned Activity/Tasks */}
      <Route path="/projects/:projectId/planned-activity-tasks">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <PlannedActivityTasks />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Activities - Tab Pages */}
      <Route path="/projects/:projectId/activities/activity-plan">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectActivityPlan />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/activities/page2">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectActivitiesPage2 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/activities/page3">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectActivitiesPage3 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/activities/page4">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectActivitiesPage4 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/activities/page5">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectActivities />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Activities */}
      <Route path="/projects/:projectId/activities">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectActivities />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Tasks - Tab Pages */}
      <Route path="/projects/:projectId/tasks/page1">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectTasksPage1 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/tasks/page2">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectTasksPage2 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/tasks/page3">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectTasksPage3 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/tasks/page4">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectTasksPage4 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/tasks/page5">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectTasksPage5 />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Tasks */}
      <Route path="/projects/:projectId/tasks">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectTasks />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Resources - Tab Pages */}
      <Route path="/projects/:projectId/resources/page1">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectResourcesPage1 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/resources/page2">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectResourcesPage2 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/resources/page3">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectResourcesPage3 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/resources/page4">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectResourcesPage4 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/resources/page5">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectResourcesPage5 />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Resources */}
      <Route path="/projects/:projectId/resources/:type">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectResources />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/resources">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectResources />
          </ProjectLayout>
        )}
      </Route>

      {/* Project Materials & Services (Materials, Services, Manpower, Equipment tabs) */}
      <Route path="/projects/:projectId/materials-services/:tab">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectMaterialsServices />
          </ProjectLayout>
        )}
      </Route>
      <Route path="/projects/:projectId/materials-services">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectMaterialsServices />
          </ProjectLayout>
        )}
      </Route>

      {/* Global Masters */}
      <Route path="/global-masters/company">
        <GlobalMastersLayout>
          <GlobalMastersCompany />
        </GlobalMastersLayout>
      </Route>
      <Route path="/global-masters/defaults">
        <GlobalMastersLayout>
          <GlobalMastersDefaults />
        </GlobalMastersLayout>
      </Route>
      <Route path="/global-masters/calendar">
        <GlobalMastersLayout>
          <GlobalMastersCalendar />
        </GlobalMastersLayout>
      </Route>
      <Route path="/global-masters">
        <GlobalMastersLayout>
          <GlobalMastersCompany />
        </GlobalMastersLayout>
      </Route>

      {/* Activity Master */}
      <Route path="/activity-master/uom">
        <ActivityMasterLayout>
          <ActivityMasterUom />
        </ActivityMasterLayout>
      </Route>
      <Route path="/activity-master">
        <ActivityMasterLayout>
          <ActivityMaster />
        </ActivityMasterLayout>
      </Route>

      {/* Task Master */}
      <Route path="/task-master/tab2">
        <TaskMasterLayout>
          <GlobalToolsPlaceholder />
        </TaskMasterLayout>
      </Route>
      <Route path="/task-master/tab3">
        <TaskMasterLayout>
          <GlobalToolsPlaceholder />
        </TaskMasterLayout>
      </Route>
      <Route path="/task-master">
        <TaskMasterLayout>
          <TaskMaster />
        </TaskMasterLayout>
      </Route>

      {/* Resource Master */}
      <Route path="/resource-master/tab2">
        <ResourceMasterLayout>
          <GlobalToolsPlaceholder />
        </ResourceMasterLayout>
      </Route>
      <Route path="/resource-master/tab3">
        <ResourceMasterLayout>
          <GlobalToolsPlaceholder />
        </ResourceMasterLayout>
      </Route>
      <Route path="/resource-master">
        <ResourceMasterLayout>
          <ResourceMaster />
        </ResourceMasterLayout>
      </Route>

      {/* Material Master */}
      <Route path="/material-master/purchase-requisitions">
        <MaterialMasterLayout>
          <PurchaseRequisitionsPage />
        </MaterialMasterLayout>
      </Route>
      <Route path="/material-master/purchase-orders">
        <MaterialMasterLayout>
          <PurchaseOrdersPage />
        </MaterialMasterLayout>
      </Route>
      <Route path="/material-master/uom">
        <MaterialMasterLayout>
          <MaterialMasterUom />
        </MaterialMasterLayout>
      </Route>
      <Route path="/material-master/material-type">
        <MaterialMasterLayout>
          <MaterialMasterType />
        </MaterialMasterLayout>
      </Route>
      <Route path="/material-master/material-group">
        <MaterialMasterLayout>
          <MaterialMasterGroup />
        </MaterialMasterLayout>
      </Route>
      <Route path="/material-master">
        <MaterialMasterLayout>
          <MaterialMaster />
        </MaterialMasterLayout>
      </Route>

      {/* Service Master */}
      <Route path="/service-master/purchase-requisitions">
        <ServiceMasterLayout>
          <PurchaseRequisitionsPage />
        </ServiceMasterLayout>
      </Route>
      <Route path="/service-master/purchase-orders">
        <ServiceMasterLayout>
          <PurchaseOrdersPage />
        </ServiceMasterLayout>
      </Route>
      <Route path="/service-master/uom">
        <ServiceMasterLayout>
          <ServiceMasterUom />
        </ServiceMasterLayout>
      </Route>
      <Route path="/service-master/service-type">
        <ServiceMasterLayout>
          <ServiceMasterType />
        </ServiceMasterLayout>
      </Route>
      <Route path="/service-master/service-group">
        <ServiceMasterLayout>
          <ServiceMasterGroup />
        </ServiceMasterLayout>
      </Route>
      <Route path="/service-master">
        <ServiceMasterLayout>
          <ServiceMaster />
        </ServiceMasterLayout>
      </Route>

      {/* Vendor Master */}
      <Route path="/vendor-master/country">
        <VendorMasterLayout>
          <VendorMasterCountry />
        </VendorMasterLayout>
      </Route>
      <Route path="/vendor-master/city">
        <VendorMasterLayout>
          <VendorMasterCity />
        </VendorMasterLayout>
      </Route>
      <Route path="/vendor-master">
        <VendorMasterLayout>
          <VendorMaster />
        </VendorMasterLayout>
      </Route>

      {/* Employee Master */}
      <Route path="/employee-master/rental-po">
        <EmployeeMasterLayout>
          <PurchaseOrdersPage />
        </EmployeeMasterLayout>
      </Route>
      <Route path="/employee-master/nationality" component={EmployeeMasterNationality} />
      <Route path="/employee-master/title" component={EmployeeMasterTitle} />
      <Route path="/employee-master/position" component={EmployeeMasterPosition} />
      <Route path="/employee-master/grade" component={EmployeeMasterGrade} />
      <Route path="/employee-master/trade" component={EmployeeMasterTrade} />
      <Route path="/employee-master/rental">
        <EmployeeMasterLayout>
          <EmployeeMasterRental />
        </EmployeeMasterLayout>
      </Route>
      <Route path="/employee-master">
        <EmployeeMasterLayout>
          <EmployeeMaster />
        </EmployeeMasterLayout>
      </Route>

      {/* Equipment Master */}
      <Route path="/equipment-master/rental-pr">
        <EquipmentMasterLayout>
          <EquipmentMasterRentalPr />
        </EquipmentMasterLayout>
      </Route>
      <Route path="/equipment-master/purchase-requisitions">
        <EquipmentMasterLayout>
          <EquipmentMasterRentalPr />
        </EquipmentMasterLayout>
      </Route>
      <Route path="/equipment-master/rental-po">
        <EquipmentMasterLayout>
          <PurchaseOrdersPage />
        </EquipmentMasterLayout>
      </Route>
      <Route path="/equipment-master/rental">
        <EquipmentMasterLayout>
          <EquipmentMasterRental />
        </EquipmentMasterLayout>
      </Route>
      <Route path="/equipment-master/manufacturers" component={EquipmentMasterManufacturers} />
      <Route path="/equipment-master/equipment-types" component={EquipmentMasterTypes} />
      <Route path="/equipment-master">
        <EquipmentMasterLayout>
          <EquipmentMaster />
        </EquipmentMasterLayout>
      </Route>
      <Route path="/tool-master/purchase-requisitions">
        <ToolMasterLayout>
          <ToolMasterPr />
        </ToolMasterLayout>
      </Route>
      <Route path="/tool-master/purchase-orders">
        <ToolMasterLayout>
          <PurchaseOrdersPage />
        </ToolMasterLayout>
      </Route>
      <Route path="/tool-master/manufacturers" component={ToolMasterManufacturers} />
      <Route path="/tool-master/models" component={ToolMasterModels} />
      <Route path="/tool-master/tool-types" component={ToolMasterTypes} />
      <Route path="/tool-master">
        <ToolMasterLayout>
          <ToolMaster />
        </ToolMasterLayout>
      </Route>

      {/* New Pages Ported from Vanilla JS */}
      <Route path="/newlanding" component={NewLanding} />
      <Route path="/newproject/:projectId">
        {params => <NewProject />}
      </Route>

      <Route path="/purchase-orders">
        {() => <PurchaseOrdersPage />}
      </Route>


      {/* Collaboration Hub */}
      <Route path="/collab">
        <MasterLayout>
          <CollabPage />
        </MasterLayout>
      </Route>
      <Route path="/collab/thread/:threadId">
        <MasterLayout>
          <ThreadDetailPage />
        </MasterLayout>
      </Route>

      {/* Allocation (cross-project) */}
      <Route path="/allocation/materials">
        <MasterLayout>
          <AllocationMaterials />
        </MasterLayout>
      </Route>
      <Route path="/allocation/manpower">
        <MasterLayout>
          <AllocationManpower />
        </MasterLayout>
      </Route>
      <Route path="/allocation/equipment">
        <MasterLayout>
          <AllocationEquipment />
        </MasterLayout>
      </Route>
      <Route path="/allocation/rental-manpower">
        <MasterLayout>
          <AllocationRentalManpower />
        </MasterLayout>
      </Route>
      <Route path="/allocation/rental-equipment">
        <MasterLayout>
          <AllocationRentalEquipment />
        </MasterLayout>
      </Route>
      <Route path="/allocation/tools">
        <MasterLayout>
          <AllocationTools />
        </MasterLayout>
      </Route>
      <Route path="/timesheets">
        <MasterLayout>
          <TimesheetsPage />
        </MasterLayout>
      </Route>

      {/* Project Collaboration Hub - Tab Pages */}
      <Route path="/projects/:projectId/collab/page1">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <CollabPage />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/collab/page2">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectCollabPage2 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/collab/page3">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectCollabPage3 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/collab/page4">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectCollabPage4 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/collab/page5">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ProjectCollabPage5 />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/collab/thread/:threadId">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <ThreadDetailPage />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/collab">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <CollabPage />
          </ProjectLayout>
        )}
      </Route>

      <Route path="/projects/:projectId/kanban">
        {params => (
          <ProjectLayout projectId={parseInt(params.projectId)}>
            <KanbanPage />
          </ProjectLayout>
        )}
      </Route>

      {/* Global Under Construction Pages */}
      <Route path="/under-construction/:pageName">
        {params => (
          <MasterLayout>
            <UnderConstruction />
          </MasterLayout>
        )}
      </Route>

      {/* 404 for anything else */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
