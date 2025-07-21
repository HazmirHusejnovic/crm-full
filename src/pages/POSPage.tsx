import React, { useEffect, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Search, ShoppingCart, XCircle, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Import Select components

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

interface ClientProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const POSPage: React.FC = () => {
  const { supabase, session } = useSession();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]); // New state for clients
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null); // New state for selected client

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

    const fetchClients = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, users(email)')
        .eq('role', 'client');

      if (error) {
        toast.error('Failed to load clients: ' + error.message);
      } else {
        const clientsWithEmails = data.map((profile: any) => ({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.users?.email || 'N/A',
        }));
        setClients(clientsWithEmails);
      }
    };

    fetchProducts();
    fetchClients();
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

  const calculateItemTotal = (item: CartItem) => {
    // Assuming VAT rate is 0 for products in POS for simplicity, or can be added to product schema
    // For now, let's assume no VAT calculation here, just price * quantity
    return item.price * item.quantity;
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const handleProcessSale = async () => {
    if (!session?.user?.id) {
      toast.error('User not authenticated. Please log in.');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty. Add products to proceed.');
      return;
    }

    const loadingToastId = toast.loading('Processing sale...');

    try {
      const invoiceNumber = `POS-${Date.now()}`; // Simple invoice number generation
      const issueDate = new Date().toISOString();
      const dueDate = new Date().toISOString(); // Same as issue date for immediate sale
      const totalAmount = calculateTotal();

      // 1. Create the invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          client_id: selectedClientId, // Use selected client ID
          issue_date: issueDate,
          due_date: dueDate,
          total_amount: totalAmount,
          status: 'paid', // Mark as paid for immediate POS sale
          created_by: session.user.id,
        })
        .select('id')
        .single();

      if (invoiceError) {
        throw new Error('Failed to create invoice: ' + invoiceError.message);
      }

      const invoiceId = invoiceData.id;

      // 2. Prepare invoice items and stock updates
      const invoiceItems = cart.map(item => ({
        invoice_id: invoiceId,
        service_id: null, // Products are not services
        description: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        vat_rate: 0, // Assuming 0 VAT for simplicity in POS, adjust if needed
        total: calculateItemTotal(item),
      }));

      const stockUpdates = cart.map(item => ({
        id: item.id,
        new_stock_quantity: item.stock_quantity - item.quantity,
      }));

      // 3. Insert invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);

      if (itemsError) {
        throw new Error('Failed to add invoice items: ' + itemsError.message);
      }

      // 4. Update product stock quantities
      for (const update of stockUpdates) {
        const { error: stockUpdateError } = await supabase
          .from('products')
          .update({ stock_quantity: update.new_stock_quantity })
          .eq('id', update.id);

        if (stockUpdateError) {
          console.error(`Failed to update stock for product ${update.id}:`, stockUpdateError.message);
          // Decide if you want to roll back or just log and continue
          // For now, we'll just log and let the sale proceed, but in a real app, you might want to handle this more robustly.
        }
      }

      toast.success('Sale processed successfully!', { id: loadingToastId });
      setCart([]); // Clear cart
      setSelectedClientId(null); // Clear selected client
      // Optionally navigate to the new invoice or a confirmation page
      navigate(`/invoices/print/${invoiceId}`); // Navigate to printable invoice
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred during sale processing.', { id: loadingToastId });
    }
  };

  const handleFiscalizeSale = () => {
    // This is a placeholder for actual fiscalization logic.
    // In a real application, you would make an API call to your fiscalization service here.
    // This might involve sending the invoice details, receiving a fiscal receipt number, etc.
    toast.success('Sale fiscalized successfully! (Placeholder)');
    console.log('Fiscalizing sale...');
    // After successful fiscalization, you might update the invoice record with fiscal data
    // or trigger a print of the fiscal receipt.
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
            <div className="mb-4">
              <label htmlFor="client-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Client (Optional)</label>
              <Select onValueChange={(value) => setSelectedClientId(value === 'null-value' ? null : value)} value={selectedClientId || 'null-value'}>
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Walk-in Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="null-value">Walk-in Customer</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                <Button onClick={handleFiscalizeSale} className="w-full mt-2" variant="outline">
                  <Receipt className="mr-2 h-4 w-4" /> Fiscalize Sale (Placeholder)
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