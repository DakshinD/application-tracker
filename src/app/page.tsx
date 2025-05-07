"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, ArrowRight, Pencil, Trash2, Plus } from "lucide-react"; 
import { ResponsiveSankey } from "@nivo/sankey";
import { TimelineVisualization } from "../components/TimelineVisualization";

// Define application status types
type ApplicationStatus = 
  | "Applied" 
  | "Online Assessment" 
  | "Phone" 
  | "Behavioral"
  | "Technical" 
  | "Final" 
  | "Offer" 
  | "Rejected" 
  | "Accepted" 
  | "Declined"
  | "Ghosted";

// Helper function to get status class
const getStatusClass = (status: ApplicationStatus): string => {
  switch(status) {
    case "Applied":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Online Assessment":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Phone":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "Behavioral":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Technical":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Final":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Offer":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "Accepted":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Declined":
      return "bg-red-100 text-red-800 border-red-200";
    case "Ghosted":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Application interface
interface Application {
  id: string;
  company: string;
  jobTitle: string;
  location: string;
  dateApplied: string;
  currentStatus: ApplicationStatus;
  url?: string; // Optional URL field
  timeline: {
    status: ApplicationStatus;
    date: string;
  }[];
}

// Helper for date formatting
const formatDateForStorage = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year.slice(2)}`;
};

// Get color for Sankey nodes based on application status
const getNodeColor = (status: string) => {
  // Darker colors that match our dark theme better
  switch(status) {
    case "Applied":
      return "#7DD3FC"; // sky-300
    case "Online Assessment":
      return "#93C5FD"; // blue-300
    case "Phone":
      return "#A5B4FC"; // indigo-300
    case "Behavioral":
      return "#D8B4FE"; // purple-300
    case "Technical":
      return "#A5B4FC"; // indigo-300
    case "Final":
      return "#A5B4FC"; // indigo-300
    case "Offer":
      return "#6EE7B7"; // emerald-300
    case "Rejected":
      return "#FCA5A5"; // red-300
    case "Ghosted":
      return "#FCD34D"; // amber-300
    case "Accepted":
      return "#6EE7B7"; // emerald-300
    case "Declined":
      return "#FCA5A5"; // red-300
    default:
      return "#9CA3AF"; // gray-400
  }
};

// Helper function to create a more detailed Sankey data with counts
const generateSankeyData = (applications: Application[]) => {
  if (applications.length === 0) {
    return { nodes: [], links: [] };
  }

  // Initialize stage counts with Applied equal to the total number of applications
  const stageCounts: Record<string, number> = {};
  
  // Count transitions between stages
  const stageTransitions: Record<string, Record<string, number>> = {};
  
  // Process each application to count stages and transitions
  applications.forEach(app => {
    if (app.timeline.length === 0) return;
    
    // Count each status that appears in timelines
    app.timeline.forEach((stage, index) => {
      // Initialize count for this status if it doesn't exist
      if (!stageCounts[stage.status]) {
        stageCounts[stage.status] = 0;
      }
      
      // Count each unique status once per application
      if (index === app.timeline.findIndex(s => s.status === stage.status)) {
        stageCounts[stage.status]++;
      }
      
      // Process transitions between stages
      if (index > 0) {
        const sourceStage = app.timeline[index - 1].status;
        const targetStage = stage.status;
        
        // Initialize source stage record if it doesn't exist
        if (!stageTransitions[sourceStage]) {
          stageTransitions[sourceStage] = {};
        }
        
        // Initialize or increment the transition count
        if (!stageTransitions[sourceStage][targetStage]) {
          stageTransitions[sourceStage][targetStage] = 1;
        } else {
          stageTransitions[sourceStage][targetStage]++;
        }
      }
    });
  });
  
  // Create nodes with counts
  const nodes = Object.entries(stageCounts).map(([stage, count]) => ({
    id: `${stage} (${count})`,
    nodeColor: getNodeColor(stage),
    originalId: stage
  }));
  
  // Create links with transition counts
  const links: { source: string; target: string; value: number; label: string }[] = [];
  
  Object.entries(stageTransitions).forEach(([source, targets]) => {
    Object.entries(targets).forEach(([target, value]) => {
      links.push({
        source: `${source} (${stageCounts[source] || 0})`,
        target: `${target} (${stageCounts[target] || 0})`,
        value,
        label: `${value}`
      });
    });
  });
  
  return { nodes, links };
};

export default function HomePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [open, setOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [loadingApplications, setLoadingApplications] = useState<Record<string, boolean>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<{open: boolean, appId: string, timelineIndex: number}>({
    open: false, 
    appId: "", 
    timelineIndex: -1
  });
  const [deleteAppConfirmOpen, setDeleteAppConfirmOpen] = useState<{open: boolean, appId: string}>({
    open: false,
    appId: ""
  });
  const [addStageOpen, setAddStageOpen] = useState<{open: boolean, appId: string}>({
    open: false,
    appId: ""
  });
  const [editStageOpen, setEditStageOpen] = useState<{
    open: boolean, 
    appId: string, 
    timelineIndex: number
  }>({
    open: false,
    appId: "",
    timelineIndex: -1
  });
  const [newStage, setNewStage] = useState<{
    status: ApplicationStatus,
    date: string
  }>({
    status: "Phone",
    date: new Date().toISOString().split('T')[0]
  });
  const [newApplication, setNewApplication] = useState({
    company: "",
    jobTitle: "Software Engineer", // Default job title
    location: "",
    dateApplied: new Date().toISOString().split('T')[0],
    currentStatus: "Applied" as ApplicationStatus,
    url: "" // New URL field
  });
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  
  // Load applications from localStorage on initial render
  useEffect(() => {
    const storedApplications = localStorage.getItem('jobTrackerApplications');
    if (storedApplications) {
      try {
        const parsedApplications = JSON.parse(storedApplications);
        if (Array.isArray(parsedApplications)) {
          setApplications(parsedApplications);
        } else {
          // If stored data is invalid, start with empty array
          setApplications([]);
        }
      } catch (error) {
        console.error("Error parsing stored applications:", error);
        setApplications([]);
      }
    } else {
      // If no data in localStorage, start with empty array
      setApplications([]);
    }
  }, []);
  
  // Save applications to localStorage whenever they change
  useEffect(() => {
    if (applications.length > 0) {
      localStorage.setItem('jobTrackerApplications', JSON.stringify(applications));
    }
  }, [applications]);
  
  // Function to export data as JSON file
  const exportData = () => {
    const dataStr = JSON.stringify(applications, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `job-applications-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Function to import data from JSON file
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files.length > 0) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = e => {
        if (e.target?.result) {
          try {
            const parsedData = JSON.parse(e.target.result as string);
            if (Array.isArray(parsedData)) {
              setApplications(parsedData);
            }
          } catch (error) {
            console.error("Error parsing imported file:", error);
            alert("Error importing data. Please make sure the file is valid JSON.");
          }
        }
      };
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewApplication(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Format date from YYYY-MM-DD to MM/DD/YY for storage
    const formatDateForStorage = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-');
      return `${month}/${day}/${year.slice(2)}`;
    };
    
    const newApp: Application = {
      id: crypto.randomUUID(),
      ...newApplication,
      timeline: [
        { status: "Applied" as ApplicationStatus, date: formatDateForStorage(newApplication.dateApplied) }
      ]
    };
    
    setApplications(prev => [newApp, ...prev]);
    setNewApplication({
      company: "",
      jobTitle: "Software Engineer", // Reset to default job title
      location: "",
      dateApplied: new Date().toISOString().split('T')[0],
      currentStatus: "Applied" as ApplicationStatus,
      url: "" // Reset URL
    });
    setOpen(false);
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const stats = {
    total: applications.length,
    applied: applications.filter(app => 
      app.timeline.some(stage => stage.status === "Applied")
    ).length,
    oas: applications.filter(app => 
      app.timeline.some(stage => stage.status === "Online Assessment")
    ).length,
    interviews: applications.filter(app => 
      app.timeline.some(stage => ["Phone", "Behavioral", "Technical", "Final"].includes(stage.status))
    ).length,
    offers: applications.filter(app => 
      app.timeline.some(stage => stage.status === "Offer")
    ).length,
    rejections: applications.filter(app => 
      app.timeline.some(stage => stage.status === "Rejected")
    ).length,
  };

  // Calculate percentages
  const getPercentage = (value: number) => {
    if (stats.total === 0) return "0%";
    return `${Math.round((value / stats.total) * 100)}%`;
  };

  // Format date from MM/DD/YY to Month Day, Year
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    
    // Handle both MM/DD/YY format and YYYY-MM-DD format
    let month, day, year;
    
    if (dateString.includes('/')) {
      // Handle MM/DD/YY format
      [month, day, year] = dateString.split('/').map(part => parseInt(part));
      // Add 2000 to get full year if it's a 2-digit year
      if (year < 100) year += 2000;
    } else if (dateString.includes('-')) {
      // Handle YYYY-MM-DD format
      const parts = dateString.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    } else {
      return dateString; // Unrecognized format, return as is
    }
    
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    // Check if month index is valid
    if (month < 1 || month > 12) return dateString;
    
    // Convert to Month DD, YYYY format
    return `${months[month - 1]} ${day}, ${year}`;
  };

  const handleDeleteStage = () => {
    if (deleteConfirmOpen.appId && deleteConfirmOpen.timelineIndex >= 0) {
      setApplications(prevApps => 
        prevApps.map(app => {
          if (app.id === deleteConfirmOpen.appId) {
            // Don't allow deleting if it's the only entry or the first "Applied" entry
            if (app.timeline.length <= 1 || deleteConfirmOpen.timelineIndex === 0) {
              return app;
            }
            
            const newTimeline = app.timeline.filter((_, index) => index !== deleteConfirmOpen.timelineIndex);
            const newCurrentStatus = newTimeline[newTimeline.length - 1].status;
            
            return {
              ...app,
              timeline: newTimeline,
              currentStatus: newCurrentStatus
            };
          }
          return app;
        })
      );
      setDeleteConfirmOpen({open: false, appId: "", timelineIndex: -1});
    }
  };

  const handleDeleteApplication = () => {
    if (deleteAppConfirmOpen.appId) {
      setApplications(prevApps => 
        prevApps.filter(app => app.id !== deleteAppConfirmOpen.appId)
      );
      setDeleteAppConfirmOpen({open: false, appId: ""});
      
      // Close expanded row if it was open
      setExpandedRows(prev => {
        const newExpandedRows = {...prev};
        delete newExpandedRows[deleteAppConfirmOpen.appId];
        return newExpandedRows;
      });
    }
  };

  const handleAddStage = () => {
    if (addStageOpen.appId) {
      // Format date from YYYY-MM-DD to MM/DD/YY for storage
      const formatDateForStorage = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}/${year.slice(2)}`;
      };
      
      setApplications(prevApps => 
        prevApps.map(app => {
          if (app.id === addStageOpen.appId) {
            // Format date to MM/DD/YY for storage
            const formattedDate = formatDateForStorage(newStage.date);
            
            const newTimeline = [...app.timeline, {
              status: newStage.status,
              date: formattedDate
            }];
            
            return {
              ...app,
              timeline: newTimeline,
              currentStatus: newStage.status
            };
          }
          return app;
        })
      );
      setAddStageOpen({open: false, appId: ""});
      setNewStage({
        status: "Phone",
        date: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleEditStage = () => {
    if (editStageOpen.appId && editStageOpen.timelineIndex >= 0) {
      // Format date from YYYY-MM-DD to MM/DD/YY for storage
      const formatDateForStorage = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${month}/${day}/${year.slice(2)}`;
      };
      
      setApplications(prevApps => 
        prevApps.map(app => {
          if (app.id === editStageOpen.appId) {
            const newTimeline = [...app.timeline];
            // Format date to MM/DD/YY for storage
            const formattedDate = formatDateForStorage(newStage.date);
            
            newTimeline[editStageOpen.timelineIndex] = {
              status: newStage.status,
              date: formattedDate
            };
            
            // Update current status if the last timeline item was edited
            const isLastItem = editStageOpen.timelineIndex === app.timeline.length - 1;
            
            return {
              ...app,
              timeline: newTimeline,
              currentStatus: isLastItem ? newStage.status : app.currentStatus
            };
          }
          return app;
        })
      );
      setEditStageOpen({open: false, appId: "", timelineIndex: -1});
      setNewStage({
        status: "Phone",
        date: new Date().toISOString().split('T')[0]
      });
    }
  };

  // Generate Sankey data from applications
  const sankeyData = generateSankeyData(applications);

  return (
    <div className="w-full max-w-[1400px] mx-auto py-6 px-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">2026 Software Engineer Applications</h1>
        <div className="flex items-center space-x-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">+ Add Application</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Application</DialogTitle>
                <DialogDescription>
                  Enter the details of your job application
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="company" className="text-right text-sm font-medium">
                      Company
                    </label>
                    <input
                      id="company"
                      name="company"
                      value={newApplication.company}
                      onChange={handleChange}
                      className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="jobTitle" className="text-right text-sm font-medium">
                      Job Title
                    </label>
                    <input
                      id="jobTitle"
                      name="jobTitle"
                      value={newApplication.jobTitle}
                      onChange={handleChange}
                      className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="location" className="text-right text-sm font-medium">
                      Location
                    </label>
                    <input
                      id="location"
                      name="location"
                      value={newApplication.location}
                      onChange={handleChange}
                      className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="dateApplied" className="text-right text-sm font-medium">
                      Date Applied
                    </label>
                    <input
                      id="dateApplied"
                      name="dateApplied"
                      type="date"
                      value={newApplication.dateApplied}
                      onChange={handleChange}
                      className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <label htmlFor="url" className="text-right text-sm font-medium">
                      URL
                    </label>
                    <input
                      id="url"
                      name="url"
                      type="url"
                      value={newApplication.url}
                      onChange={handleChange}
                      className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="https://example.com/job"
                    />
                  </div>
                </div>
                <DialogFooter className="flex flex-row justify-between items-center">
                  <div className="mr-auto">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!newApplication.url || isAutofilling}
                      onClick={async () => {
                        setIsAutofilling(true);
                        setAutofillError(null);
                        
                        // Create a temporary ID for the loading state
                        const tempId = crypto.randomUUID();
                        
                        // Add a placeholder application immediately
                        const placeholderApp: Application = {
                          id: tempId,
                          company: "",
                          jobTitle: "Loading...",
                          location: "",
                          dateApplied: newApplication.dateApplied,
                          currentStatus: "Applied",
                          url: newApplication.url, // Add URL to placeholder
                          timeline: [
                            { status: "Applied", date: formatDateForStorage(newApplication.dateApplied) }
                          ]
                        };
                        
                        setApplications(prev => [placeholderApp, ...prev]);
                        setLoadingApplications(prev => ({ ...prev, [tempId]: true }));
                        
                        // Close the dialog immediately
                        setOpen(false);
                        
                        try {
                          const res = await fetch("/api/fetch-job-info", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: newApplication.url }),
                          });
                          const data = await res.json();
                          
                          if (data.company || data.jobTitle || data.location) {
                            // Update the placeholder with real data
                            setApplications(prev => prev.map(app => 
                              app.id === tempId ? {
                                ...app,
                                company: data.company || "",
                                jobTitle: data.jobTitle || "Software Engineer",
                                location: data.location || "",
                                url: newApplication.url // Keep the URL
                              } : app
                            ));
                          } else {
                            // Remove the placeholder if no data was found
                            setApplications(prev => prev.filter(app => app.id !== tempId));
                            setAutofillError("Could not extract job info from the posting.");
                          }
                        } catch (e: unknown) {
                          // Remove the placeholder on error
                          setApplications(prev => prev.filter(app => app.id !== tempId));
                          setAutofillError(e instanceof Error ? e.message : "Failed to fetch or extract job info.");
                        } finally {
                          setIsAutofilling(false);
                          setLoadingApplications(prev => ({ ...prev, [tempId]: false }));
                          setNewApplication({
                            company: "",
                            jobTitle: "Software Engineer",
                            location: "",
                            dateApplied: new Date().toISOString().split('T')[0],
                            currentStatus: "Applied" as ApplicationStatus,
                            url: ""
                          });
                        }
                      }}
                    >
                      {isAutofilling ? "Loading..." : "Autofill & Add"}
                    </Button>
                    {autofillError && (
                      <div className="text-xs text-red-500 mt-2">{autofillError}</div>
                    )}
                  </div>
                  <Button type="submit">Add Application</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          {/* Data Export/Import buttons */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={exportData} 
            title="Export your application data as JSON"
          >
            Export
          </Button>
          
          <div className="relative">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => document.getElementById('file-upload')?.click()}
              title="Import application data from JSON file"
            >
              Import
            </Button>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm mb-6">NG and Intern Applications for 2026</p>

      {/* Stats in a single row */}
      <div className="grid grid-cols-5 gap-8 mb-8">
        <div className="px-6 py-4 border rounded-md shadow-sm text-center">
          <div className="text-lg font-semibold text-blue-600">{stats.total}</div>
          <div className="text-xs font-medium text-gray-600">Total Applications</div>
        </div>
        <div className="px-6 py-4 border rounded-md shadow-sm text-center">
          <div className="text-lg font-semibold text-amber-600">{stats.oas}</div>
          <div className="text-xs font-medium text-gray-600">OAs <span className="text-muted-foreground">({getPercentage(stats.oas)})</span></div>
        </div>
        <div className="px-6 py-4 border rounded-md shadow-sm text-center">
          <div className="text-lg font-semibold text-indigo-600">{stats.interviews}</div>
          <div className="text-xs font-medium text-gray-600">Interviews <span className="text-muted-foreground">({getPercentage(stats.interviews)})</span></div>
        </div>
        <div className="px-6 py-4 border rounded-md shadow-sm text-center">
          <div className="text-lg font-semibold text-emerald-600">{stats.offers}</div>
          <div className="text-xs font-medium text-gray-600">Offers</div>
        </div>
        <div className="px-6 py-4 border rounded-md shadow-sm text-center">
          <div className="text-lg font-semibold text-red-600">{stats.rejections}</div>
          <div className="text-xs font-medium text-gray-600">Rejections</div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-2">Applications</h2>
      <p className="text-xs text-muted-foreground mb-4">Job application timeline</p>

      {/* Expandable Applications Table */}
      <div className="overflow-x-auto border rounded-md shadow-sm">
        <Table className="w-full border-collapse">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-14 p-3 border"></TableHead>
              <TableHead className="font-medium text-xs p-3 border">Company</TableHead>
              <TableHead className="font-medium text-xs p-3 border">Job Title</TableHead>
              <TableHead className="font-medium text-xs p-3 border">Location</TableHead>
              <TableHead className="font-medium text-xs p-3 border">Date Applied</TableHead>
              <TableHead className="font-medium text-xs p-3 border">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <React.Fragment key={app.id}>
                <TableRow 
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => toggleRowExpansion(app.id)}
                >
                  <TableCell className="p-3 border">
                    {expandedRows[app.id] ? 
                      <ChevronDown className="h-5 w-5" /> : 
                      <ChevronRight className="h-5 w-5" />}
                  </TableCell>
                  <TableCell className="text-sm p-3 border truncate">
                    {loadingApplications[app.id] ? (
                      <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    ) : (
                      app.company
                    )}
                  </TableCell>
                  <TableCell className="text-sm p-3 border truncate">
                    {loadingApplications[app.id] ? (
                      <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                    ) : (
                      app.url ? (
                        <a 
                          href={app.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {app.jobTitle}
                        </a>
                      ) : (
                        app.jobTitle
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-sm p-3 border truncate">
                    {loadingApplications[app.id] ? (
                      <div className="h-4 bg-muted animate-pulse rounded w-20"></div>
                    ) : (
                      app.location
                    )}
                  </TableCell>
                  <TableCell className="text-sm p-3 border">
                    {loadingApplications[app.id] ? (
                      <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    ) : (
                      formatDate(app.dateApplied)
                    )}
                  </TableCell>
                  <TableCell className="text-sm p-3 border">
                    {loadingApplications[app.id] ? (
                      <div className="h-6 bg-muted animate-pulse rounded w-20"></div>
                    ) : (
                      <span 
                        className={`px-3 py-1.5 rounded-md ${getStatusClass(app.currentStatus)}`}
                      >
                        {app.currentStatus}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
                
                {/* Expandable timeline row */}
                {expandedRows[app.id] && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0 border">
                      <div className="p-6 bg-muted/10">
                        <div className="flex items-center flex-wrap justify-between mb-4">
                          <h3 className="text-sm font-medium">Application Timeline</h3>
                          
                          {/* Delete Application button */}
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteAppConfirmOpen({
                                open: true,
                                appId: app.id
                              });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete Application
                          </Button>
                        </div>
                        <div className="flex items-center flex-wrap justify-between">
                          <div className="flex items-center flex-wrap mr-4">
                            {app.timeline.map((event, index) => (
                              <div key={index} className="flex items-center mb-2">
                                <div 
                                  className={`relative px-5 py-3 rounded-md shadow-sm border group ${getStatusClass(event.status)}`}
                                >
                                  <div className="font-semibold text-sm">{event.status}</div>
                                  <div className="text-xs mt-1">{formatDate(event.date)}</div>
                                  
                                  {/* Edit/Delete controls that appear on hover */}
                                  <div className="absolute right-1 top-1 hidden group-hover:flex space-x-1 bg-white/60 dark:bg-slate-800/50 p-0.5 rounded">
                                    <button 
                                      className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const formattedDate = event.date.split('/');
                                        // Convert MM/DD/YY to YYYY-MM-DD for date input
                                        const isoDate = `20${formattedDate[2]}-${formattedDate[0].padStart(2, '0')}-${formattedDate[1].padStart(2, '0')}`;
                                        setNewStage({
                                          status: event.status,
                                          date: isoDate
                                        });
                                        setEditStageOpen({
                                          open: true,
                                          appId: app.id,
                                          timelineIndex: index
                                        });
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                                    </button>
                                    
                                    {index !== 0 && (
                                      <button 
                                        className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirmOpen({
                                            open: true,
                                            appId: app.id,
                                            timelineIndex: index
                                          });
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {index < app.timeline.length - 1 && (
                                  <div className="mx-4 flex items-center">
                                    <div className="h-[2px] w-4 bg-muted-foreground/30"></div>
                                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                                    <div className="h-[2px] w-4 bg-muted-foreground/30"></div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Add Stage button - moved to the right */}
                          <button
                            className="flex items-center space-x-1 px-3 py-2 rounded-md border border-dashed border-muted-foreground/50 text-sm text-muted-foreground hover:bg-muted/50 transition-colors ml-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAddStageOpen({
                                open: true,
                                appId: app.id
                              });
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Stage</span>
                          </button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Sankey Diagram */}
      <div className="mt-12 mb-16">
        <h2 className="text-lg font-semibold mb-2">Application Flow</h2>
        <p className="text-xs text-muted-foreground mb-4">Visualization of your application journey stages</p>
        
        <div className="h-[600px] border rounded-md bg-card p-4">
          {sankeyData.nodes.length > 0 && sankeyData.links.length > 0 ? (
            <ResponsiveSankey
              data={sankeyData}
              margin={{ top: 50, right: 160, bottom: 50, left: 120 }}
              align="justify"
              colors={(node) => node.nodeColor || "#9CA3AF"}
              nodeOpacity={0.8}
              nodeHoverOpacity={1}
              nodeThickness={20}
              nodeSpacing={24}
              nodeBorderWidth={1}
              nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
              nodeBorderRadius={3}
              linkOpacity={0.3}
              linkHoverOpacity={0.7}
              linkContract={3}
              enableLinkGradient={true}
              labelPosition="outside"
              labelPadding={8}
              labelTextColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              animate={true}
              motionConfig="gentle"
              nodeTooltip={({ node }) => (
                <div style={{ 
                  background: 'rgba(30, 41, 59, 0.9)', 
                  color: 'white', 
                  padding: '9px 12px', 
                  border: '1px solid #475569', 
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                }}>
                  <strong>{node.id as string}</strong>
                </div>
              )}
              linkTooltip={({ link }) => (
                <div style={{ 
                  background: 'rgba(30, 41, 59, 0.9)', 
                  color: 'white', 
                  padding: '9px 12px', 
                  border: '1px solid #475569', 
                  borderRadius: '4px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                }}>
                  <strong>{link.source.id} → {link.target.id}: {link.value}</strong>
                </div>
              )}
              legends={[]}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Not enough application data to generate flow diagram
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="mt-12 mb-16">
        <h2 className="text-lg font-semibold mb-2">Application Timeline</h2>
        <p className="text-xs text-muted-foreground mb-4">Chronological view of all applications and their stages</p>
        
        <div className="border rounded-md bg-card p-6 overflow-x-auto">
          {applications.length > 0 ? (
            <TimelineVisualization applications={applications} />
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              No application data to display
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen.open} onOpenChange={(open) => setDeleteConfirmOpen(prev => ({...prev, open}))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this application stage? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen({open: false, appId: "", timelineIndex: -1})}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStage}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Stage Dialog */}
      <Dialog open={addStageOpen.open} onOpenChange={(open) => setAddStageOpen(prev => ({...prev, open}))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Stage</DialogTitle>
            <DialogDescription>
              Update the application status by adding a new stage to the timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="status" className="text-right text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                value={newStage.status}
                onChange={(e) => setNewStage(prev => ({...prev, status: e.target.value as ApplicationStatus}))}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Applied">Applied</option>
                <option value="Online Assessment">Online Assessment</option>
                <option value="Phone">Phone</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Technical">Technical</option>
                <option value="Final">Final</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
                <option value="Accepted">Accepted</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="date" className="text-right text-sm font-medium">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={newStage.date}
                onChange={(e) => setNewStage(prev => ({...prev, date: e.target.value}))}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStageOpen({open: false, appId: ""})}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddStage}>
              Add Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Stage Dialog */}
      <Dialog open={editStageOpen.open} onOpenChange={(open) => setEditStageOpen(prev => ({...prev, open}))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
            <DialogDescription>
              Update the details of this application stage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="editStatus" className="text-right text-sm font-medium">
                Status
              </label>
              <select
                id="editStatus"
                value={newStage.status}
                onChange={(e) => setNewStage(prev => ({...prev, status: e.target.value as ApplicationStatus}))}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Applied">Applied</option>
                <option value="Online Assessment">Online Assessment</option>
                <option value="Phone">Phone</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Technical">Technical</option>
                <option value="Final">Final</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
                <option value="Accepted">Accepted</option>
                <option value="Declined">Declined</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="editDate" className="text-right text-sm font-medium">
                Date
              </label>
              <input
                id="editDate"
                type="date"
                value={newStage.date}
                onChange={(e) => setNewStage(prev => ({...prev, date: e.target.value}))}
                className="col-span-3 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStageOpen({open: false, appId: "", timelineIndex: -1})}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleEditStage}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Application Dialog */}
      <Dialog open={deleteAppConfirmOpen.open} onOpenChange={(open) => setDeleteAppConfirmOpen(prev => ({...prev, open}))}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entire application? This action cannot be undone and will remove all timeline data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAppConfirmOpen({open: false, appId: ""})}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteApplication}>
              Delete Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 