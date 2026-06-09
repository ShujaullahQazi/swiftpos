import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../../hooks/useToast';
import { Search, Plus, Edit2, Trash2, X, Mail, Phone, ShoppingBag, Loader2 } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  total_spent: string | number;
  visit_count: number;
  created_at: string;
}

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient();

  // ─── Filter & pagination state ───
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // ─── Server state via TanStack Query ───
  const { data: customersRes, isLoading } = useQuery({
    queryKey: ['customers', page, searchQuery],
    queryFn: async () => { const r = await api.get(`/customers?page=${page}&search=${searchQuery}`); return r.data; },
    placeholderData: (prev: any) => prev,
  });

  const customers: Customer[] = customersRes?.data      ?? [];
  const totalPages: number    = customersRes?.last_page  ?? 1;
  const totalItems: number    = customersRes?.total      ?? 0;

  const invalidateCustomers = () => queryClient.invalidateQueries({ queryKey: ['customers'] });

  // ─── Local UI state ───
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formErrors, setFormErrors] = useState<any>({});

  const toast = useToast();

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setEmail('');
    setPhone('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
    };

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        toast.success('Customer profile updated!');
      } else {
        await api.post('/customers', payload);
        toast.success('Customer registered successfully!');
      }
      setIsModalOpen(false);
      invalidateCustomers();
      // Also refresh POS customers dropdown cache
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    } catch (err: any) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        toast.error(err.message || 'Failed to save customer');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer? This will remove all their purchase records.')) {
      return;
    }

    try {
      await api.delete(`/customers/${id}`);
      toast.success('Customer deleted');
      invalidateCustomers();
      queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Customer Directory</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Registered: {totalItems}</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={16} /> Register Customer
        </button>
      </div>

      {/* Search Bar */}
      <div style={{
        display: 'flex',
        backgroundColor: 'var(--bg-card)',
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        justifyContent: 'flex-end',
      }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Customers Table */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '24px',
        minHeight: '400px',
      }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
            <Loader2 size={30} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          </div>
        ) : customers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>Customer Name</th>
                  <th style={{ padding: '12px 16px' }}>Contact Information</th>
                  <th style={{ padding: '12px 16px' }}>Visit Count</th>
                  <th style={{ padding: '12px 16px' }}>Total Spent</th>
                  <th style={{ padding: '12px 16px' }}>Joined Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr key={cust.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>{cust.name}</td>
                    <td style={{ padding: '16px' }}>
                      {cust.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <Mail size={12} style={{ color: 'var(--text-muted)' }} />
                          {cust.email}
                        </div>
                      )}
                      {cust.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                          {cust.phone}
                        </div>
                      )}
                      {!cust.email && !cust.phone && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No contact details</span>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className="badge badge-info" style={{ display: 'inline-flex', gap: '4px' }}>
                        <ShoppingBag size={10} /> {cust.visit_count} visits
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontWeight: 700, color: 'var(--accent-text)' }}>
                      {formatCurrency(cust.total_spent)}
                    </td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(cust.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(cust)}
                          style={{
                            padding: '6px',
                            borderRadius: '8px',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(cust.id)}
                          style={{
                            padding: '6px',
                            borderRadius: '8px',
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            backgroundColor: 'var(--danger-light)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger)'; e.currentTarget.style.color = 'white'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger-light)'; e.currentTarget.style.color = 'var(--danger)'; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>No customers registered</p>
            <p style={{ fontSize: '13px' }}>Register new customer profiles above.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(4px)',
        }}>
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '460px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                {editingCustomer ? 'Modify Customer Profile' : 'Register New Member'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer Name */}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className={`form-input ${formErrors.name ? 'error' : ''}`}
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {formErrors.name && <div className="form-error">{formErrors.name[0]}</div>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className={`form-input ${formErrors.email ? 'error' : ''}`}
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {formErrors.email && <div className="form-error">{formErrors.email[0]}</div>}
              </div>

              {/* Phone */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className={`form-input ${formErrors.phone ? 'error' : ''}`}
                  placeholder="e.g. +1 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {formErrors.phone && <div className="form-error">{formErrors.phone[0]}</div>}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : editingCustomer ? 'Update Profile' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
