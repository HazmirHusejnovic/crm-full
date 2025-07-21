import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useSession } from '@/contexts/SessionContext';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

// Define all possible modules and actions
const MODULES = [
  { name: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { name: 'tasks', label: 'Tasks', actions: ['view', 'create', 'edit', 'delete'] },
  { name: 'tickets', label: 'Tickets', actions: ['view', 'create', 'edit', 'delete'] },
  { name: 'services', label: 'Services', actions: ['view', 'create', 'edit', 'delete'] },
  { name: 'products', label: 'Products', actions: ['view', 'create', 'edit', 'delete'] },
  { name: 'pos', label: 'POS', actions: ['view', 'create'] },
  { name: 'invoices', label: 'Invoices', actions: ['view', 'create', 'edit', 'delete'] },
  { name: 'reports', label: 'Reports', actions: ['view'] },
  { name: 'users', label: 'User Management', actions: ['view', 'create', 'edit', 'delete'] },
  { name: 'profile', label: 'Profile', actions: ['view', 'edit'] },
  { name: 'settings', label: 'Settings', actions: ['view', 'edit'] },
  { name: 'wiki', label: 'Wiki', actions: ['view', 'create', 'edit', 'delete'] },
  { name: 'chat', label: 'Chat', actions: ['view', 'create', 'send_message'] },
];

const ROLES = ['client', 'worker', 'administrator'];

// Helper to build the dynamic schema
const buildSchema = () => {
  const schemaObject: { [key: string]: any } = {};
  MODULES.forEach(module => {
    module.actions.forEach(action => {
      ROLES.forEach(role => {
        // Administrator role always has all permissions, so we don't make it configurable
        if (role !== 'administrator') {
          const fieldName = `${module.name}_${action}_${role}`;
          schemaObject[fieldName] = z.boolean().optional();
        }
      });
    });
  });
  return z.object(schemaObject);
};

type ModulePermissionsFormValues = z.infer<ReturnType<typeof buildSchema>>;

interface ModulePermissionsFormProps {
  initialPermissions: Record<string, Record<string, string[]>> | null;
  onSuccess?: () => void;
}

const ModulePermissionsForm: React.FC<ModulePermissionsFormProps> = ({ initialPermissions, onSuccess }) => {
  const { supabase } = useSession();

  const defaultValues: ModulePermissionsFormValues = {};
  MODULES.forEach(module => {
    module.actions.forEach(action => {
      ROLES.forEach(role => {
        if (role !== 'administrator') {
          const fieldName = `${module.name}_${action}_${role}`;
          const isAllowed = initialPermissions?.[module.name]?.[action]?.includes(role) || false;
          defaultValues[fieldName as keyof ModulePermissionsFormValues] = isAllowed;
        }
      });
    });
  });

  const form = useForm<ModulePermissionsFormValues>({
    resolver: zodResolver(buildSchema()),
    defaultValues: defaultValues,
  });

  const onSubmit = async (values: ModulePermissionsFormValues) => {
    const newPermissions: Record<string, Record<string, string[]>> = {};

    MODULES.forEach(module => {
      newPermissions[module.name] = {};
      module.actions.forEach(action => {
        const allowedRoles: string[] = [];
        ROLES.forEach(role => {
          if (role === 'administrator') {
            allowedRoles.push('administrator'); // Admins always have permission
          } else {
            const fieldName = `${module.name}_${action}_${role}`;
            if (values[fieldName as keyof ModulePermissionsFormValues]) {
              allowedRoles.push(role);
            }
          }
        });
        newPermissions[module.name][action] = allowedRoles;
      });
    });

    const { error } = await supabase
      .from('app_settings')
      .update({ module_permissions: newPermissions })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) {
      toast.error('Failed to save module permissions: ' + error.message);
    } else {
      toast.success('Module permissions saved successfully!');
      onSuccess?.();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {MODULES.map(module => (
          <div key={module.name} className="border rounded-md p-4">
            <h3 className="text-lg font-semibold mb-3 capitalize">{module.label} Permissions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {module.actions.map(action => (
                <div key={action} className="space-y-2">
                  <p className="font-medium capitalize">{action.replace(/_/g, ' ')}:</p>
                  {ROLES.filter(role => role !== 'administrator').map(role => ( // Exclude administrator from checkboxes
                    <FormField
                      key={`${module.name}-${action}-${role}`}
                      control={form.control}
                      name={`${module.name}_${action}_${role}` as keyof ModulePermissionsFormValues}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="capitalize">{role}</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                  <p className="text-sm text-muted-foreground">
                    * Administrator always has {action.replace(/_/g, ' ')} permission.
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button type="submit" className="w-full">Save Permissions</Button>
      </form>
    </Form>
  );
};

export default ModulePermissionsForm;