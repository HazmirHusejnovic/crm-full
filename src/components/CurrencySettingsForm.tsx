import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from './LoadingSpinner';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api'; // Import novog API klijenta

// Schemas
const currencySchema = z.object({
  code: z.string().min(2, { message: 'Code must be at least 2 characters.' }).max(5).toUpperCase(),
  name: z.string().min(1, { message: 'Name is required.' }),
  symbol: z.string().min(1, { message: 'Symbol is required.' }).max(5),
});

const exchangeRateSchema = z.object({
  from_currency_id: z.string().uuid({ message: 'From currency is required.' }),
  to_currency_id: z.string().uuid({ message: 'To currency is required.' }),
  rate: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0.000001, { message: 'Rate must be greater than 0.' })
  ),
});

// Types
type CurrencyFormValues = z.infer<typeof currencySchema>;
type ExchangeRateFormValues = z.infer<typeof exchangeRateSchema>;

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  is_default: boolean;
}

interface ExchangeRate {
  id: string;
  from_currency_id: string;
  to_currency_id: string;
  rate: number;
  from_currency: { code: string; symbol: string };
  to_currency: { code: string; symbol: string };
}

interface AppSettings {
  default_currency_id: string | null;
}

interface CurrencySettingsFormProps {
  onSuccess?: () => void;
}

const CurrencySettingsForm: React.FC<CurrencySettingsFormProps> = ({ onSuccess }) => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const currencyForm = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: { code: '', name: '', symbol: '' },
  });

  const exchangeRateForm = useForm<ExchangeRateFormValues>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: { from_currency_id: '', to_currency_id: '', rate: 1 },
  });

  const fetchAllData = async () => {
    setLoading(true);
    let hasError = false;

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
      setExchangeRates(ratesData as ExchangeRate[]);
    } catch (error: any) {
      toast.error('Failed to load exchange rates: ' + (error.response?.data?.message || error.message));
      hasError = true;
    }

    // Fetch app settings for default currency
    try {
      const { data: settingsData } = await api.get('/app-settings'); // Pretpostavljena ruta
      setAppSettings(settingsData);
    } catch (error: any) {
      console.error('Failed to load app settings for default currency:', error.response?.data || error.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []); // Samo jednom pri montiranju

  const handleAddCurrency = async (values: CurrencyFormValues) => {
    try {
      await api.post('/currencies', values); // Pretpostavljena ruta
      toast.success('Currency added successfully!');
      currencyForm.reset();
      fetchAllData();
    } catch (error: any) {
      toast.error('Failed to add currency: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteCurrency = async (currencyId: string) => {
    if (!window.confirm('Are you sure you want to delete this currency? This will also delete all associated exchange rates.')) return;
    try {
      await api.delete(`/currencies/${currencyId}`); // Pretpostavljena ruta
      toast.success('Currency deleted successfully!');
      fetchAllData();
    } catch (error: any) {
      toast.error('Failed to delete currency: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSetDefaultCurrency = async (currencyId: string) => {
    try {
      // Pretpostavljena ruta za ažuriranje default valute u app_settings
      await api.put('/app-settings/default-currency', { default_currency_id: currencyId });
      // Ažuriranje is_default flag-a u currencies tabeli (ako je potrebno, vaš API bi to trebao riješiti)
      toast.success('Default currency updated successfully!');
      fetchAllData();
      onSuccess?.();
    } catch (error: any) {
      toast.error('Failed to set default currency: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAddExchangeRate = async (values: ExchangeRateFormValues) => {
    try {
      await api.post('/exchange-rates', values); // Pretpostavljena ruta
      toast.success('Exchange rate added successfully!');
      exchangeRateForm.reset();
      fetchAllData();
    } catch (error: any) {
      toast.error('Failed to add exchange rate: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteExchangeRate = async (rateId: string) => {
    if (!window.confirm('Are you sure you want to delete this exchange rate?')) return;
    try {
      await api.delete(`/exchange-rates/${rateId}`); // Pretpostavljena ruta
      toast.success('Exchange rate deleted successfully!');
      fetchAllData();
    } catch (error: any) {
      toast.error('Failed to delete exchange rate: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <LoadingSpinner size={48} className="min-h-[300px]" />;
  }

  return (
    <div className="space-y-8">
      {/* Currency Management */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Currencies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...currencyForm}>
            <form onSubmit={currencyForm.handleSubmit(handleAddCurrency)} className="flex flex-col sm:flex-row gap-4">
              <FormField
                control={currencyForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Code (e.g., BAM)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={currencyForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Name (e.g., Bosnian Mark)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={currencyForm.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Symbol (e.g., KM)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="self-end">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Currency
              </Button>
            </form>
          </Form>

          <Separator />

          <h3 className="text-lg font-semibold">Existing Currencies</h3>
          {currencies.length === 0 ? (
            <p className="text-center text-muted-foreground">No currencies defined.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currencies.map((currency) => (
                <div key={currency.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">{currency.name} ({currency.code})</p>
                    <p className="text-sm text-muted-foreground">Symbol: {currency.symbol} {appSettings?.default_currency_id === currency.id && <span className="text-xs text-blue-500">(Default)</span>}</p>
                  </div>
                  <div className="flex space-x-2">
                    {appSettings?.default_currency_id !== currency.id && (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefaultCurrency(currency.id)}>
                        Set Default
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCurrency(currency.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exchange Rate Management */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Exchange Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...exchangeRateForm}>
            <form onSubmit={exchangeRateForm.handleSubmit(handleAddExchangeRate)} className="flex flex-col sm:flex-row gap-4">
              <FormField
                control={exchangeRateForm.control}
                name="from_currency_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>From Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={exchangeRateForm.control}
                name="to_currency_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>To Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={exchangeRateForm.control}
                name="rate"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" placeholder="1.00" {...field} onChange={e => field.onChange(e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="self-end">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Rate
              </Button>
            </form>
          </Form>

          <Separator />

          <h3 className="text-lg font-semibold">Existing Exchange Rates</h3>
          {exchangeRates.length === 0 ? (
            <p className="text-center text-muted-foreground">No exchange rates defined.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exchangeRates.map((rate) => (
                <div key={rate.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <p className="font-medium">
                      {rate.from_currency.code} to {rate.to_currency.code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      1 {rate.from_currency.symbol} = {rate.rate.toFixed(6)} {rate.to_currency.symbol}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteExchangeRate(rate.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CurrencySettingsForm;