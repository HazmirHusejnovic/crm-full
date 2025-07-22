import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TaskForm from '@/components/TaskForm';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  profiles: { first_name: string | null; last_name: string | null } | null; // For assigned_to profile
  creator_profile: { first_name: string | null; last_name: string | null } | null; // For created_by profile
}

const TasksPage: React.FC = () => {
  const { supabase, session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        assigned_to,
        created_by,
        due_date,
        created_at,
        profiles!tasks_assigned_to_fkey(first_name, last_name),
        creator_profile:profiles!tasks_created_by_fkey(first_name, last_name)
      `);

    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`);
    }

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load tasks: ' + error.message);
    } else {
      setTasks(data as Task[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      const fetchUserRole = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (error) {
          console.error('Error fetching user role:', error.message);
          toast.error('Failed to fetch your user role.');
        } else {
          setCurrentUserRole(data.role);
        }
      };
      fetchUserRole();
    }
    fetchTasks();
  }, [supabase, searchTerm, filterStatus, session]);

  const handleNewTaskClick = () => {
    setEditingTask(undefined);
    setIsFormOpen(true);
  };

  const handleEditTaskClick = (task: Task) => {
    setEditingTask({
      ...task,
      due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
    });
    setIsFormOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to delete task: ' + error.message);
    } else {
      toast.success('Task deleted successfully!');
      fetchTasks();
    }
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchTasks();
  };

  const canManageTasks = currentUserRole === 'worker' || currentUserRole === 'administrator';
  const canDeleteTasks = currentUserRole === 'administrator';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        {canManageTasks && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewTaskClick}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
              </DialogHeader>
              <TaskForm initialData={editingTask} onSuccess={handleFormSuccess} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select onValueChange={setFilterStatus} defaultValue={filterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.length === 0 ? (
          <p className="col-span-full text-center text-gray-500">No tasks found. Create one!</p>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {task.title}
                  <div className="flex space-x-2">
                    {canManageTasks && (
                      <Button variant="ghost" size="icon" onClick={() => handleEditTaskClick(task)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {canDeleteTasks && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                <div className="text-xs text-gray-500 dark:text-gray-300">
                  <p>Status: <span className={`font-medium ${
                    task.status === 'completed' ? 'text-green-600' :
                    task.status === 'in_progress' ? 'text-blue-600' :
                    task.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                  }`}>{task.status.replace(/_/g, ' ')}</span></p>
                  {task.assigned_to && (
                    <p>Assigned To: {task.profiles?.first_name} {task.profiles?.last_name}</p>
                  )}
                  <p>Created By: {task.creator_profile?.first_name} {task.creator_profile?.last_name}</p>
                  {task.due_date && (
                    <p>Due Date: {format(new Date(task.due_date), 'PPP')}</p>
                  )}
                  <p>Created At: {format(new Date(task.created_at), 'PPP p')}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TasksPage;