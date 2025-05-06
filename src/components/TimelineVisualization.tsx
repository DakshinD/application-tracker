import React, { useEffect, useState } from 'react';

// Define application status types (copied from main page)
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

// Application interface (copied from main page)
interface Application {
  id: string;
  company: string;
  jobTitle: string;
  location: string;
  dateApplied: string;
  currentStatus: ApplicationStatus;
  url?: string;
  timeline: {
    status: ApplicationStatus;
    date: string;
  }[];
}

interface TimelineEvent {
  id: string;
  company: string;
  status: ApplicationStatus;
  date: Date;
  formattedDate: string;
  column: number; // Which month column it belongs to
  label: string; // Display label 
}

interface TimelineVisualizationProps {
  applications: Application[];
}

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

// Format date string to a consistent Month DD format (without year)
const formatDisplayDate = (dateString: string) => {
  if (!dateString) return "";
  
  // Handle MM/DD/YY format
  const [month, day] = dateString.split('/').map(part => parseInt(part));
  
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  // Check if month index is valid
  if (month < 1 || month > 12) return dateString;
  
  // Return just Month DD format
  return `${months[month - 1]} ${day}`;
};

// Get abbreviated status label
const getStatusLabel = (status: ApplicationStatus): string => {
  switch(status) {
    case "Applied":
      return "Applied";
    case "Online Assessment":
      return "OA";
    case "Phone":
      return "Phone";
    case "Behavioral":
      return "Behavioral";
    case "Technical":
      return "Technical";
    case "Final":
      return "Final";
    case "Offer":
      return "Offer";
    case "Rejected":
      return "Rejected";
    case "Accepted":
      return "Accepted";
    case "Declined":
      return "Declined";
    case "Ghosted":
      return "Ghosted";
    default:
      return status;
  }
};

// Get letter for status badge
const getStatusLetter = (status: ApplicationStatus): string => {
  switch(status) {
    case "Applied":
      return "A";
    case "Online Assessment":
      return "O";
    case "Phone":
      return "P";
    case "Behavioral":
      return "B";
    case "Technical":
      return "T";
    case "Final":
      return "F";
    case "Offer":
      return "O";
    case "Rejected":
      return "R";
    case "Accepted":
      return "A";
    case "Declined":
      return "D";
    case "Ghosted":
      return "G";
    default:
      return "?";
  }
};

