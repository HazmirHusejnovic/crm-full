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
import { format } from 'date-fns';

const ticketFormSchema = z.object({
  subject: z.string().min(1, { message: 'Subject is required.' }),
  description: z.string().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'reopened']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigned_user_id: z.string().uuid().optional().nullable(), // Renamed
  assigned_group_id: z.string().uuid().optional().nullable(), // New field
  linked_task_id: z.string().uuid().optional().nullable(),
  linked_invoice_id: z.string().uuid().optional().nullable(), // New field
  sla_due_at: z.string().optional().nullable(), // New field (date string)
  sla_status: z.enum(['met', 'breached', 'warning']).optional().nullable(), // New field
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

interface Invoice {
  id: string;
  invoice_number: string;
}

interface TicketGroup {
  id: string;
  name: string;
}

const TicketForm: React.FC<TicketFormProps> = ({ initialData, onSuccess }) => {
  const { supabase, session } = useSession();
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]); // New state
  const [ticketGroups, setTicketGroups] = useState<TicketGroup[]>([]); // New state

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      subject: initialData?.subject || '',
      description: initialData?.description || '',
      status: initialData?.status || 'open',
      priority: initialData?.priority || 'medium',
      assigned_user_id: initialData?.assigned_user_id || null,
      assigned_group_id: initialData?.assigned_group_id || null, // Initialize new field
      linked_task_id: initialData?.linked_task_id || null,
      linked_invoice_id: initialData?.linked_invoice_id || null, // Initialize new field
      sla_due_at: initialData?.sla_due_at ? format(new Date(initialData.sla_due_at), 'yyyy-MM-dd') : '', // Format date
      sla_status: initialData?.sla_status || 'met', // Initialize new field
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

      // Fetch invoices (new)
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number')
        .order('invoice_number', { ascending: false });

      if (invoicesError) {
        toast.error('Failed to load invoices: ' + invoicesError.message);
      } else {
        setInvoices(invoicesData);
      }

      // Fetch ticket groups (new)
      const { data: groupsData, error: groupsError } = await supabase
        .from('ticket_groups')
        .select('id, name')
        .order('name', { ascending: true });

      if (groupsError) {
        toast.error('Failed to load ticket groups: ' + groupsError.message);
      } else {
        setTicketGroups(groupsData);
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
      assigned_user_id: values.assigned_user_id === 'null-value' ? null : values.assigned_user_id,
      assigned_group_id: values.assigned_group_id === 'null-value' ? null : values.assigned_group_id, // Handle null-value
      linked_task_id: values.linked_task_id === 'null-value' ? null : values.linked_task_id,
      linked_invoice_id: values.linked_invoice_id === 'null-value' ? null : values.linked_invoice_id, // Handle null-value
      sla_due_at: values.sla_due_at ? new Date(values.sla_due_at).toISOString() : null, // Convert to ISO string
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
                <Input placeholder="Ticket subject" {...field} />
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
                <Textarea placeholder="Ticket description" {...field} />
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
                  <SelectTrigger>
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
                  <SelectTrigger>
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
          name="assigned_user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned To User</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'null-value'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null-value">Unassigned</SelectItem>
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
          name="assigned_group_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned To Group</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'null-value'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null-value">No Group</SelectItem>
                  {ticketGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select a task" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null-value">No Task Linked</SelectItem>
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
        <FormField
          control={form.control}
          name="linked_invoice_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link to Invoice</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'null-value'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an invoice" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null-value">No Invoice Linked</SelectItem>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number}
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
          name="sla_due_at"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SLA Due Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sla_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SLA Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'met'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select SLA status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="met">Met</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="breached">Breached</SelectItem>
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