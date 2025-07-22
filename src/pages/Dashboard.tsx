import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CircleCheck, Ticket, ListTodo } from 'lucide-react';
import TaskStatusChart from '@/components/TaskStatusChart';
import LoadingSpinner from '@/components/LoadingSpinner';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/contexts/AppContext'; // NEW: Import useAppContext

interface DashboardStats {
  openTasks: number;
  openTickets: number;
  completedTasksToday: number;
}

interface TaskStatusData {
  name: string;
  count: number;
  fill: string;
}

const DashboardPage: React.FC = () => {
  const { supabase, session } = useSession();
  const { appSettings, currentUserRole, loadingAppSettings } = useAppContext(); // Get from context
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [taskStatusData, setTaskStatusData] = useState<TaskStatusData[]>([]);
  const [loadingData, setLoadingData] = useState(true); // Separate loading for data fetching

  // usePermissions now gets its dependencies from useAppContext internally
  const { canViewModule } = usePermissions();

  useEffect(() => {
    const fetchDashboardData = async () => {
      // Wait for global app settings and user role to load
      if (loadingAppSettings || !appSettings || !currentUserRole) {
        setLoadingData(true); // Still loading global data
        return;
      }

      // Now that global data is loaded, check permissions
      if (!canViewModule('dashboard')) {
        setLoadingData(false); // Not authorized, stop loading page data
        return;
      }

      setLoadingData(true); // Start loading page-specific data

      let hasDataFetchError = false;

      // Fetch open tasks count
      const { count: openTasksCount, error: tasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);
      if (tasksError) {
        toast.error('Failed to load tasks count: ' + tasksError.message);
        hasDataFetchError = true;
      }

      // Fetch open tickets count
      const { count: openTicketsCount, error: ticketsError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress', 'reopened']);
      if (ticketsError) {
        toast.error('Failed to load tickets count: ' + ticketsError.message);
        hasDataFetchError = true;
      }

      // Fetch completed tasks today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const { count: completedTasksTodayCount, error: completedTasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('updated_at', today.toISOString())
        .lt('updated_at', tomorrow.toISOString());
      if (completedTasksError) {
        toast.error('Failed to load completed tasks today count: ' + completedTasksError.message);
        hasDataFetchError = true;
      }

      // Fetch all tasks to count by status for the chart
      const { data: allTasks, error: allTasksError } = await supabase
        .from('tasks')
        .select('status');
      if (allTasksError) {
        toast.error('Failed to load all tasks for status counts: ' + allTasksError.message);
        hasDataFetchError = true;
      } else {
        const statusCounts: { [key: string]: number } = {
          pending: 0, in_progress: 0, completed: 0, cancelled: 0,
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
      }

      if (!hasDataFetchError) {
        setStats({
          openTasks: openTasksCount || 0,
          openTickets: openTicketsCount || 0,
          completedTasksToday: completedTasksTodayCount || 0,
        });
      }
      setLoadingData(false); // End loading for dashboard specific data
    };

    fetchDashboardData();
  }, [supabase, session, appSettings, currentUserRole, loadingAppSettings, canViewModule]); // Dependencies now include context values and canViewModule

  // Overall loading state for the page
  const overallLoading = loadingAppSettings || loadingData;

  if (overallLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  // This check now correctly uses the reactive `canViewModule`
  if (!canViewModule('dashboard')) {
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
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openTasks}</div>
            <p className="text-xs text-muted-foreground">Tasks currently pending or in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openTickets}</div>
            <p className="text-xs text-muted-foreground">Tickets awaiting resolution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed Today</CardTitle>
            <CircleCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedTasksToday}</div>
            <p className="text-xs text-muted-foreground">Tasks marked as completed today</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Status Chart */}
      <div className="grid grid-cols-1 gap-4">
        <TaskStatusChart data={taskStatusData} />
      </div>
    </div>
  );
};

export default DashboardPage;