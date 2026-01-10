'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Settings, Trash2, Power } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { whatsAppApi } from '@/lib/api';
import { toast } from 'sonner';
import type { WhatsAppConfigResponse } from '@/lib/schemas';

export default function WhatsAppIndexPage() {
  const { user, tenant } = useAuth();
  const [configs, setConfigs] = useState<WhatsAppConfigResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'TENANT_ADMIN') {
      fetchConfigs();
    }
  }, [user]);

  const fetchConfigs = async () => {
    try {
      const result = await whatsAppApi.listConfigs();
      setConfigs(result);
    } catch (error) {
      console.error('Failed to fetch configs:', error);
      toast.error('Failed to load WhatsApp configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const updated = await whatsAppApi.toggleStatus(id);
      setConfigs(configs.map(c => c.id === id ? updated : c));
      toast.success(`Configuration ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Failed to toggle status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string, displayName: string) => {
    if (!confirm(`Are you sure you want to delete "${displayName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await whatsAppApi.deleteConfig(id);
      setConfigs(configs.filter(c => c.id !== id));
      toast.success('Configuration deleted successfully');
    } catch (error) {
      console.error('Failed to delete config:', error);
      toast.error('Failed to delete configuration');
    }
  };

  if (user?.role !== 'TENANT_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Only tenant administrators can manage WhatsApp configurations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-600 p-3 rounded-full">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">WhatsApp Configurations</h1>
                  <p className="text-gray-600">{tenant?.name}</p>
                </div>
              </div>
              <Link
                href="/settings/whatsapp/create"
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Configuration
              </Link>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <p className="mt-4 text-gray-600">Loading configurations...</p>
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No configurations yet</h3>
                <p className="text-gray-600 mb-6">
                  Get started by adding your first WhatsApp configuration
                </p>
                <Link
                  href="/settings/whatsapp/create"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Configuration
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {configs.map((config) => (
                  <div
                    key={config.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {config.displayName}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              config.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {config.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {config.provider}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Phone:</span> {config.phoneNumber}
                          </p>
                          <p>
                            <span className="font-medium">Provider Account ID:</span>{' '}
                            {config.providerAccountId}
                          </p>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(config.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Link
                          href={`/settings/whatsapp/${config.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit configuration"
                        >
                          <Settings className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(config.id)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Toggle active status"
                        >
                          <Power className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(config.id, config.displayName)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete configuration"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
