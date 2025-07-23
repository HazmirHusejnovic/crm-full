import React, { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form'; // Use useFormContext for nested forms
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, // Keep Form for context, but individual fields use FormField
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
import { Trash2 } from 'lucide-react';
import { Textarea } from './ui/textarea'; // Ensure Textarea is imported
import api from '@/lib/api'; // Import novog API klijenta

export const invoiceItemFormSchema = z.object({
  service_id: z.string().uuid().nullable().optional(),
  description: z.string().min(1, { message: 'Description is required.' }),
  quantity: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0.01, { message: 'Quantity must be greater than 0.' })
  ),
  unit_price: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0, { message: 'Unit price must be non-negative.' })
  ),
  vat_rate: z.preprocess(
    (val) => parseFloat(String(val)),
    z.number().min(0).max(1, { message: 'VAT rate must be between 0 and 1 (e.g., 0.17 for 17%).' })
  ),
});

export type InvoiceItemFormValues = z.infer<typeof invoiceItemFormSchema>;

interface Service {
  id: string;
  name: string;
  description: string | null;
  default_price: number;
  vat_rate: number;
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

interface InvoiceItemFormProps {
  index: number;
  onRemove: (index: number) => void;
  invoiceCurrencyId: string | null; // New prop: the currency selected for the invoice
  appDefaultCurrencyId: string | null; // New prop: the app's default currency
  exchangeRates: ExchangeRate[]; // New prop: all available exchange rates
  currencies: Currency[]; // New prop: all available currencies
}

const InvoiceItemForm: React.FC<InvoiceItemFormProps> = ({
  index,
  onRemove,
  invoiceCurrencyId,
  appDefaultCurrencyId,
  exchangeRates,
  currencies,
}) => {
  const { session } = useSession(); // Session context više ne pruža supabase direktno
  const [services, setServices] = useState<Service[]>([]);
  const [defaultVatRate, setDefaultVatRate] = useState<number>(0.17); // Default fallback
  const { control, setValue, trigger, getValues } = useFormContext(); // Get control from parent context

  useEffect(() => {
    const fetchSettingsAndServices = async () => {
      // Fetch default VAT rate
      try {
        const { data: settingsData } = await api.get('/app-settings'); // Pretpostavljena ruta
        if (settingsData) {
          setDefaultVatRate(settingsData.default_vat_rate);
        }
      } catch (error: any) {
        console.error('Failed to load default VAT rate from settings:', error.response?.data || error.message);
      }

      // Fetch services
      try {
        const { data } = await api.get('/services'); // Pretpostavljena ruta
        setServices(data);
      } catch (error: any) {
        toast.error('Failed to load services: ' + (error.response?.data?.message || error.message));
      }
    };
    fetchSettingsAndServices();
  }, []);

  // Set default VAT rate for new items if it changes
  useEffect(() => {
    const currentVatRate = getValues(`items.${index}.vat_rate`);
    // Only set if it's a new item (no service_id selected yet) and current VAT is 0 or default
    if (!getValues(`items.${index}.service_id`) && (currentVatRate === 0 || currentVatRate === 0.17)) {
      setValue(`items.${index}.vat_rate`, defaultVatRate);
    }
  }, [defaultVatRate, index, setValue, getValues]);

  const getExchangeRate = (fromCurrencyId: string, toCurrencyId: string): number => {
    if (fromCurrencyId === toCurrencyId) return 1;
    const rate = exchangeRates.find(
      (r) => r.from_currency_id === fromCurrencyId && r.to_currency_id === toCurrencyId
    );
    return rate ? rate.rate : 0;
  };

  const convertPrice = (price: number, fromCurrencyId: string, toCurrencyId: string): number => {
    if (!fromCurrencyId || !toCurrencyId || fromCurrencyId === toCurrencyId) {
      return price;
    }
    const rate = getExchangeRate(fromCurrencyId, toCurrencyId);
    if (rate === 0) {
      // Fallback to original price if no rate, and show a warning
      console.warn(`No exchange rate found from ${fromCurrencyId} to ${toCurrencyId}. Using original price.`);
      return price;
    }
    return price * rate;
  };

  const handleServiceChange = (serviceId: string) => {
    if (serviceId === 'custom') {
      setValue(`items.${index}.service_id`, null);
      setValue(`items.${index}.description`, '');
      setValue(`items.${index}.quantity`, 1);
      setValue(`items.${index}.unit_price`, 0);
      setValue(`items.${index}.vat_rate`, defaultVatRate); // Use default VAT for custom
    } else {
      const selectedService = services.find(s => s.id === serviceId);
      if (selectedService) {
        setValue(`items.${index}.service_id`, selectedService.id);
        setValue(`items.${index}.description`, selectedService.name || '');
        // Convert service's default_price from app default currency to invoice currency
        const convertedPrice = convertPrice(
          selectedService.default_price || 0,
          appDefaultCurrencyId || '', // Services prices are assumed to be in app's default currency
          invoiceCurrencyId || ''
        );
        setValue(`items.${index}.unit_price`, convertedPrice);
        setValue(`items.${index}.vat_rate`, selectedService.vat_rate || 0);
        setValue(`items.${index}.quantity`, 1);
      }
    }
    // Trigger validation for the updated fields
    trigger([
      `items.${index}.service_id`,
      `items.${index}.description`,
      `items.${index}.quantity`,
      `items.${index}.unit_price`,
      `items.${index}.vat_rate`,
    ]);
  };

  const getCurrencySymbol = (currencyId: string | null): string => {
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? currency.symbol : '$'; // Default to $ if not found
  };

  const currentCurrencySymbol = getCurrencySymbol(invoiceCurrencyId);

  return (
    <div className="border p-4 rounded-md space-y-3 bg-muted/20">
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <FormField
        control={control}
        name={`items.${index}.service_id`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Link to Service</FormLabel>
            <Select onValueChange={handleServiceChange} value={field.value || 'custom'}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service or custom item" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="custom">Custom Item</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`items.${index}.description`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Item description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1.00"
                  {...field}
                  value={field.value?.toString() || ''}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.unit_price`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price ({currentCurrencySymbol})</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value?.toString() || ''}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.vat_rate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>VAT Rate</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value?.toString() || ''}
                  onChange={e => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default InvoiceItemForm;