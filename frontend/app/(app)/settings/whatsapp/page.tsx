'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { MessageSquare, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const WhatsAppConfigSchema = z.object({
  provider: z.enum(['META', 'TWILIO']),
  displayName: z.string().min(1, 'Display name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  providerAccountId: z.string().min(1, 'Provider account ID is required'),
  accessToken: z.string().min(1, 'Access token is required'),
  webhookVerifyToken: z.string().optional(),
  secret: z.string().optional(),
});

type WhatsAppConfigFormData = z.infer<typeof WhatsAppConfigSchema>;

export default function WhatsAppConfigPage() {
  const { user, tenant } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [existingConfig, setExistingConfig] = useState<any>(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<WhatsAppConfigFormData>({
    resolver: zodResolver(WhatsAppConfigSchema),
    defaultValues: {
      provider: 'META',
      displayName: '',
      phoneNumber: '',
      providerAccountId: '',
      accessToken: '',
      webhookVerifyToken: '',
      secret: '',
    },
  });

  const selectedProvider = watch('provider');
  const providerAccountId = watch('providerAccountId');

  useEffect(() => {
    if (providerAccountId) {
      setWebhookUrl(`${window.location.origin.replace('5173', '3000')}/api/v1/whatsapp/webhook/${providerAccountId}`);
    }
  }, [providerAccountId]);

  useEffect(() => {
    if (user?.role === 'TENANT_ADMIN') {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/v1/whatsapp/config', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setExistingConfig(result.data);
          // Don't populate sensitive data, only display name and phone
          reset({
            provider: result.data.provider,
            displayName: result.data.displayName,
            phoneNumber: result.data.phoneNumber,
            providerAccountId: result.data.providerAccountId,
            accessToken: '',
            webhookVerifyToken: '',
            secret: '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const onSubmit = async (data: WhatsAppConfigFormData) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/v1/whatsapp/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save configuration');
      }

      toast.success('WhatsApp configuration saved successfully!');
      fetchConfig();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('Webhook URL copied to clipboard!');
  };

  if (user?.role !== 'TENANT_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only tenant administrators can configure WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-600 p-3 rounded-full">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WhatsApp Configuration</h1>
              <p className="text-gray-600">{tenant?.name}</p>
            </div>
          </div>

          {existingConfig && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ WhatsApp is configured for <strong>{existingConfig.displayName}</strong> ({existingConfig.phoneNumber})
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider
              </label>
              <select
                {...register('provider')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="META">Meta (Facebook/WhatsApp Business)</option>
                <option value="TWILIO">Twilio</option>
              </select>
              {errors.provider && (
                <p className="mt-1 text-sm text-red-600">{errors.provider.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                {...register('displayName')}
                id="displayName"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="My Business"
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                {...register('phoneNumber')}
                id="phoneNumber"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="+1234567890"
              />
              <p className="mt-1 text-xs text-gray-500">Include country code</p>
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="providerAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                {selectedProvider === 'META' ? 'Phone Number ID' : 'Account SID'}
              </label>
              <input
                {...register('providerAccountId')}
                id="providerAccountId"
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={selectedProvider === 'META' ? '1234567890123456' : 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              />
              <p className="mt-1 text-xs text-gray-500">
                {selectedProvider === 'META' 
                  ? 'Found in WhatsApp Business API settings' 
                  : 'Found in Twilio console'}
              </p>
              {errors.providerAccountId && (
                <p className="mt-1 text-sm text-red-600">{errors.providerAccountId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
                {selectedProvider === 'META' ? 'Access Token' : 'Auth Token'}
              </label>
              <input
                {...register('accessToken')}
                id="accessToken"
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500">
                {existingConfig ? 'Leave empty to keep existing token' : 'Required for first setup'}
              </p>
              {errors.accessToken && (
                <p className="mt-1 text-sm text-red-600">{errors.accessToken.message}</p>
              )}
            </div>

            {selectedProvider === 'META' && (
              <div>
                <label htmlFor="webhookVerifyToken" className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook Verify Token (Optional)
                </label>
                <input
                  {...register('webhookVerifyToken')}
                  id="webhookVerifyToken"
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="my_verify_token_123"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Used for webhook verification with Meta
                </p>
              </div>
            )}

            <div>
              <label htmlFor="secret" className="block text-sm font-medium text-gray-700 mb-2">
                {selectedProvider === 'META' ? 'App Secret (Optional)' : 'Auth Token Secret'}
              </label>
              <input
                {...register('secret')}
                id="secret"
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {webhookUrl && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-2">Webhook URL</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={copyWebhookUrl}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-blue-700">
                      Configure this URL in your {selectedProvider === 'META' ? 'Meta' : 'Twilio'} webhook settings
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              {isLoading ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
