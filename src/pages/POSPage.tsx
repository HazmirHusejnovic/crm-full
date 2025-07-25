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
} from '@/components/ui/select';
import api from '@/lib/api'; // Import novog API klijenta

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  sku: string | null;
  vat_rate: number;
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
  default_currency_id: string | null;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
}

interface ExchangeRate {
  from_currency_id: string;
  to_currency_id: string;
  rate: number;
}

const POSPage: React.FC = () => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('cash');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string | null>(null);
  const [appDefaultCurrencyId, setAppDefaultCurrencyId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let hasError = false;

      if (session) {
        try {
          const { data: roleData } = await api.get(`/profiles/${session.user.id}`); // Pretpostavljena ruta
          setCurrentUserRole(roleData.role);
          if (roleData.role !== 'worker' && roleData.role !== 'administrator') {
            setLoading(false);
            return; // Exit if not authorized
          }
        } catch (error: any) {
          console.error('Error fetching user role:', error.response?.data || error.message);
          toast.error('Failed to fetch your user role.');
          hasError = true;
        }
      } else {
        setLoading(false);
        return; // Exit if not logged in
      }

      // Fetch app settings for default currency
      try {
        const { data: appSettings } = await api.get('/app-settings'); // Pretpostavljena ruta
        setAppDefaultCurrencyId(appSettings?.default_currency_id || null);
        if (!selectedCurrencyId) { // Set initial selected currency to app default if not already set
          setSelectedCurrencyId(appSettings?.default_currency_id || null);
        }
      } catch (error: any) {
        console.error('Failed to load app settings:', error.response?.data || error.message);
        toast.error('Failed to load app settings.');
        hasError = true;
      }

      // Fetch currencies
      try {
        const { data: currenciesData } = await api.get('/currencies'); // Pretpostavljena ruta
        setCurrencies(currenciesData);
      } catch (error: any) {
        toast.error('Failed to load currencies: ' + (error.response?.data?.message || error.message));
        hasError = true;
      }

      // Fetch exchange rates
      try {
        const { data: ratesData } = await api.get('/exchange-rates'); // Pretpostavljena ruta
        setExchangeRates(ratesData);
      } catch (error: any) {
        toast.error('Failed to load exchange rates: ' + (error.response?.data?.message || error.message));
        hasError = true;
      }

      // Fetch products
      try {
        const { data: productsData } = await api.get('/products', { params: { searchTerm } }); // Pretpostavljena ruta
        setProducts(productsData as Product[]);
      } catch (error: any) {
        toast.error('Failed to load products: ' + (error.response?.data?.message || error.message));
        hasError = true;
      }

      // Fetch clients
      try {
        const { data: clientsData } = await api.get('/profiles?role=client'); // Pretpostavljena ruta
        setClients(clientsData as ClientProfile[]);
      } catch (error: any) {
        toast.error('Failed to load clients: ' + (error.response?.data?.message || error.message));
        hasError = true;
      }

      setLoading(false);
    };

    fetchData();
  }, [searchTerm, selectedCurrencyId, session]);

  // Update selected currency when client changes
  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client?.default_currency_id) {
        setSelectedCurrencyId(client.default_currency_id);
      } else {
        setSelectedCurrencyId(appDefaultCurrencyId); // Fallback to app default
      }
    } else {
      setSelectedCurrencyId(appDefaultCurrencyId); // Reset to app default if no client selected
    }
  }, [selectedClientId, clients, appDefaultCurrencyId]);

  const getExchangeRate = (fromCurrencyId: string, toCurrencyId: string): number => {
    if (fromCurrencyId === toCurrencyId) return 1;
    const rate = exchangeRates.find(
      (r) => r.from_currency_id === fromCurrencyId && r.to_currency_id === toCurrencyId
    );
    return rate ? rate.rate : 0; // Return 0 if no direct rate found, handle error appropriately
  };

  const convertPrice = (price: number, productCurrencyId: string, targetCurrencyId: string): number => {
    if (!productCurrencyId || !targetCurrencyId || productCurrencyId === targetCurrencyId) {
      return price;
    }

    const rate = getExchangeRate(productCurrencyId, targetCurrencyId);
    if (rate === 0) {
      toast.warning(`No exchange rate found from product's currency to selected currency. Using original price.`);
      return price; // Fallback to original price if no rate
    }
    return price * rate;
  };

  const getCurrencySymbol = (currencyId: string | null): string => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.symbol : '$'; // Default to $ if not found
  };

  const calculateItemTotal = (item: CartItem) => {
    // Assuming product.price is in the app's default currency
    const convertedPrice = convertPrice(item.price, appDefaultCurrencyId || '', selectedCurrencyId || '');
    return convertedPrice * item.quantity * (1 + item.vat_rate);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

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

  const handleProcessSale = async () => {
    if (!session?.user?.id) {
      toast.error('User not authenticated. Please log in.');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty. Add products to proceed.');
      return;
    }

    if (!selectedCurrencyId) {
      toast.error('Please select a currency for the sale.');
      return;
    }

    const loadingToastId = toast.loading('Processing sale...');

    try {
      const invoiceNumber = `POS-${Date.now()}`; // Simple invoice number generation
      const issueDate = new Date().toISOString();
      const dueDate = new Date().toISOString(); // Same as issue date for immediate sale
      const totalAmount = calculateTotal();

      // 1. Create the invoice
      const { data: invoiceData } = await api.post('/invoices', { // Pretpostavljena ruta
        invoice_number: invoiceNumber,
        client_id: selectedClientId,
        issue_date: issueDate,
        due_date: dueDate,
        total_amount: totalAmount,
        status: 'paid', // Mark as paid for immediate POS sale
        created_by: session.user.id,
        currency_id: selectedCurrencyId, // Save the selected currency with the invoice
      });

      const invoiceId = invoiceData.id;

      // 2. Prepare invoice items and stock updates
      const invoiceItems = cart.map(item => ({
        invoice_id: invoiceId,
        service_id: null, // Products are not services
        description: item.name,
        quantity: item.quantity,
        unit_price: convertPrice(item.price, appDefaultCurrencyId || '', selectedCurrencyId || ''), // Store unit price in invoice currency
        vat_rate: item.vat_rate, // Use product's VAT rate
        total: calculateItemTotal(item),
      }));

      const stockUpdates = cart.map(item => ({
        id: item.id,
        new_stock_quantity: item.stock_quantity - item.quantity,
      }));

      // 3. Insert invoice items
      await api.post('/invoice-items/bulk', invoiceItems); // Pretpostavljena ruta za bulk insert

      // 4. Update product stock quantities
      for (const update of stockUpdates) {
        try {
          await api.put(`/products/${update.id}/stock`, { stock_quantity: update.new_stock_quantity }); // Pretpostavljena ruta
        } catch (stockUpdateError: any) {
          console.error(`Failed to update stock for product ${update.id}:`, stockUpdateError.response?.data || stockUpdateError.message);
          // Decide if you want to roll back or just log and continue
          // For now, we'll just log and let the sale proceed, but in a real app, you might want to handle this more robustly.
        }
      }

      toast.success('Sale processed successfully!', { id: loadingToastId });
      setCart([]); // Clear cart
      setSelectedClientId(null); // Clear selected client
      setSelectedPaymentMethod('cash'); // Reset payment method
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

  if (currentUserRole !== 'worker' && currentUserRole !== 'administrator') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const currentCurrencySymbol = getCurrencySymbol(selectedCurrencyId);

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
                    <p>Price: <span className="font-medium">{currentCurrencySymbol}{convertPrice(product.price, appDefaultCurrencyId || '', selectedCurrencyId || '').toFixed(2)}</span></p>
                    <p>Stock: <span className={`font-medium ${product.stock_quantity <= 5 && product.stock_quantity > 0 ? 'text-orange-500' : product.stock_quantity === 0 ? 'text-red-500' : 'text-green-600'}`}>{product.stock_quantity}</span></p>
                    <p>Category: <span className="font-medium">{product.product_categories?.name || 'N/A'}</span></p>
                    <p>SKU: <span className="font-medium">{product.sku || 'N/A'}</span></p>
                    <p>VAT Rate: <span className="font-medium">{(product.vat_rate * 100).toFixed(2)}%</span></p>
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

            <div className="mb-4">
              <label htmlFor="currency-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Currency</label>
              <Select onValueChange={setSelectedCurrencyId} value={selectedCurrencyId || ''}>
                <SelectTrigger id="currency-select">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.id} value={currency.id}>
                      {currency.name} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <label htmlFor="payment-method-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
              <Select onValueChange={setSelectedPaymentMethod} value={selectedPaymentMethod}>
                <SelectTrigger id="payment-method-select">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
                        {currentCurrencySymbol}{convertPrice(item.price, appDefaultCurrencyId || '', selectedCurrencyId || '').toFixed(2)} x {item.quantity} (VAT: {(item.vat_rate * 100).toFixed(2)}%)
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <p className="font-semibold">{currentCurrencySymbol}{calculateItemTotal(item).toFixed(2)}</p>
                      <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}>
                        <XCircle className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-bold">Total (incl. VAT):</span>
                  <span className="text-xl font-bold">{currentCurrencySymbol}{calculateTotal().toFixed(2)}</span>
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