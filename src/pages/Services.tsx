import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ServiceCategoryForm from '@/components/ServiceCategoryForm';
import ServiceForm from '@/components/ServiceForm';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import { usePermissions } from '@/hooks/usePermissions';
import { useAppContext } from '@/contexts/AppContext'; // NEW: Import useAppContext

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  default_price: number;
  duration_minutes: number;
  vat_rate: number;
  created_at: string;
  service_categories: { name: string } | null; // For category name
}

const ServicesPage: React.FC = () => {
  const { supabase, session } = useSession();
  const { appSettings, currentUserRole, loadingAppSettings } = useAppContext(); // Get from context
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(true); // Separate loading for data fetching
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | undefined>(undefined);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

  // usePermissions now gets its dependencies from useAppContext internally
  const { canViewModule, canCreate, canEdit, canDelete } = usePermissions();

  const fetchAllData = async () => {
    setLoadingData(true); // Start loading for all data on this page

    // Wait for global app settings and user role to load
    if (loadingAppSettings || !appSettings || !currentUserRole) {
      setLoadingData(true); // Still loading global data
      return;
    }

    // Now that global data is loaded, check permissions
    if (!canViewModule('services')) {
      setLoadingData(false); // Not authorized, stop loading page data
      return;
    }

    setLoadingData(true); // Start loading page-specific data

    // Fetch categories
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('service_categories')
      .select('*')
      .order('name', { ascending: true });

    if (categoriesError) {
      toast.error('Failed to load service categories: ' + categoriesError.message);
    } else {
      setCategories(categoriesData as ServiceCategory[]);
    }

    // Fetch services
    let serviceQuery = supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        category_id,
        default_price,
        duration_minutes,
        vat_rate,
        created_at,
        service_categories(name)
      `);

    if (searchTerm) {
      serviceQuery = serviceQuery.ilike('name', `%${searchTerm}%`);
    }

    if (filterCategoryId !== 'all') {
      serviceQuery = serviceQuery.eq('category_id', filterCategoryId);
    }

    const { data: servicesData, error: servicesError } = await serviceQuery.order('name', { ascending: true });

    if (servicesError) {
      toast.error('Failed to load services: ' + servicesError.message);
    } else {
      setServices(servicesData as Service[]);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    fetchAllData();
  }, [supabase, searchTerm, filterCategoryId, session, appSettings, currentUserRole, loadingAppSettings, canViewModule]); // Dependencies now include context values and canViewModule

  const handleNewCategoryClick = () => {
    setEditingCategory(undefined);
    setIsCategoryFormOpen(true);
  };

  const handleEditCategoryClick = (category: ServiceCategory) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This will also delete all associated services.')) return;

    const { error } = await supabase
      .from('service_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      toast.error('Failed to delete category: ' + error.message);
    } else {
      toast.success('Category deleted successfully!');
      fetchAllData(); // Re-fetch all data
    }
  };

  const handleNewServiceClick = () => {
    setEditingService(undefined);
    setIsServiceFormOpen(true);
  };

  const handleEditServiceClick = (service: Service) => {
    setEditingService(service);
    setIsServiceFormOpen(true);
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      toast.error('Failed to delete service: ' + error.message);
    } else {
      toast.success('Service deleted successfully!');
      fetchAllData(); // Re-fetch all data
    }
  };

  const handleCategoryFormSuccess = () => {
    setIsCategoryFormOpen(false);
    fetchAllData();
  };

  const handleServiceFormSuccess = () => {
    setIsServiceFormOpen(false);
    fetchAllData();
  };

  const overallLoading = loadingAppSettings || loadingData;

  if (overallLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (!canViewModule('services')) {
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
      <h1 className="text-3xl font-bold mb-6">Services Management</h1>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">All Services</h2>
            {canCreate('services') && (
              <Dialog open={isServiceFormOpen} onOpenChange={setIsServiceFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewServiceClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Service
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingService ? 'Edit Service' : 'Create New Service'}</DialogTitle>
                  </DialogHeader>
                  <ServiceForm initialData={editingService} onSuccess={handleServiceFormSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select onValueChange={setFilterCategoryId} defaultValue={filterCategoryId}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">No services found. Create one!</p>
            ) : (
              services.map((service) => (
                <Card key={service.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {service.name}
                      <div className="flex space-x-2">
                        {canEdit('services') && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditServiceClick(service)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteService(service.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{service.description}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-300">
                      <p>Category: <span className="font-medium">{service.service_categories?.name || 'N/A'}</span></p>
                      <p>Price: <span className="font-medium">{service.default_price.toFixed(2)}</span></p>
                      <p>Duration: <span className="font-medium">{service.duration_minutes} minutes</span></p>
                      <p>VAT Rate: <span className="font-medium">{(service.vat_rate * 100).toFixed(2)}%</span></p>
                      <p>Created At: {format(new Date(service.created_at), 'PPP p')}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Service Categories</h2>
            {canCreate('services') && ( // Using 'services' module for category permissions
              <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewCategoryClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                  </DialogHeader>
                  <ServiceCategoryForm initialData={editingCategory} onSuccess={handleCategoryFormSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">No categories found. Create one!</p>
            ) : (
              categories.map((category) => (
                <Card key={category.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {category.name}
                      {canEdit('services') && ( // Using 'services' module for category permissions
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCategoryClick(category)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{category.description}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-300">
                      <p>Created At: {format(new Date(category.created_at), 'PPP p')}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServicesPage;