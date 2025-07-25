import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductCategoryForm from '@/components/ProductCategoryForm';
import ProductForm from '@/components/ProductForm';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';
import LoadingSpinner from '@/components/LoadingSpinner';
import api from '@/lib/api'; // Import novog API klijenta

interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category_id: string | null;
  sku: string | null;
  vat_rate: number;
  created_at: string;
  product_categories: { name: string } | null;
}

const ProductsPage: React.FC = () => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | undefined>(undefined);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const { data } = await api.get('/product-categories'); // Pretpostavljena ruta
      setCategories(data as ProductCategory[]);
    } catch (error: any) {
      toast.error('Failed to load product categories: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const params: any = {};
      if (searchTerm) {
        params.name = searchTerm;
      }
      if (filterCategoryId !== 'all') {
        params.category_id = filterCategoryId;
      }
      const { data } = await api.get('/products', { params }); // Pretpostavljena ruta
      setProducts(data as Product[]);
    } catch (error: any) {
      toast.error('Failed to load products: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (session) {
      const fetchUserRole = async () => {
        try {
          const { data } = await api.get(`/profiles/${session.user.id}`); // Pretpostavljena ruta
          setCurrentUserRole(data.role);
        } catch (error: any) {
          console.error('Error fetching user role:', error.response?.data || error.message);
          toast.error('Failed to fetch your user role.');
        }
      };
      fetchUserRole();
    }
    fetchCategories();
  }, [session]);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, filterCategoryId]);

  const handleNewCategoryClick = () => {
    setEditingCategory(undefined);
    setIsCategoryFormOpen(true);
  };

  const handleEditCategoryClick = (category: ProductCategory) => {
    setEditingCategory(category);
    setIsCategoryFormOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Are you sure you want to delete this category? Products linked to this category will have their category set to null.')) return;

    try {
      await api.delete(`/product-categories/${categoryId}`); // Pretpostavljena ruta
      toast.success('Category deleted successfully!');
      fetchCategories();
      fetchProducts(); // Refresh products as well
    } catch (error: any) {
      toast.error('Failed to delete category: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleNewProductClick = () => {
    setEditingProduct(undefined);
    setIsProductFormOpen(true);
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setIsProductFormOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/products/${productId}`); // Pretpostavljena ruta
      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error: any) {
      toast.error('Failed to delete product: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCategoryFormSuccess = () => {
    setIsCategoryFormOpen(false);
    fetchCategories();
  };

  const handleProductFormSuccess = () => {
    setIsProductFormOpen(false);
    fetchProducts();
  };

  const canManageProducts = currentUserRole === 'administrator'; // Only admins can manage products/categories

  if (loadingCategories || loadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  if (currentUserRole !== 'administrator') {
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
      <h1 className="text-3xl font-bold mb-6">Product & Inventory Management</h1>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">All Products</h2>
            {canManageProducts && (
              <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleNewProductClick}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
                  </DialogHeader>
                  <ProductForm initialData={editingProduct} onSuccess={handleProductFormSuccess} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name or SKU..."
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
            {products.length === 0 ? (
              <p className="col-span-full text-center text-gray-500">No products found. Create one!</p>
            ) : (
              products.map((product) => (
                <Card key={product.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {product.name}
                      <div className="flex space-x-2">
                        {canManageProducts && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEditProductClick(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.description}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-300">
                      <p>Price: <span className="font-medium">${product.price.toFixed(2)}</span></p>
                      <p>Stock: <span className={`font-medium ${product.stock_quantity <= 5 && product.stock_quantity > 0 ? 'text-orange-500' : product.stock_quantity === 0 ? 'text-red-500' : 'text-green-600'}`}>{product.stock_quantity}</span></p>
                      <p>Category: <span className="font-medium">{product.product_categories?.name || 'N/A'}</span></p>
                      <p>SKU: <span className="font-medium">{product.sku || 'N/A'}</span></p>
                      <p>VAT Rate: <span className="font-medium">{(product.vat_rate * 100).toFixed(2)}%</span></p>
                      <p>Created At: {format(new Date(product.created_at), 'PPP p')}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Product Categories</h2>
            {canManageProducts && (
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
                  <ProductCategoryForm initialData={editingCategory} onSuccess={handleCategoryFormSuccess} />
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
                      {canManageProducts && (
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

export default ProductsPage;