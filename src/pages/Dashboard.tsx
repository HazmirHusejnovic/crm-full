import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CircleCheck, Ticket, ListTodo } from 'lucide-react';
import TaskStatusChart from '@/components/TaskStatusChart';
import LoadingSpinner from '@/components/LoadingSpinner';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/contexts/AppContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

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
  const { appSettings, currentUserRole, loadingAppSettings } = useAppContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [taskStatusData, setTaskStatusData] = useState<TaskStatusData[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { t } = useTranslation(); // Initialize useTranslation
  const { canViewModule } = usePermissions();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (loadingAppSettings || !appSettings || !currentUserRole) {
        setLoadingData(true);
        return;
      }

      if (!canViewModule('dashboard')) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);

      let hasDataFetchError = false;

      const { count: openTasksCount, error: tasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);
      if (tasksError) {
        toast.error('Failed to load tasks count: ' + tasksError.message);
        hasDataFetchError = true;
      }

      const { count: openTicketsCount, error: ticketsError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress', 'reopened']);
      if (ticketsError) {
        toast.error('Failed to load tickets count: ' + ticketsError.message);
        hasDataFetchError = true;
      }

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
          { name: t('tasks_status_pending'), count: statusCounts.pending, fill: 'hsl(var(--yellow-600))' },
          { name: t('tasks_status_in_progress'), count: statusCounts.in_progress, fill: 'hsl(var(--blue-600))' },
          { name: t('tasks_status_completed'), count: statusCounts.completed, fill: 'hsl(var(--green-600))' },
          { name: t('tasks_status_cancelled'), count: statusCounts.cancelled, fill: 'hsl(var(--red-600))' },
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
      setLoadingData(false);
    };

    fetchDashboardData();
  }, [supabase, session, appSettings, currentUserRole, loadingAppSettings, canViewModule, t]);

  const overallLoading = loadingAppSettings || loadingData;

  if (overallLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!canViewModule('dashboard')) {
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
      <h1 className="text-3xl font-bold mb-6">{t('dashboard')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('open_tasks')}</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openTasks}</div>
            <p className="text-xs text-muted-foreground">{t('tasks_pending_in_progress')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('open_tickets')}</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openTickets}</div>
            <p className="text-xs text-muted-foreground">{t('tickets_awaiting_resolution')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('tasks_completed_today')}</CardTitle>
            <CircleCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedTasksToday}</div>
            <p className="text-xs text-muted-foreground">{t('tasks_marked_completed_today')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <TaskStatusChart data={taskStatusData} />
      </div>
    </div>
  );
};

export default DashboardPage;