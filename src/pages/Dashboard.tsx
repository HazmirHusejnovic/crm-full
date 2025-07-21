import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CircleCheck, Ticket, ListTodo } from 'lucide-react';
import TaskStatusChart from '@/components/TaskStatusChart'; // Import the new chart component

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [taskStatusData, setTaskStatusData] = useState<TaskStatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchDashboardStats = async () => {
      setLoading(true);
      let hasError = false;

      // Fetch open tasks count
      const { count: openTasksCount, error: tasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'in_progress']);

      if (tasksError) {
        toast.error('Failed to load tasks count: ' + tasksError.message);
        hasError = true;
      }

      // Fetch open tickets count
      const { count: openTicketsCount, error: ticketsError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress', 'reopened']);

      if (ticketsError) {
        toast.error('Failed to load tickets count: ' + ticketsError.message);
        hasError = true;
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
        hasError = true;
      }

      // Fetch task counts by status for the chart
      const { data: taskCounts, error: taskCountsError } = await supabase
        .from('tasks')
        .select('status, count')
        .rollup('count')
        .order('status');

      if (taskCountsError) {
        toast.error('Failed to load task status counts: ' + taskCountsError.message);
        hasError = true;
      } else {
        const statusMap = new Map<string, number>();
        taskCounts.forEach((item: any) => statusMap.set(item.status, item.count));

        const chartData: TaskStatusData[] = [
          { name: 'Pending', count: statusMap.get('pending') || 0, fill: 'hsl(var(--yellow-600))' },
          { name: 'In Progress', count: statusMap.get('in_progress') || 0, fill: 'hsl(var(--blue-600))' },
          { name: 'Completed', count: statusMap.get('completed') || 0, fill: 'hsl(var(--green-600))' },
          { name: 'Cancelled', count: statusMap.get('cancelled') || 0, fill: 'hsl(var(--red-600))' },
        ];
        setTaskStatusData(chartData);
      }

      if (!hasError) {
        setStats({
          openTasks: openTasksCount || 0,
          openTickets: openTicketsCount || 0,
          completedTasksToday: completedTasksTodayCount || 0,
        });
      }
      setLoading(false);
    };

    fetchDashboardStats();
  }, [supabase, session]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>;
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