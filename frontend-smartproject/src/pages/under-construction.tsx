import { useParams, useLocation } from "wouter";
import { Construction, Home, ArrowLeft, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnderConstruction() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const pageName = params.pageName || "This page";
  const decodedPageName = decodeURIComponent(pageName).replace(/-/g, ' ');

  const handleGoHome = () => {
    setLocation('/');
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoToProjects = () => {
    setLocation('/');
  };

  const handleGoToSettings = () => {
    setLocation('/activity-master');
  };

  return (
    <div className="flex-1 p-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-500">
          <button 
            onClick={handleGoHome}
            className="flex items-center hover:text-gray-700 transition-colors"
          >
            <Home className="h-4 w-4 mr-1" />
            Home
          </button>
          <span>/</span>
          <button 
            onClick={handleGoBack}
            className="flex items-center hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">{decodedPageName}</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <Construction className="h-20 w-20 text-teal-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              {decodedPageName} is Under Construction
            </CardTitle>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              We're working hard to build this feature. Our development team is actively working on bringing you this functionality.
            </p>
          </CardHeader>
          
          <CardContent className="text-center">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: '35%' }}></div>
              </div>
              <p className="text-sm text-gray-500">Approximately 35% complete</p>
            </div>

            {/* Quick Navigation Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={handleGoHome}
              >
                <Home className="h-6 w-6" />
                <span>Go to Home</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={handleGoToProjects}
              >
                <FileText className="h-6 w-6" />
                <span>View Projects</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={handleGoToSettings}
              >
                <Settings className="h-6 w-6" />
                <span>Master Data</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center space-y-2"
                onClick={handleGoBack}
              >
                <ArrowLeft className="h-6 w-6" />
                <span>Go Back</span>
              </Button>
            </div>

            {/* Additional Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                What's Coming Soon?
              </h3>
              <p className="text-blue-700 mb-4">
                This feature is currently in development. You'll be able to:
              </p>
              <ul className="text-blue-700 text-left max-w-md mx-auto space-y-1">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Upload and manage documents
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  View and organize project files
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Share documents with team members
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  Track document versions and changes
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 