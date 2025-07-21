import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Search, ShoppingCart, XCircle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  product_categories: { name: string } | null;
}

interface CartItem extends Product {
  quantity: number;
}

const POSPage: React.FC = () => {
  const { supabase } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          stock_quantity,
          sku,
          product_categories(name)
        `)
        .order('name', { ascending: true });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        toast.error('Failed to load products: ' + error.message);
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [supabase, searchTerm]);

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          toast.error(`Cannot add more ${product.name}. Max stock reached.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        if (product.stock_quantity === 0) {
          toast.error(`${product.name} is out of stock.`);
          return prevCart;
        }
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.id === productId) {
          if (newQuantity > item.stock_quantity) {
            toast.error(`Cannot add more ${item.name}. Max stock reached.`);
            return item; // Don't update if quantity exceeds stock
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0); // Remove if quantity becomes 0
    });
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleProcessSale = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Add products to proceed.');
      return;
    }
    // TODO: Implement actual sale processing (create invoice, update stock)
    toast.info('Processing sale... (Feature coming soon!)');
    console.log('Sale to process:', cart);
    // For now, clear the cart after "processing"
    setCart([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col lg:flex-row gap-6">
      <div className="flex-1">
        <h1 className="text-3xl font-bold mb-6">Point of Sale</h1>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.length === 0 ? (
            <p className="col-span-full text-center text-gray-500">No products found.</p>
          ) : (
            products.map((product) => (
              <Card
                key={product.id}
                className="flex flex-col cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => addToCart(product)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.description}</p>
                  <div className="text-xs text-gray-500 dark:text-gray-300">
                    <p>Price: <span className="font-medium">${product.price.toFixed(2)}</span></p>
                    <p>Stock: <span className={`font-medium ${product.stock_quantity <= 5 && product.stock_quantity > 0 ? 'text-orange-500' : product.stock_quantity === 0 ? 'text-red-500' : 'text-green-600'}`}>{product.stock_quantity}</span></p>
                    <p>Category: <span className="font-medium">{product.product_categories?.name || 'N/A'}</span></p>
                    <p>SKU: <span className="font-medium">{product.sku || 'N/A'}</span></p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="lg:w-1/3 w-full flex-shrink-0">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <ShoppingCart className="mr-2 h-5 w-5" /> Cart
              <span className="text-sm text-muted-foreground">({cart.length} items)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-center text-gray-500">Your cart is empty.</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)} x
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value))}
                          className="w-16 inline-block mx-2 text-center"
                        />
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-bold">Total:</span>
                  <span className="text-xl font-bold">${calculateTotal().toFixed(2)}</span>
                </div>
                <Button onClick={handleProcessSale} className="w-full mt-4">
                  Process Sale
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSPage;