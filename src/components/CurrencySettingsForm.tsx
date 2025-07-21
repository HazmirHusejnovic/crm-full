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
import { Separator } from '@/components/ui/separator'; // Ensure Separator is imported

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
  const { supabase } = useSession();
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
    const { data: currenciesData, error: currenciesError } = await supabase
      .from('currencies')
      .select('*')
      .order('code', { ascending: true });
    if (currenciesError) {
      toast.error('Failed to load currencies: ' + currenciesError.message);
      hasError = true;
    } else {
      setCurrencies(currenciesData);
    }

    // Fetch exchange rates
    const { data: ratesData, error: ratesError } = await supabase
      .from('exchange_rates')
      .select(`
        id,
        from_currency_id,
        to_currency_id,
        rate,
        from_currency:from_currency_id(code, symbol),
        to_currency:to_currency_id(code, symbol)
      `)
      .order('updated_at', { ascending: false });
    if (ratesError) {
      toast.error('Failed to load exchange rates: ' + ratesError.message);
      hasError = true;
    } else {
      setExchangeRates(ratesData as ExchangeRate[]);
    }

    // Fetch app settings for default currency
    const { data: settingsData, error: settingsError } = await supabase
      .from('app_settings')
      .select('default_currency_id')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();
    if (settingsError) {
      console.error('Failed to load app settings for default currency:', settingsError.message);
      // Not critical, can proceed without it
    } else {
      setAppSettings(settingsData);
    }

    setLoading(false);
    // Removed onSuccess?.() here to prevent re-render loop
  };

  useEffect(() => {
    fetchAllData();
  }, [supabase]); // Only re-fetch when supabase client changes (effectively once on mount)

  const handleAddCurrency = async (values: CurrencyFormValues) => {
    const { error } = await supabase.from('currencies').insert(values);
    if (error) {
      toast.error('Failed to add currency: ' + error.message);
    } else {
      toast.success('Currency added successfully!');
      currencyForm.reset();
      fetchAllData(); // Re-fetch internal data
    }
  };

  const handleDeleteCurrency = async (currencyId: string) => {
    if (!window.confirm('Are you sure you want to delete this currency? This will also delete all associated exchange rates.')) return;
    const { error } = await supabase.from('currencies').delete().eq('id', currencyId);
    if (error) {
      toast.error('Failed to delete currency: ' + error.message);
    } else {
      toast.success('Currency deleted successfully!');
      fetchAllData(); // Re-fetch internal data
    }
  };

  const handleSetDefaultCurrency = async (currencyId: string) => {
    const { error: updateDefaultError } = await supabase
      .from('app_settings')
      .update({ default_currency_id: currencyId })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (updateDefaultError) {
      toast.error('Failed to set default currency: ' + updateDefaultError.message);
    } else {
      // Also update is_default flag in currencies table
      const { error: resetDefaultError } = await supabase
        .from('currencies')
        .update({ is_default: false })
        .neq('id', currencyId); // Set all others to false

      if (resetDefaultError) {
        console.error('Error resetting other default currencies:', resetDefaultError.message);
      }

      const { error: setDefaultError } = await supabase
        .from('currencies')
        .update({ is_default: true })
        .eq('id', currencyId);

      if (setDefaultError) {
        console.error('Error setting new default currency:', setDefaultError.message);
      }

      toast.success('Default currency updated successfully!');
      fetchAllData(); // Re-fetch internal data
      onSuccess?.(); // Notify parent to re-fetch app settings
    }
  };

  const handleAddExchangeRate = async (values: ExchangeRateFormValues) => {
    const { error } = await supabase.from('exchange_rates').insert(values);
    if (error) {
      toast.error('Failed to add exchange rate: ' + error.message);
    } else {
      toast.success('Exchange rate added successfully!');
      exchangeRateForm.reset();
      fetchAllData(); // Re-fetch internal data
    }
  };

  const handleDeleteExchangeRate = async (rateId: string) => {
    if (!window.confirm('Are you sure you want to delete this exchange rate?')) return;
    const { error } = await supabase.from('exchange_rates').delete().eq('id', rateId);
    if (error) {
      toast.error('Failed to delete exchange rate: ' + error.message);
    } else {
      toast.success('Exchange rate deleted successfully!');
      fetchAllData(); // Re-fetch internal data
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
                    <p className="text-sm text-muted-foreground">Symbol: {currency.symbol} {currency.is_default && <span className="text-xs text-blue-500">(Default)</span>}</p>
                  </div>
                  <div className="flex space-x-2">
                    {!currency.is_default && (
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