import React, { useState } from 'react';
import { Search, Filter, Clock, CheckCircle, MessageSquare, AlertTriangle, ExternalLink, User, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';



import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/config';

export default function TriagerAssigned() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
      console.log("DEBUG: Current User in Frontend:", user);
      const fetchReports = async () => {
          try {
              const res = await fetch(`${API_URL}/triager/assigned`);
              const data = await res.json();
              console.log("DEBUG: API Response:", data);
              if (data.status === 'success') {
                  setReports(data.data.reports);
              }
          } catch (error) {
              console.error("Failed to fetch assigned reports", error);
          } finally {
              setIsLoading(false);
          }
      };
      if (user) fetchReports();
  }, [user]);


  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report._id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
      return <div className="p-8 text-center text-zinc-500">Loading assigned reports...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground font-mono">Assigned Reports</h1>
        <p className="text-muted-foreground text-sm">Reports currently assigned to you for triage</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-foreground">{reports.length}</p>
          <p className="text-sm text-muted-foreground">Total Assigned</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-primary">
            {reports.filter(r => ['Triaging', 'Under Review', 'Submitted'].includes(r.status)).length}
          </p>
          <p className="text-sm text-muted-foreground">In Progress</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-yellow-500">
            {reports.filter(r => r.status === 'Needs Info').length}
          </p>
          <p className="text-sm text-muted-foreground">Pending Info</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-green-500">
            {reports.filter(r => ['Triaged', 'Resolved', 'Paid'].includes(r.status)).length}
          </p>
          <p className="text-sm text-muted-foreground">Validated</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold font-mono text-zinc-500">
            {reports.filter(r => ['Duplicate', 'Spam', 'NA', 'Out-of-Scope', 'Closed'].includes(r.status)).length}
          </p>
          <p className="text-sm text-muted-foreground">Discarded/Closed</p>
        </GlassCard>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assigned reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Triaging">Triaging</SelectItem>
              <SelectItem value="Under Review">Under Review</SelectItem>
              <SelectItem value="Needs Info">Needs Info</SelectItem>
              <SelectItem value="Triaged">Triaged</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Duplicate">Duplicate</SelectItem>
              <SelectItem value="Spam">Spam</SelectItem>
              <SelectItem value="NA">N/A</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </GlassCard>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground bg-zinc-50/50 dark:bg-zinc-900/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No reports found matching your criteria.</p>
             </div>
        ) : (
            filteredReports.map((report) => (
            <GlassCard key={report._id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-primary text-sm">#{report._id.slice(-6)}</span>
                    <Badge className={
                        report.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                        report.severity === 'High' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                        report.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }>{report.severity}</Badge>
                    <span className={`text-sm font-medium ${
                        ['Triaged', 'Resolved', 'Paid'].includes(report.status) ? 'text-green-500' :
                        ['Duplicate', 'Spam', 'NA', 'Out-of-Scope', 'Closed'].includes(report.status) ? 'text-zinc-500' :
                        report.status === 'Needs Info' ? 'text-yellow-500' :
                        'text-blue-500'
                    }`}>
                        {report.status.replace('_', ' ')}
                    </span>
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">{report.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span>{report.programId || 'Program'}</span>
                    <span>•</span>
                    <span className="font-mono flex items-center gap-1">
                        <User className="w-3 h-3" />
                        @{report.researcherId?.username || report.researcherId?.name || 'Researcher'}
                    </span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span>{report.comments?.length || 0}</span>
                    </div>
                    </div>
                    <div className="flex gap-2">
                    {['Triaged', 'Resolved', 'Paid', 'Duplicate', 'Spam', 'NA', 'Out-of-Scope', 'Closed'].includes(report.status) ? (
                        <>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1 border-zinc-200 dark:border-zinc-800 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                            onClick={async (e) => {
                                e.stopPropagation();
                                if(!confirm('Are you sure you want to reopen this report?')) return;
                                try {
                                    const res = await fetch(`${API_URL}/triager/reports/${report._id}/reopen`, {
                                        method: 'POST'
                                    });
                                    if(res.ok) {
                                        // Simple refresh
                                        window.location.reload(); 
                                    }
                                } catch(err) {
                                    console.error(err);
                                }
                            }}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Reopen
                        </Button>
                        <Button size="sm" className="gap-1 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200" onClick={() => navigate(`/triager/reports/${report._id}`)}>
                            <ExternalLink className="h-4 w-4" />
                            Review
                        </Button>
                        </>
                    ) : (
                        <>
                        <Button variant="outline" size="sm" className="gap-1 border-zinc-200 dark:border-zinc-800" onClick={() => navigate(`/triager/reports/${report._id}#reply`)}>
                            <MessageSquare className="h-4 w-4" />
                            Reply
                        </Button>
                        <Button size="sm" className="gap-1 bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200" onClick={() => navigate(`/triager/reports/${report._id}`)}>
                            <ExternalLink className="h-4 w-4" />
                            Review
                        </Button>
                        </>
                    )}
                    </div>
                </div>
                </div>
            </GlassCard>
            ))
        )}
      </div>
    </div>
  );
}
