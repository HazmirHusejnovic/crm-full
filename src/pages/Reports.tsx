import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import TaskStatusChart from '@/components/TaskStatusChart';
import TicketStatusChart from '@/components/TicketStatusChart';
import InvoiceStatusChart from '@/components/InvoiceStatusChart';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/contexts/AppContext'; // NEW: Import useAppContext
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface TaskStatusData {
  name: string;
  count: number;
  fill: string;
}

interface TicketStatusData {
  name: string;
  count: number;
  fill: string;
}

interface InvoiceStatusData {
  name: string;
  count: number;
  fill: string;
}

const ReportsPage: React.FC = () => {
  const { supabase, session } = useSession();
  const { appSettings, currentUserRole, loadingAppSettings } = useAppContext(); // Get from context
  const [loadingData, setLoadingData] = useState(true); // Separate loading for data fetching
  const [taskStatusData, setTaskStatusData] = useState<TaskStatusData[]>([]);
  const [ticketStatusData, setTicketStatusData] = useState<TicketStatusData[]>([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState<InvoiceStatusData[]>([]);

  const { t } = useTranslation(); // Initialize useTranslation
  // usePermissions now gets its dependencies from useAppContext internally
  const { canViewModule } = usePermissions();

  useEffect(() => {
    const fetchReportData = async () => {
      // Wait for global app settings and user role to load
      if (loadingAppSettings || !appSettings || !currentUserRole) {
        setLoadingData(true); // Still loading global data
        return;
      }

      // Now that global data is loaded, check permissions
      if (!canViewModule('reports')) {
        setLoadingData(false); // Not authorized, stop loading page data
        return; // Exit if not authorized
      }

      setLoadingData(true); // Start loading page-specific data

      let hasError = false;

      // Fetch all tasks to count by status for the chart
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('status');

      if (allTasksError) {
        toast.error('Failed to load tasks for status counts: ' + allTasksError.message);
        hasError = true;
      } else {
        const statusCounts: { [key: string]: number } = {
          pending: 0,
          in_progress: 0,
          completed: 0,
          cancelled: 0,
        };

        allTasks.forEach((task: { status: string }) => {
          if (statusCounts.hasOwnProperty(task.status)) {
            statusCounts[task.status]++;
          }
        });

        const chartData: TaskStatusData[] = [
          { name: t('tasks_status_pending'), count: statusCounts.pending, fill: 'hsl(var(--yellow-600))' },
          { name: t('tasks_status_in_progress'), count: statusCounts.in_progress, fill: 'hsl(var(--blue-600))' },
          { name: t('tasks_status_completed'), count: statusCounts.completed, fill: 'hsl(var(--green-600))' },
          { name: t('tasks_status_cancelled'), count: statusCounts.cancelled, fill: 'hsl(var(--red-600))' },
        ];
        setTaskStatusData(chartData);
      }

      // Fetch all tickets to count by status for the chart
      const { data: allTickets, error: allTicketsError } = await supabase
        .from('tickets')
        .select('status');

      if (allTicketsError) {
        toast.error('Failed to load tickets for status counts: ' + allTicketsError.message);
        hasError = true;
      } else {
        const ticketStatusCounts: { [key: string]: number } = {
          open: 0,
          in_progress: 0,
          resolved: 0,
          closed: 0,
          reopened: 0,
        };

        allTickets.forEach((ticket: { status: string }) => {
          if (ticketStatusCounts.hasOwnProperty(ticket.status)) {
            ticketStatusCounts[ticket.status]++;
          }
        });

        const ticketChartData: TicketStatusData[] = [
          { name: 'Open', count: ticketStatusCounts.open, fill: 'hsl(var(--yellow-600))' },
          { name: 'In Progress', count: ticketStatusCounts.in_progress, fill: 'hsl(var(--blue-600))' },
          { name: 'Resolved', count: ticketStatusCounts.resolved, fill: 'hsl(var(--green-600))' },
          { name: 'Closed', count: ticketStatusCounts.closed, fill: 'hsl(var(--gray-500))' },
          { name: 'Reopened', count: ticketStatusCounts.reopened, fill: 'hsl(var(--orange-600))' },
        ];
        setTicketStatusData(ticketChartData);
      }

      // Fetch all invoices to count by status for the chart
      const { data: allInvoices, error: allInvoicesError } = await supabase
        .from('invoices')
        .select('status');

      if (allInvoicesError) {
        toast.error('Failed to load invoices for status counts: ' + allInvoicesError.message);
        hasError = true;
      } else {
        const invoiceStatusCounts: { [key: string]: number } = {
          draft: 0,
          sent: 0,
          paid: 0,
          overdue: 0,
          cancelled: 0,
        };

        allInvoices.forEach((invoice: { status: string }) => {
          if (invoiceStatusCounts.hasOwnProperty(invoice.status)) {
            invoiceStatusCounts[invoice.status]++;
          }
        });

        const invoiceChartData: InvoiceStatusData[] = [
          { name: 'Draft', count: invoiceStatusCounts.draft, fill: 'hsl(var(--yellow-600))' },
          { name: 'Sent', count: invoiceStatusCounts.sent, fill: 'hsl(var(--blue-600))' },
          { name: 'Paid', count: invoiceStatusCounts.paid, fill: 'hsl(var(--green-600))' },
          { name: 'Overdue', count: invoiceStatusCounts.overdue, fill: 'hsl(var(--red-600))' },
          { name: 'Cancelled', count: invoiceStatusCounts.cancelled, fill: 'hsl(var(--gray-500))' },
        ];
        setInvoiceStatusData(invoiceChartData);
      }

      setLoadingData(false);
    };

    fetchReportData();
  }, [supabase, session, appSettings, currentUserRole, loadingAppSettings, canViewModule, t]);

  const overallLoading = loadingAppSettings || loadingData;

  if (overallLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!canViewModule('reports')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('access_denied_title')}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">{t('access_denied_message')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">{t('reports')}</h1>

      {currentUserRole !== 'administrator' && (
        <p className="text-sm text-muted-foreground mb-4 p-3 border rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
          {t('reports_filtered_by_permissions')}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskStatusChart data={taskStatusData} />
        <TicketStatusChart data={ticketStatusData} />
        <InvoiceStatusChart data={invoiceStatusData} />
      </div>
    </div>
  );
};

export default ReportsPage;