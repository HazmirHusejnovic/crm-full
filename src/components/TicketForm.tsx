import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';

const ticketFormSchema = z.object({
  subject: z.string().min(1, { message: 'Subject is required.' }),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'reopened']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_to: z.string().uuid().optional().nullable(), // UUID of the assigned worker profile
  linked_task_id: z.string().uuid().optional().nullable(), // UUID of the linked task
});

type TicketFormValues = z.infer<typeof ticketFormSchema>;

interface TicketFormProps {
  initialData?: TicketFormValues & { id?: string };
  onSuccess?: () => void;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

interface Task {
  id: string;
  title: string;
}

const TicketForm: React.FC<TicketFormProps> = ({ initialData, onSuccess }) => {
  const { supabase, session } = useSession();
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: initialData || {
      subject: '',
      description: '',
      status: 'open',
      priority: 'medium',
      assigned_to: null,
      linked_task_id: null,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch workers
      const { data: workersData, error: workersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('role', 'worker');

      if (workersError) {
        toast.error('Failed to load workers: ' + workersError.message);
      } else {
        setWorkers(workersData);
      }

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title');

      if (tasksError) {
        toast.error('Failed to load tasks: ' + tasksError.message);
      } else {
        setTasks(tasksData);
      }
    };

    fetchData();
  }, [supabase]);

  const onSubmit = async (values: TicketFormValues) => {
    if (!session?.user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    const ticketData = {
      ...values,
      created_by: session.user.id,
      assigned_to: values.assigned_to === 'null-value' ? null : values.assigned_to, // Handle null-value
      linked_task_id: values.linked_task_id === 'null-value' ? null : values.linked_task_id, // Handle null-value
    };

    let error = null;
    if (initialData?.id) {
      // Update existing ticket
      const { error: updateError } = await supabase
        .from('tickets')
        .update(ticketData)
        .eq('id', initialData.id);
      error = updateError;
    } else {
      // Create new ticket
      const { error: insertError } = await supabase
        .from('tickets')
        .insert(ticketData);
      error = insertError;
    }

    if (error) {
      toast.error('Failed to save ticket: ' + error.message);
    } else {
      toast.success('Ticket saved successfully!');
      form.reset();
      onSuccess?.();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input id={field.name} placeholder="Ticket subject" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea id={field.name} placeholder="Ticket description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="reopened">Reopened</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assigned_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned To</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'null-value'}>
                <FormControl>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null-value">Unassigned</SelectItem> {/* Changed value */}
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.first_name} {worker.last_name} ({worker.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="linked_task_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Task</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'null-value'}>
                <FormControl>
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null-value">No Task Linked</SelectItem> {/* Changed value */}
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Ticket</Button>
      </form>
    </Form>
  );
};

export default TicketForm;