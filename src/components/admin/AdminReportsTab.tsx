import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  Download, 
  ExternalLink, 
  X, 
  FileText, 
  MessageSquare, 
  Smartphone, 
  UserCheck, 
  Eye, 
  Flag,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { toast } from '../Toast';
import { adminFetch } from '../../services/adminAuthService';
import { fetchAdminReportsList } from '../../lib/adminCommunityFirebase';

interface AdminReportsTabProps {
  appsList?: any[];
}

export interface ReportItem {
  id: string;
  type: 'app_flag' | 'review_flag' | 'dmca_removal' | 'general_bug' | string;
  appId?: string;
  appName?: string;
  reviewId?: string;
  reviewAuthor?: string;
  reviewComment?: string;
  reason: string;
  description: string;
  reporterEmail?: string;
  reporterName?: string;
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed' | string;
  created_at: string;
  resolved_at?: string;
  ip?: string;
  userAgent?: string;
  adminNotes?: string;
}

export const AdminReportsTab: React.FC<AdminReportsTabProps> = ({ appsList = [] }) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Filters & Search
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAppId, setSelectedAppId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals & Inspectors
  const [inspectReport, setInspectReport] = useState<ReportItem | null>(null);
  const [editingNotes, setEditingNotes] = useState('');

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, selectedStatus, selectedAppId, searchQuery]);

  // App Lookup Map
  const appMap = useMemo(() => {
    const map = new Map<string, any>();
    appsList.forEach(app => {
      if (app.id) map.set(app.id, app);
      if (app.slug) map.set(app.slug, app);
    });
    return map;
  }, [appsList]);

  // Fetch Reports
  const fetchReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await fetchAdminReportsList({
        type: selectedType !== 'all' ? selectedType : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        appId: selectedAppId !== 'all' ? selectedAppId : undefined,
        search: searchQuery.trim() || undefined,
        limit: 200
      });
      setReports((data.reports as ReportItem[]) || []);
    } catch (err: any) {
      console.error('Error fetching admin reports:', err);
      toast('Network error loading reports', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedType, selectedStatus, selectedAppId, searchQuery]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Metrics
  const counts = useMemo(() => {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const in_review = reports.filter(r => r.status === 'in_review').length;
    const resolved = reports.filter(r => r.status === 'resolved').length;
    const dismissed = reports.filter(r => r.status === 'dismissed').length;
    const app_flags = reports.filter(r => r.type === 'app_flag').length;
    const review_flags = reports.filter(r => r.type === 'review_flag').length;
    const dmca = reports.filter(r => r.type === 'dmca_removal').length;

    return { total, pending, in_review, resolved, dismissed, app_flags, review_flags, dmca };
  }, [reports]);

  // Status Update
  const handleUpdateStatus = async (reportId: string, newStatus: string, adminNotes?: string) => {
    try {
      setActioningId(reportId);
      const payload: any = { status: newStatus };
      if (adminNotes !== undefined) payload.adminNotes = adminNotes;

      const res = await adminFetch(`/api/v1/admin/reports/${reportId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast(`Report marked as ${newStatus}`, 'success');
        setReports(prev => prev.map(r => r.id === reportId ? { 
          ...r, 
          status: newStatus,
          adminNotes: adminNotes !== undefined ? adminNotes : r.adminNotes,
          resolved_at: (newStatus === 'resolved' || newStatus === 'dismissed') ? new Date().toISOString() : r.resolved_at
        } : r));
        if (inspectReport?.id === reportId) {
          setInspectReport(prev => prev ? { ...prev, status: newStatus, adminNotes: adminNotes ?? prev.adminNotes } : null);
        }
      } else {
        toast('Failed to update status', 'error');
      }
    } catch (err) {
      toast('Error updating report', 'error');
    } finally {
      setActioningId(null);
    }
  };

  // Delete Report
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Delete this report entry permanently?')) return;
    try {
      setActioningId(reportId);
      const res = await adminFetch(`/api/v1/admin/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast('Report deleted', 'success');
        setReports(prev => prev.filter(r => r.id !== reportId));
        setSelectedReportIds(prev => prev.filter(id => id !== reportId));
        if (inspectReport?.id === reportId) setInspectReport(null);
      } else {
        toast('Failed to delete report', 'error');
      }
    } catch (err) {
      toast('Error deleting report', 'error');
    } finally {
      setActioningId(null);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: 'resolve' | 'dismiss' | 'in_review' | 'delete') => {
    if (selectedReportIds.length === 0) return;
    if (action === 'delete' && !window.confirm(`Permanently delete ${selectedReportIds.length} selected reports?`)) {
      return;
    }

    try {
      setRefreshing(true);
      const res = await adminFetch('/api/v1/admin/reports/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedReportIds, action })
      });

      if (res.ok) {
        toast(`Bulk ${action} executed successfully`, 'success');
        setSelectedReportIds([]);
        await fetchReports(true);
      } else {
        toast('Bulk action failed', 'error');
      }
    } catch (err) {
      toast('Error executing bulk action', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Export Reports
  const handleExport = (format: 'csv' | 'json') => {
    if (reports.length === 0) {
      toast('No reports to export', 'error');
      return;
    }

    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `reports_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast('Exported JSON successfully', 'success');
    } else {
      const headers = ['ID', 'Type', 'TargetApp', 'Reason', 'Status', 'Reporter', 'Date', 'Description', 'AdminNotes'];
      const rows = reports.map(r => [
        r.id,
        r.type,
        `"${r.appId || r.appName || ''}"`,
        `"${(r.reason || '').replace(/"/g, '""')}"`,
        r.status,
        `"${r.reporterEmail || r.reporterName || 'Anonymous'}"`,
        `"${new Date(r.created_at).toISOString()}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
        `"${(r.adminNotes || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reports_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast('Exported CSV successfully', 'success');
    }
  };

  // Paginated reports slice
  const totalPages = Math.ceil(reports.length / pageSize) || 1;
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return reports.slice(startIndex, startIndex + pageSize);
  }, [reports, currentPage, pageSize]);

  const toggleSelectAll = () => {
    const pageIds = paginatedReports.map(r => r.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedReportIds.includes(id));

    if (allPageSelected) {
      setSelectedReportIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedReportIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedReportIds.includes(id)) {
      setSelectedReportIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedReportIds(prev => [...prev, id]);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'app_flag':
        return (
          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-wider flex items-center gap-1">
            <Smartphone className="w-2.5 h-2.5" /> App Content Flag
          </span>
        );
      case 'review_flag':
        return (
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
            <MessageSquare className="w-2.5 h-2.5" /> Review Abuse Flag
          </span>
        );
      case 'dmca_removal':
        return (
          <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-500/20 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-2.5 h-2.5" /> DMCA / Copyright
          </span>
        );
      default:
        return (
          <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-slate-500/20 uppercase tracking-wider flex items-center gap-1">
            <Flag className="w-2.5 h-2.5" /> User Notice
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-wider animate-pulse flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Pending Action
          </span>
        );
      case 'in_review':
        return (
          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-wider flex items-center gap-1">
            <Eye className="w-2.5 h-2.5" /> Investigating
          </span>
        );
      case 'resolved':
        return (
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
          </span>
        );
      case 'dismissed':
        return (
          <span className="bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-slate-500/20 uppercase tracking-wider">
            Dismissed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-24 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-rose-950 via-slate-900 to-zinc-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-rose-900/30">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 bg-rose-500/20 text-rose-300 rounded-2xl border border-rose-400/20">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">User Reports & Moderation Center</h1>
              <p className="text-xs md:text-sm text-rose-200/80 font-medium">
                Independent moderation queue for app safety violations, reported toxic reviews, and DMCA removal notices.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          <button
            onClick={() => fetchReports(true)}
            disabled={refreshing}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Reports</span>
          <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{counts.total}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-rose-500/30 p-4 rounded-2xl shadow-sm bg-gradient-to-br from-rose-500/5 to-transparent">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Pending Review
          </span>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{counts.pending}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-blue-500/20 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <Eye className="w-3 h-3" /> In Progress
          </span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{counts.in_review}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-emerald-500/20 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{counts.resolved}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dismissed</span>
          <div className="text-2xl font-black text-slate-500 mt-1">{counts.dismissed}</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by app, reason, details, email, or notes..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="w-full lg:w-56">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <option value="all">📂 All Report Types</option>
              <option value="app_flag">📱 App Content Flags</option>
              <option value="review_flag">💬 Review Abuse Flags</option>
              <option value="dmca_removal">⚖️ DMCA / Takedowns</option>
              <option value="general_bug">🐞 Bugs / Safety</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
            >
              <option value="all">⚡ All Statuses</option>
              <option value="pending">⏳ Pending Action</option>
              <option value="in_review">🔍 In Investigation</option>
              <option value="resolved">✅ Resolved</option>
              <option value="dismissed">🚫 Dismissed</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-2">Quick Views:</span>
          {[
            { id: 'all', label: 'All Items' },
            { id: 'pending', label: '🔴 Action Required' },
            { id: 'in_review', label: '🔵 Under Review' },
            { id: 'resolved', label: '🟢 Resolved' }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === st.id
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Action Header */}
      {selectedReportIds.length > 0 && (
        <div className="bg-rose-600 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-black">
              {selectedReportIds.length} Selected
            </span>
            <span className="text-xs font-medium opacity-90">Moderation actions:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkAction('resolve')}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
            </button>
            <button
              onClick={() => handleBulkAction('in_review')}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> Set In Review
            </button>
            <button
              onClick={() => handleBulkAction('dismiss')}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Dismiss
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button
              onClick={() => setSelectedReportIds([])}
              className="px-2 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
              title="Select all on this page"
            >
              {paginatedReports.length > 0 && paginatedReports.every(r => selectedReportIds.includes(r.id)) ? (
                <CheckSquare className="w-5 h-5 text-rose-600" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </button>
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Showing {reports.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, reports.length)} of {reports.length} Reports
            </span>
          </div>

          {/* Page Size & Pagination Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white cursor-pointer focus:outline-none"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-rose-600 border-t-transparent" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Reports Queue...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-24 px-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Clean Moderation Queue</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              No reports or moderation tickets found matching the selected filters.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedReports.map((report) => {
              const isSelected = selectedReportIds.includes(report.id);
              const matchedApp = report.appId ? appMap.get(report.appId) : null;

              return (
                <div 
                  key={report.id}
                  className={`p-6 transition-all hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex flex-col gap-4 ${
                    isSelected ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    
                    {/* Main Content */}
                    <div className="flex items-start gap-4 flex-1">
                      <button
                        onClick={() => toggleSelectOne(report.id)}
                        className="mt-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-rose-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      <div className="space-y-2 flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {getTypeBadge(report.type)}
                          {getStatusBadge(report.status)}

                          {report.appId && (
                            <a
                              href={`/app/${report.appId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 text-[10px] font-black px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors uppercase tracking-wider"
                            >
                              <span>{matchedApp?.name || report.appName || report.appId}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}

                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date(report.created_at).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>

                        {/* Reason / Title */}
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="text-rose-600 dark:text-rose-400">Violation Reason:</span>
                          <span>{report.reason}</span>
                        </div>

                        {/* Description Box */}
                        {report.description && (
                          <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {report.description}
                            </p>
                          </div>
                        )}

                        {/* Target Review Snippet (if flagged review) */}
                        {report.reviewComment && (
                          <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                            <span className="font-bold block mb-1">Flagged Review (by {report.reviewAuthor || 'User'}):</span>
                            <span className="italic">"{report.reviewComment}"</span>
                          </div>
                        )}

                        {/* Reporter & Metadata */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                          {report.reporterEmail && (
                            <span><strong className="text-slate-600 dark:text-slate-300">Email:</strong> {report.reporterEmail}</span>
                          )}
                          {report.reporterName && (
                            <span><strong className="text-slate-600 dark:text-slate-300">Name:</strong> {report.reporterName}</span>
                          )}
                          {report.ip && (
                            <span><strong className="text-slate-600 dark:text-slate-300">IP:</strong> {report.ip}</span>
                          )}
                        </div>

                        {/* Admin Notes Preview */}
                        {report.adminNotes && (
                          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <div>
                              <strong className="block text-[10px] uppercase tracking-wider font-black">Admin Investigation Note:</strong>
                              <span>{report.adminNotes}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0">
                      <div className="flex items-center gap-1.5">
                        {report.status !== 'resolved' && (
                          <button
                            disabled={actioningId === report.id}
                            onClick={() => handleUpdateStatus(report.id, 'resolved')}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Mark Resolved"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                          </button>
                        )}

                        {report.status === 'pending' && (
                          <button
                            disabled={actioningId === report.id}
                            onClick={() => handleUpdateStatus(report.id, 'in_review')}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                            title="Set In Review"
                          >
                            <Eye className="w-3.5 h-3.5" /> Investigate
                          </button>
                        )}

                        {report.status !== 'dismissed' && (
                          <button
                            disabled={actioningId === report.id}
                            onClick={() => handleUpdateStatus(report.id, 'dismissed')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            title="Dismiss Report"
                          >
                            Dismiss
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Inspect / Add Notes */}
                        <button
                          onClick={() => {
                            setInspectReport(report);
                            setEditingNotes(report.adminNotes || '');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="View Details & Add Note"
                        >
                          <FileText className="w-3.5 h-3.5" /> Notes
                        </button>

                        {/* Delete */}
                        <button
                          disabled={actioningId === report.id}
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-600 dark:hover:text-white rounded-xl transition-all cursor-pointer"
                          title="Delete Report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs font-bold text-slate-500">
                Page {currentPage} of {totalPages} ({reports.length} total reports)
              </span>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <div className="px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  {currentPage} / {totalPages}
                </div>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
        )}
      </div>

      {/* Inspector / Notes Modal */}
      {inspectReport && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Report Details & Moderation Notes
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    ID: {inspectReport.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setInspectReport(null)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Violation Reason
                </label>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {inspectReport.reason}
                </p>
              </div>

              {inspectReport.description && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    User Statement
                  </label>
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                    {inspectReport.description}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Internal Admin / Audit Note
                </label>
                <textarea
                  rows={4}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Record verification actions, compliance findings, or developer contact status..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInspectReport(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleUpdateStatus(inspectReport.id, inspectReport.status, editingNotes);
                    setInspectReport(null);
                  }}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/25 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminReportsTab;
