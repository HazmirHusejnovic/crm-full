import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import TaskStatusChart from '@/components/TaskStatusChart';
import TicketStatusChart from '@/components/TicketStatusChart';
import InvoiceStatusChart from '@/components/InvoiceStatusChart';
import api from '@/lib/api'; // Import novog API klijenta

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
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [loading, setLoading] = useState(true);
  const [taskStatusData, setTaskStatusData] = useState<TaskStatusData[]>([]);
  const [ticketStatusData, setTicketStatusData] = useState<TicketStatusData[]>([]);
  const [invoiceStatusData, setInvoiceStatusData] = useState<InvoiceStatusData[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    const fetchReportData = async () => {
      setLoading(true);
      let hasError = false;

      try {
        const { data: roleData } = await api.get(`/profiles/${session.user.id}`); // Pretpostavljena ruta
        setCurrentUserRole(roleData.role);
        if (roleData.role !== 'worker' && roleData.role !== 'administrator') {
          setLoading(false);
          return; // Exit if not authorized
        }

        // Fetch all tasks to count by status for the chart
        const { data: allTasks } = await api.get('/tasks'); // Pretpostavljena ruta
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
          { name: 'Pending', count: statusCounts.pending, fill: 'hsl(var(--yellow-600))' },
          { name: 'In Progress', count: statusCounts.in_progress, fill: 'hsl(var(--blue-600))' },
          { name: 'Completed', count: statusCounts.completed, fill: 'hsl(var(--green-600))' },
          { name: 'Cancelled', count: statusCounts.cancelled, fill: 'hsl(var(--red-600))' },
        ];
        setTaskStatusData(chartData);

        // Fetch all tickets to count by status for the chart
        const { data: allTickets } = await api.get('/tickets'); // Pretpostavljena ruta
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

        // Fetch all invoices to count by status for the chart
        const { data: allInvoices } = await api.get('/invoices'); // Pretpostavljena ruta
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

      } catch (error: any) {
        toast.error('Failed to load report data: ' + (error.response?.data?.message || error.message));
        hasError = true;
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (currentUserRole !== 'worker' && currentUserRole !== 'administrator') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Reports & Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TaskStatusChart data={taskStatusData} />
        <TicketStatusChart data={ticketStatusData} />
        <InvoiceStatusChart data={invoiceStatusData} />
      </div>
    </div>
  );
};

export default ReportsPage;