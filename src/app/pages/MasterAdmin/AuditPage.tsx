import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { API_URL } from '../../config/api';
import { toast } from 'sonner';
import { ArrowLeft, FileText, User, Building2, Clock } from 'lucide-react';

export function MasterAdminAuditPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const token = localStorage.getItem('masterAdminToken');
      const response = await fetch(`${API_URL}/master-admin/audit`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setLogs(data.logs || []);
      }
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create')) return 'text-green-600 bg-green-50';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600 bg-blue-50';
    if (action.includes('delete') || action.includes('suspend')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button
              onClick={() => navigate('/master-admin/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No audit logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Admin:</span>
                        <span>{log.actorName || log.actorEmail}</span>
                      </div>
                      
                      {log.tenantName && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="h-4 w-4" />
                          <span className="font-medium">Tenant:</span>
                          <span>{log.tenantName}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(log.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}</span>
                      </div>
                    </div>

                    {(log.before || log.after) && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                            View Details
                          </summary>
                          <div className="mt-2 space-y-2">
                            {log.before && (
                              <div className="bg-red-50 p-3 rounded-lg">
                                <p className="font-medium text-red-900 mb-1">Before:</p>
                                <pre className="text-xs text-red-800 overflow-x-auto">
                                  {JSON.stringify(log.before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.after && (
                              <div className="bg-green-50 p-3 rounded-lg">
                                <p className="font-medium text-green-900 mb-1">After:</p>
                                <pre className="text-xs text-green-800 overflow-x-auto">
                                  {JSON.stringify(log.after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