export const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({ applications }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [monthColumns, setMonthColumns] = useState<string[]>([]);
  
  // Process applications into timeline events
  useEffect(() => {
    if (!applications.length) return;
    
    const allEvents: TimelineEvent[] = [];
    const monthsSet = new Set<string>();
    
    applications.forEach(app => {
      app.timeline.forEach(event => {
        // Parse MM/DD/YY format
        const [month, day, year] = event.date.split('/').map(n => parseInt(n));
        const date = new Date(2000 + year, month - 1, day);
        
        // Create month-year string for column (e.g., "May 2024")
        const monthYearStr = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        monthsSet.add(monthYearStr);
        
        allEvents.push({
          id: `${app.id}-${event.status}-${event.date}`,
          company: app.company,
          status: event.status,
          date,
          formattedDate: formatDisplayDate(event.date),
          column: 0, // Will be set after sorting months
          label: getStatusLabel(event.status)
        });
      });
    });
    
    // Create sorted array of month-year strings
    const sortedMonths = Array.from(monthsSet).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Assign column numbers to events
    allEvents.forEach(event => {
      const monthYearStr = `${event.date.toLocaleString('default', { month: 'long' })} ${event.date.getFullYear()}`;
      event.column = sortedMonths.indexOf(monthYearStr);
    });
    
    setMonthColumns(sortedMonths);
    setEvents(allEvents);
  }, [applications]);
  
  // Group events by company
  const getCompanyRows = () => {
    const companies = Array.from(new Set(applications.map(app => app.company)));
    return companies.sort();
  };
  
  // Get events for a specific company
  const getCompanyEvents = (company: string) => {
    return events
      .filter(event => event.company === company)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };
  
  const companyRows = getCompanyRows();
  
  return (
    <div className="w-full">
      {/* Month columns header */}
      <div className="grid border-b border-gray-200 dark:border-gray-700 mb-4" 
           style={{ gridTemplateColumns: `180px repeat(${monthColumns.length}, 1fr)` }}>
        <div className="p-3"></div>
        {monthColumns.map((month, idx) => (
          <div key={idx} className="p-3 text-center font-medium">
            {month}
          </div>
        ))}
      </div>
      
      {/* Company rows */}
      <div className="space-y-8">
        {companyRows.map(company => {
          const companyEvents = getCompanyEvents(company);
          
          return (
            <div key={company} className="relative">
              {/* Grid layout for consistent column alignment */}
              <div className="grid items-center" 
                   style={{ gridTemplateColumns: `180px repeat(${monthColumns.length}, 1fr)` }}>
                {/* Company name */}
                <div className="px-3 py-2 font-medium">
                  {company}
                </div>
                
                {/* Column placeholders - will be positioned absolutely for proper timeline */}
                {monthColumns.map((_, idx) => (
                  <div key={idx} className="h-24 border-l border-dashed border-gray-200 dark:border-gray-700"></div>
                ))}
              </div>
              
              {/* Timeline events */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="relative h-full ml-[180px]">
                  {/* Connecting line */}
                  {companyEvents.length > 1 && (() => {
                    // Get first and last event
                    const firstEvent = companyEvents[0];
                    const lastEvent = companyEvents[companyEvents.length - 1];
                    
                    // Calculate column width percentage
                    const columnWidth = 100 / monthColumns.length;
                    
                    // Calculate start position (center of first event's column)
                    const startPos = (firstEvent.column * columnWidth) + (columnWidth / 2);
                    
                    // Calculate end position (center of last event's column)
                    const endPos = (lastEvent.column * columnWidth) + (columnWidth / 2);
                    
                    // Calculate width between centers
                    const lineWidth = endPos - startPos;
                    
                    return (
                      <div className="absolute top-[28px] h-0.5 bg-gray-200 dark:bg-gray-700"
                           style={{
                             left: `${startPos}%`,
                             width: `${lineWidth}%`
                           }}
                      ></div>
                    );
                  })()}
                  
                  {/* Process events by column */}
                  {monthColumns.map((month, monthIdx) => {
                    // Find all events for this company in this column/month
                    const monthEvents = companyEvents.filter(e => e.column === monthIdx);
                    
                    // Sort events by date within the month (oldest first for drawing order)
                    const sortedMonthEvents = [...monthEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
                    
                    // Calculate position as percentage of total width
                    const position = (monthIdx * 100) / monthColumns.length;
                    // Add offset to center in column
                    const columnWidth = 100 / monthColumns.length;
                    const basePosition = position + (columnWidth / 2);
                    
                    return (
                      <React.Fragment key={`month-${monthIdx}`}>
                        {sortedMonthEvents.map((event, eventIdx) => {
                          // Position events with substantial overlap
                          // Newer events on the right, older events on the left
                          // We're using the natural order from oldest to newest for display
                          const horizontalOffset = eventIdx * 1.5; // 15px offset to the right for newer events
                          const adjustedPosition = basePosition + horizontalOffset;
                          
                          // Only show label on the newest (last drawn) event in the month
                          const showLabel = eventIdx === sortedMonthEvents.length - 1;
                          
                          // Adjust z-index so newer events appear on top of older ones
                          const zIndex = 10 + eventIdx;
                          
                          return (
                            <div 
                              key={event.id} 
                              className="absolute top-[20px] flex flex-col items-center"
                              style={{ 
                                left: `${adjustedPosition}%`, 
                                transform: 'translateX(-50%)',
                                zIndex: zIndex
                              }}
                            >
                              {/* Event dot */}
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs shadow-sm border-2 ${getStatusClass(event.status)}`}
                              >
                                {getStatusLetter(event.status)}
                              </div>
                              
                              {/* Event label - only on newest event */}
                              {showLabel && (
                                <div className="mt-2 text-xs text-center max-w-[80px]">
                                  {event.label}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 