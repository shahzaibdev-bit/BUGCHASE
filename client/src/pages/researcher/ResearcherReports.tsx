import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar as CalendarIcon, Activity, Circle, Archive, AtSign, Filter, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { API_URL } from '@/config';

// --- Data ---
// --- Data ---
// Removed dummy data

const tabs = [
  { id: 'submitted', label: 'Submitted' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'deleted', label: 'Deleted' },
];

// --- Components ---

const SeverityBadge = ({ severity }: { severity: string }) => {
  if (severity === 'Critical') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-pink-500/10 text-pink-500 border border-pink-500/20">
        Critical
      </span>
    );
  }
  if (severity === 'High') {
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
          High
        </span>
    );
  }
  if (severity === 'Medium') {
      return (
          <span className="inline-flex items-center px-2 py-0.5 rounded textxs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            Medium
          </span>
      );
  }
  return <span className="text-zinc-500 text-xs">{severity}</span>;
};

export default function ResearcherReports() {
  const navigate = useNavigate();
  // --- State ---
  const [activeTab, setActiveTab] = useState('submitted');
  const [searchQuery, setSearchQuery] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${API_URL}/reports`, {
            headers,
            credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
            // Map backend data to frontend structure if needed, or stick to backend structure if compatible
            // Backend returns: { results: n, data: [...] }
            setReports(data.data); 
        }
      } catch (err) {
        console.error('Failed to fetch reports', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // --- Filtering Logic ---
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // 1. Tab Filter (Assume backend has 'status', map to tabs)
      // Submitted: everything not draft/deleted
      // Drafts: status === 'Draft' (if we support drafts later)
      // Deleted: status === 'Deleted'
      if (activeTab === 'submitted' && (report.status === 'Draft' || report.status === 'Deleted')) return false;
      if (activeTab === 'drafts' && report.status !== 'Draft') return false;
      if (activeTab === 'deleted' && report.status !== 'Deleted') return false;

      // 2. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          report.title.toLowerCase().includes(query) ||
          report._id.toLowerCase().includes(query) ||
          (report.programId && report.programId.toString().toLowerCase().includes(query)) // or program name if populated
        );
        if (!matchesSearch) return false;
      }

      // 3. Severity Filter
      if (severityFilter && report.severity !== severityFilter) return false;

      // 4. Status Filter
      if (statusFilter && report.status !== statusFilter) return false;

      // 5. Date Filter (Check if same day)
      if (dateFilter) {
          const reportDate = new Date(report.createdAt);
          if (
              reportDate.getDate() !== dateFilter.getDate() ||
              reportDate.getMonth() !== dateFilter.getMonth() ||
              reportDate.getFullYear() !== dateFilter.getFullYear()
          ) {
              return false;
          }
      }

      return true;
    });
  }, [reports, activeTab, searchQuery, severityFilter, statusFilter, dateFilter]);

  // Counts for tabs
  const getCount = (tabId: string) => {
      if (tabId === 'submitted') return reports.filter(r => r.status !== 'Draft' && r.status !== 'Deleted').length;
      if (tabId === 'drafts') return reports.filter(r => r.status === 'Draft').length;
      if (tabId === 'deleted') return reports.filter(r => r.status === 'Deleted').length;
      return 0;
  };

  return (
    <div className="relative z-10 p-8 pt-6 min-h-screen text-zinc-900 dark:text-zinc-100 font-sans">
      
      {/* 1. Header & Tabs */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-6 font-mono text-zinc-900 dark:text-white">My Reports</h1>
        
        <div className="flex items-center gap-8 border-b border-zinc-200 dark:border-zinc-800">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
                <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                    "pb-3 text-sm font-medium transition-all relative",
                    isActive 
                    ? "text-black dark:text-white" 
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                )}
                >
                {tab.label}
                <span className="ml-1.5 text-[10px] align-top opacity-60">{getCount(tab.id)}</span>
                {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-emerald-500 shadow-none dark:shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                )}
                </button>
            );
          })}
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between p-2 mb-6 border rounded-lg backdrop-blur-md transition-colors border-zinc-300 bg-white/80 dark:border-zinc-800 dark:bg-zinc-900/40 gap-4 md:gap-0">
        
        {/* Left: Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 w-full md:w-auto">
          
           {/* Date Filter */}
           <Popover>
               <PopoverTrigger asChild>
                    <button 
                        className={cn(
                            "px-3 py-1.5 text-xs font-mono border rounded transition-colors flex items-center gap-2 group whitespace-nowrap",
                            dateFilter 
                                ? "bg-black text-white border-black dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/50" 
                                : "text-zinc-700 border-zinc-400 bg-transparent hover:border-zinc-800 hover:text-black dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <CalendarIcon className="w-3 h-3 text-zinc-600 dark:text-current dark:opacity-70" />
                        <span>{dateFilter ? format(dateFilter, "PPP") : "Date"}</span>
                        {dateFilter && (
                            <div 
                                onClick={(e) => { e.stopPropagation(); setDateFilter(undefined); }}
                                className="hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full p-0.5 ml-1 transition-colors"
                            >
                                <X className="w-2 h-2" />
                            </div>
                        )}
                    </button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0" align="start">
                   <Calendar
                        mode="single"
                        selected={dateFilter}
                        onSelect={setDateFilter}
                        initialFocus
                   />
               </PopoverContent>
           </Popover>

            {/* Severity Dropdown */}
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button 
                        className={cn(
                            "px-3 py-1.5 text-xs font-mono border rounded transition-colors flex items-center gap-2 group whitespace-nowrap",
                            severityFilter 
                                ? "bg-black text-white border-black dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/50" 
                                : "text-zinc-700 border-zinc-400 bg-transparent hover:border-zinc-800 hover:text-black dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <Activity className="w-3 h-3 text-zinc-600 dark:text-current dark:opacity-70" />
                        <span>{severityFilter || 'Severity'}</span>
                        <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                    <DropdownMenuItem onClick={() => setSeverityFilter(null)} className="text-sm font-mono cursor-pointer">
                        All Severities
                    </DropdownMenuItem>
                    {['Critical', 'High', 'Medium', 'Low'].map((sev) => (
                        <DropdownMenuItem 
                            key={sev} 
                            onClick={() => setSeverityFilter(sev === severityFilter ? null : sev)}
                            className="text-sm font-mono cursor-pointer justify-between"
                        >
                            {sev}
                            {severityFilter === sev && <Check className="w-3 h-3 text-emerald-500" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Status Dropdown */}
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button 
                         className={cn(
                            "px-3 py-1.5 text-xs font-mono border rounded transition-colors flex items-center gap-2 group whitespace-nowrap",
                            statusFilter 
                                ? "bg-black text-white border-black dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/50" 
                                : "text-zinc-700 border-zinc-400 bg-transparent hover:border-zinc-800 hover:text-black dark:text-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
                        )}
                    >
                        <Archive className="w-3 h-3 text-zinc-600 dark:text-current dark:opacity-70" />
                        <span>{statusFilter || 'Status'}</span>
                        <ChevronDown className="w-3 h-3 opacity-50 ml-1" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                     <DropdownMenuItem onClick={() => setStatusFilter(null)} className="text-sm font-mono cursor-pointer">
                        All Statuses
                    </DropdownMenuItem>
                    {['Closed', 'Triaged', 'Draft', 'Deleted'].map((status) => (
                        <DropdownMenuItem 
                            key={status} 
                            onClick={() => setStatusFilter(status === statusFilter ? null : status)}
                            className="text-sm font-mono cursor-pointer justify-between"
                        >
                            {status}
                            {statusFilter === status && <Check className="w-3 h-3 text-emerald-500" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

             {/* Company (Mock) */}
             <button className="px-3 py-1.5 text-xs font-mono border rounded hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors flex items-center gap-2 group whitespace-nowrap text-zinc-700 border-zinc-400 bg-transparent hover:border-zinc-800 hover:text-black dark:text-zinc-400 dark:border-zinc-700 dark:bg-transparent">
                <AtSign className="w-3 h-3 text-zinc-600 dark:text-current dark:opacity-70" />
                <span>Submitted to</span>
            </button>
        </div>

        {/* Right: Search */}
        <div className="relative flex items-center px-0 md:px-2 md:ml-4 shrink-0 w-full md:w-auto">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID or name..." 
            className="bg-transparent border-none outline-none text-sm w-full md:w-48 sm:w-64 text-left md:text-right pr-8 placeholder:text-zinc-500 text-black dark:text-zinc-100 dark:placeholder:text-zinc-400 focus:ring-0"
          />
          <Search className="w-4 h-4 text-zinc-600 dark:text-zinc-400 absolute right-2 pointer-events-none" />
        </div>
      </div>

      {/* 3. Data View - Mobile Cards (Visible only on mobile) */}
      <div className="space-y-4 md:hidden">
        {filteredReports.map((report) => (
          <div 
            key={report.id}
            onClick={() => navigate(`/researcher/reports/${report._id}`)}
            className="p-4 rounded-lg border bg-white/40 border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800/50 backdrop-blur-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{report._id.substring(report._id.length - 6)}</span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded border bg-transparent text-zinc-600 border-zinc-300 dark:text-zinc-400 dark:border-zinc-700">
                {report.status}
              </span>
            </div>
            
            <h3 className="font-bold text-lg text-zinc-900 dark:text-white mb-1 leading-tight">{report.title}</h3>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold uppercase bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-white">
                 {(report.assets?.[0] || '?').charAt(0)}
              </div>
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{report.assets?.[0] || 'Unknown'}</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">{format(new Date(report.createdAt), 'dd.MM')}</span>
                <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <SeverityBadge severity={report.severity} />
              </div>
              <span className="font-mono text-sm font-medium text-zinc-900 dark:text-white">
                {report.bounty > 0 ? `$${report.bounty}` : '-'}
              </span>
            </div>
          </div>
        ))}
         {filteredReports.length === 0 && (
             <div className="text-center py-10 text-zinc-500 font-mono text-sm">
                 No reports found for "{activeTab}"
             </div>
         )}
      </div>

      {/* 3. Data View - Desktop Table (Hidden on mobile) */}
      <div className="hidden md:block w-full overflow-hidden border rounded-lg backdrop-blur-sm border-zinc-200 bg-white/40 dark:border-zinc-800/50 dark:bg-zinc-900/20">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-3 px-4 text-[10px] uppercase font-mono tracking-widest font-medium text-zinc-500">ID</th>
              <th className="py-3 px-4 text-[10px] uppercase font-mono tracking-widest font-medium text-zinc-500">Name</th>
              <th className="py-3 px-4 text-[10px] uppercase font-mono tracking-widest font-medium text-zinc-500">Created on</th>
              <th className="py-3 px-4 text-[10px] uppercase font-mono tracking-widest font-medium text-zinc-500">Submitted to</th>
              <th className="py-3 px-4 text-[10px] uppercase font-mono tracking-widest font-medium text-zinc-500">Severity</th>
              <th className="py-3 px-4 text-[10px] uppercase font-mono tracking-widest font-medium text-zinc-500">Bounty</th>
              <th className="py-3 px-4 text-[10px] uppercase font-mono tracking-widest font-medium text-zinc-500 text-right">State</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report) => (
              <tr 
                key={report.id} 
                onClick={() => navigate(`/researcher/reports/${report._id}`)}
                className="group transition-colors cursor-pointer border-b last:border-0 border-zinc-100 hover:bg-black/5 dark:border-zinc-800/50 dark:hover:bg-white/5"
              >
                <td className="py-3 px-4 font-mono text-sm text-zinc-500 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                  {report._id.substring(report._id.length - 6)}
                </td>
                <td className="py-3 px-4 font-medium text-sm text-zinc-900 dark:text-white">
                  {report.title}
                </td>
                <td className="py-3 px-4 font-mono text-xs text-zinc-500">
                  {format(new Date(report.createdAt), 'dd.MM.yyyy')}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                     {/* Placeholder Logo */}
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold uppercase bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-white">
                      {(report.assets?.[0] || '?').charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{report.assets?.[0] || 'Unknown Target'}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm">
                  <SeverityBadge severity={report.severity} />
                </td>
                <td className="py-3 px-4 font-mono text-sm text-zinc-600 dark:text-zinc-300">
                  {report.bounty > 0 ? `$${report.bounty}` : '-'}
                </td>
                <td className="py-3 px-4 text-right">
                    <div className="flex justify-end">
                        <span className={cn(
                            "text-xs font-medium px-2 py-1 rounded border uppercase tracking-wider",
                            report.status === 'Submitted' && "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
                            report.status === 'Triaged' && "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400",
                            report.status === 'Resolved' && "text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400",
                            ['Out-of-Scope', 'Spam', 'Duplicate'].includes(report.status) && "text-zinc-500 bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                        )}>
                            {report.status}
                        </span>
                    </div>
                </td>
              </tr>
            ))}
            
            {filteredReports.length === 0 && (
                <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500 font-mono text-sm">
                        No reports found for "{activeTab}"
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
