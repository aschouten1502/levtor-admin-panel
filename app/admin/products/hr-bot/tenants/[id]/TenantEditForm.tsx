'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tenant } from '@/lib/admin/tenant-service';

interface TenantEditFormProps {
  tenant: Tenant;
}

export default function TenantEditForm({ tenant }: TenantEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Refs for modal focus management
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmDeleteRef = useRef<HTMLButtonElement>(null);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Stable ESC key handler (avoids memory leak from stale closures)
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isDeleting) {
      setShowDeleteConfirm(false);
    }
  }, [isDeleting]);

  // Focus trap handler for modal accessibility
  const handleFocusTrap = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const firstElement = cancelButtonRef.current;
    const lastElement = confirmDeleteRef.current;

    if (!firstElement || !lastElement) return;

    if (e.shiftKey) {
      // Shift+Tab: if on first element, go to last
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab: if on last element, go to first
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  // Focus management, ESC key, and focus trap for delete modal
  useEffect(() => {
    if (showDeleteConfirm) {
      // Focus cancel button when modal opens
      cancelButtonRef.current?.focus();

      // Use stable handler references to prevent listener accumulation
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleFocusTrap);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('keydown', handleFocusTrap);
      };
    }
  }, [showDeleteConfirm, handleEscape, handleFocusTrap]);

  // Close modal and return focus to delete button
  const closeDeleteModal = useCallback(() => {
    setShowDeleteConfirm(false);
    // Use requestAnimationFrame for reliable focus after React state update
    requestAnimationFrame(() => deleteButtonRef.current?.focus());
  }, []);

  const [formData, setFormData] = useState({
    name: tenant.name,
    logo_url: tenant.logo_url || '',
    primary_color: tenant.primary_color || '#0066CC',
    secondary_color: tenant.secondary_color || '',
    welcome_message: tenant.welcome_message || '',
    contact_email: tenant.contact_email || '',
    is_active: tenant.is_active,
    is_demo: tenant.is_demo,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/products/hr-bot/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update tenant');
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/products/hr-bot/tenants/${tenant.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete tenant');
      }

      router.push('/admin/products/hr-bot/tenants');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      closeDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm">
          Settings saved successfully!
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Company Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Contact Email */}
      <div>
        <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
          Contact Email
        </label>
        <input
          type="email"
          id="contact_email"
          name="contact_email"
          value={formData.contact_email}
          onChange={handleChange}
          placeholder="hr@company.com"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Colors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="primary_color"
              name="primary_color"
              value={formData.primary_color}
              onChange={handleChange}
              className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={formData.primary_color}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, primary_color: e.target.value }))
              }
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700 mb-2">
            Secondary Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="secondary_color"
              name="secondary_color"
              value={formData.secondary_color || '#666666'}
              onChange={handleChange}
              className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={formData.secondary_color}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))
              }
              placeholder="#666666"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Logo URL */}
      <div>
        <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700 mb-2">
          Logo URL
        </label>
        <input
          type="url"
          id="logo_url"
          name="logo_url"
          value={formData.logo_url}
          onChange={handleChange}
          placeholder="https://..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {formData.logo_url && (
          <div className="mt-2">
            <img
              src={formData.logo_url}
              alt="Logo preview"
              className="w-16 h-16 object-contain bg-gray-100 rounded-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Welcome Message */}
      <div>
        <label htmlFor="welcome_message" className="block text-sm font-medium text-gray-700 mb-2">
          Welcome Message
        </label>
        <textarea
          id="welcome_message"
          name="welcome_message"
          value={formData.welcome_message}
          onChange={handleChange}
          rows={3}
          placeholder="Welcome to our HR Assistant..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Status Toggles */}
      <div className="space-y-4">
        {/* Active Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_active" className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Tenant is active</span>
            <span className="text-xs text-gray-500">Inactive tenants cannot access the chatbot</span>
          </label>
        </div>

        {/* Demo Status */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_demo"
            name="is_demo"
            checked={formData.is_demo}
            onChange={handleChange}
            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <label htmlFor="is_demo" className="flex flex-col">
            <span className="text-sm font-medium text-gray-700">Dit is een demo/test tenant</span>
            <span className="text-xs text-gray-500">Demo tenants worden apart weergegeven in het overzicht</span>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          ref={deleteButtonRef}
          onClick={() => setShowDeleteConfirm(true)}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Delete Tenant
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          aria-describedby="delete-modal-description"
          onClick={(e) => {
            // Close on backdrop click (not when clicking modal content)
            if (e.target === e.currentTarget && !isDeleting) {
              closeDeleteModal();
            }
          }}
        >
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 id="delete-modal-title" className="text-lg font-semibold text-gray-900 mb-2">
              Delete Tenant?
            </h3>
            <p id="delete-modal-description" className="text-gray-600 mb-6">
              This will permanently delete <strong>{tenant.name}</strong> and all associated data
              including documents, chat logs, and settings. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                ref={cancelButtonRef}
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                ref={confirmDeleteRef}
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
