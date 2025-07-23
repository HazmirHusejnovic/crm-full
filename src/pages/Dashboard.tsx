import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CircleCheck, Ticket, ListTodo } from 'lucide-react';
import TaskStatusChart from '@/components/TaskStatusChart';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api'; // Import novog API klijenta

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
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [taskStatusData, setTaskStatusData] = useState<TaskStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    const fetchDashboardStats = async () => {
      setLoading(true);
      let hasError = false;

      try {
        // Fetch open tasks count
        const { data: openTasksCountData } = await api.get('/tasks/count', { params: { status: ['pending', 'in_progress'] } }); // Pretpostavljena ruta
        const openTasksCount = openTasksCountData.count;

        // Fetch open tickets count
        const { data: openTicketsCountData } = await api.get('/tickets/count', { params: { status: ['open', 'in_progress', 'reopened'] } }); // Pretpostavljena ruta
        const openTicketsCount = openTicketsCountData.count;

        // Fetch completed tasks today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const { data: completedTasksTodayCountData } = await api.get('/tasks/count', {
          params: {
            status: 'completed',
            updated_at_gte: today.toISOString(),
            updated_at_lt: tomorrow.toISOString(),
          },
        }); // Pretpostavljena ruta
        const completedTasksTodayCount = completedTasksTodayCountData.count;

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

        setStats({
          openTasks: openTasksCount || 0,
          openTickets: openTicketsCount || 0,
          completedTasksToday: completedTasksTodayCount || 0,
        });
      } catch (error: any) {
        toast.error('Failed to load dashboard stats: ' + (error.response?.data?.message || error.message));
        hasError = true;
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
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