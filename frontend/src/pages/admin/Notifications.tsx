import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingPage } from '../../components/common/LoadingPage';
import {
  BellRing,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';

interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  deadLetter: number;
  pending: number;
  successRate: number;
}

export default function AdminNotifications() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await api.get('/notifications/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load notification stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Notification Queue Telemetry</h1>
          <p className="text-sm text-slate-500 mt-1">
            BullMQ background email delivery metrics, retry health, and failure dead-letters.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh Metrics
        </Button>
      </div>

      {/* Metrics Row */}
      {loading ? (
        <LoadingPage message="Loading delivery stats..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Dispatched
              </p>
              <h3 className="text-2xl font-black text-slate-800">{stats?.total || 0}</h3>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sent Successfully
              </p>
              <h3 className="text-2xl font-black text-emerald-600">{stats?.sent || 0}</h3>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pending / Retrying
              </p>
              <h3 className="text-2xl font-black text-amber-600">{stats?.pending || 0}</h3>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Dead Letter / Failed
              </p>
              <h3 className="text-2xl font-black text-rose-600">
                {(stats?.failed || 0) + (stats?.deadLetter || 0)}
              </h3>
            </div>
          </Card>
        </div>
      )}

      {/* Health Overview */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-800">Queue Delivery Success Rate</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-600">Overall Delivery Reliability</span>
            <span className="text-blue-600 font-bold">{stats?.successRate || 100}%</span>
          </div>
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats?.successRate || 100}%` }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
