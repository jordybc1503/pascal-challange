'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { MessageSquare, Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { whatsAppApi } from '@/lib/api';
import { WhatsAppConfigEditSchema, type WhatsAppConfigFormData } from '@/lib/schemas';

export default function WhatsAppEditPage() {
  const router = useRouter();
  const params = useParams();
  const configId = params.id as string;
  const { user, tenant } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WhatsAppConfigFormData>({
    resolver: zodResolver(WhatsAppConfigEditSchema),
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

  // Load existing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await whatsAppApi.getConfig(configId);
        setValue('provider', config.provider);
        setValue('displayName', config.displayName);
        setValue('phoneNumber', config.phoneNumber);
        setValue('providerAccountId', config.providerAccountId);
        // Note: We don't load accessToken and secret for security reasons
        // User must re-enter them if they want to update
      } catch (error) {
        toast.error('Failed to load configuration');
        console.error(error);
      } finally {
        setIsFetching(false);
      }
    };

    if (user?.role === 'TENANT_ADMIN') {
      loadConfig();
    }
  }, [configId, user, setValue]);

  // Update webhook URL when providerAccountId changes
  useEffect(() => {
    if (providerAccountId) {
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin.replace('5173', '3000')
        : '';
      setWebhookUrl(`${baseUrl}/api/v1/whatsapp/webhook/${providerAccountId}`);
    }
  }, [providerAccountId]);

  const onSubmit = async (data: WhatsAppConfigFormData) => {
    setIsLoading(true);
    try {
      await whatsAppApi.saveConfig(data);
      toast.success('WhatsApp configuration updated successfully!');
      router.push('/settings/whatsapp');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update configuration');
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

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link
            href="/settings/whatsapp"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to configurations
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-green-600 p-3 rounded-full">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit WhatsApp Configuration</h1>
              <p className="text-gray-600">{tenant?.name}</p>
            </div>
          </div>

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
                Leave empty to keep existing token, or enter new token to update
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
                  placeholder="your_verify_token"
                />
                {errors.webhookVerifyToken && (
                  <p className="mt-1 text-sm text-red-600">{errors.webhookVerifyToken.message}</p>
                )}
              </div>
            )}

            {selectedProvider === 'TWILIO' && (
              <div>
                <label htmlFor="secret" className="block text-sm font-medium text-gray-700 mb-2">
                  App Secret
                </label>
                <input
                  {...register('secret')}
                  id="secret"
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Leave empty to keep existing secret
                </p>
                {errors.secret && (
                  <p className="mt-1 text-sm text-red-600">{errors.secret.message}</p>
                )}
              </div>
            )}

            {webhookUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Webhook URL</h3>
                <p className="text-xs text-blue-700 mb-2">
                  Configure this URL in your {selectedProvider === 'META' ? 'Meta' : 'Twilio'} account:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookUrl}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded"
                  />
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Configuration
                  </>
                )}
              </button>
              <Link
                href="/settings/whatsapp"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
