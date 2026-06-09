import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../../hooks/useToast';
import { Search, Plus, Edit2, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  category_id: number;
  name: string;
  price: string | number;
  cost: string | number | null;
  stock_quantity: number;
  sku: string;
  barcode: string | null;
  is_active: boolean;
  category: Category;
}

export const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // ─── Filter & pagination state ───
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // ─── Server state via TanStack Query ───
  const productsUrl = `/products?page=${page}&search=${searchQuery}${selectedCategory !== 'all' ? `&category_id=${selectedCategory}` : ''}`;

  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ['products', page, searchQuery, selectedCategory],
    queryFn: async () => { const r = await api.get(productsUrl); return r.data; },
    placeholderData: (prev: any) => prev, // keep old data visible while fetching new page
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['pos-categories'],          // shared with PosPage — already cached!
    queryFn: async () => { const r = await api.get('/categories'); return r.data; },
  });

  const products: Product[]  = productsRes?.data       ?? [];
  const totalPages: number   = productsRes?.last_page   ?? 1;
  const totalItems: number   = productsRes?.total       ?? 0;
  const isLoading = productsLoading;

  // ─── Local UI state ───
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formErrors, setFormErrors] = useState<any>({});

  const toast = useToast();

  const invalidateProducts = () => queryClient.invalidateQueries({ queryKey: ['products'] });

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId(categories[0]?.id.toString() || '');
    setPrice('');
    setCost('');
    setStockQuantity('');
    setSku('');
    setBarcode('');
    setIsActive(true);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setCategoryId(product.category_id.toString());
    setPrice(product.price.toString());
    setCost(product.cost?.toString() || '');
    setStockQuantity(product.stock_quantity.toString());
    setSku(product.sku);
    setBarcode(product.barcode || '');
    setIsActive(product.is_active);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setIsSubmitting(true);

    const payload = {
      name,
      category_id: parseInt(categoryId),
      price: parseFloat(price),
      cost: cost ? parseFloat(cost) : null,
      stock_quantity: parseInt(stockQuantity),
      sku: sku || undefined,
      barcode: barcode || null,
      is_active: isActive,
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        toast.success('Product updated successfully!');
      } else {
        await api.post('/products', payload);
        toast.success('Product created successfully!');
      }
      setIsModalOpen(false);
      invalidateProducts();
      // Also refresh the POS products cache so stock counts sync
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    } catch (err: any) {
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        toast.error(err.message || 'Failed to save product');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      invalidateProducts();
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Inventory Management</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Products: {totalItems}</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters & Search Row */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-card)',
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
      }}>
        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => { setSelectedCategory('all'); setPage(1); }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: selectedCategory === 'all' ? 'var(--accent-light)' : 'transparent',
              color: selectedCategory === 'all' ? 'var(--accent-text)' : 'var(--text-secondary)',
              border: `1px solid ${selectedCategory === 'all' ? 'var(--accent)' : 'var(--border)'}`,
            }}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id.toString()); setPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: selectedCategory === cat.id.toString() ? 'var(--accent-light)' : 'transparent',
                color: selectedCategory === cat.id.toString() ? 'var(--accent-text)' : 'var(--text-secondary)',
                border: `1px solid ${selectedCategory === cat.id.toString() ? 'var(--accent)' : 'var(--border)'}`,
                whiteSpace: 'nowrap',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, SKU or barcode..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            style={{ paddingLeft: '36px' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Products Table Card */}
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
        ) : products.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>Product Details</th>
                  <th style={{ padding: '12px 16px' }}>SKU & Barcode</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Retail Price</th>
                  <th style={{ padding: '12px 16px' }}>Stock Level</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 600 }}>{product.name}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{product.sku}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{product.barcode || 'No barcode'}</div>
                    </td>
                    <td style={{ padding: '16px' }}>{product.category?.name}</td>
                    <td style={{ padding: '16px', fontWeight: 700 }}>{formatCurrency(product.price)}</td>
                    <td style={{ padding: '16px' }}>
                      <div style={{
                        fontWeight: 700,
                        color: product.stock_quantity <= 10 ? 'var(--danger)' : 'var(--text-primary)'
                      }}>
                        {product.stock_quantity} units
                      </div>
                      {product.stock_quantity <= 10 && (
                        <div style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                          <AlertTriangle size={10} /> Low Stock
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className={`badge ${product.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(product)}
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
                          onClick={() => handleDelete(product.id)}
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
            <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>No products found</p>
            <p style={{ fontSize: '13px' }}>Try adjusting your filters or add a new product.</p>
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

      {/* Create/Edit Product Modal Dialog */}
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
              maxWidth: '560px',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 40px)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                {editingProduct ? 'Edit Product Details' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Product Name */}
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  className={`form-input ${formErrors.name ? 'error' : ''}`}
                  placeholder="e.g. Organic Apple Juice"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {formErrors.name && <div className="form-error">{formErrors.name[0]}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Category Selection */}
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-input"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* SKU */}
                <div className="form-group">
                  <label className="form-label">SKU (Auto-Generated if empty)</label>
                  <input
                    type="text"
                    className={`form-input ${formErrors.sku ? 'error' : ''}`}
                    placeholder="e.g. BEV-APP-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                  />
                  {formErrors.sku && <div className="form-error">{formErrors.sku[0]}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Retail Price */}
                <div className="form-group">
                  <label className="form-label">Retail Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`form-input ${formErrors.price ? 'error' : ''}`}
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                  {formErrors.price && <div className="form-error">{formErrors.price[0]}</div>}
                </div>

                {/* Supplier Cost */}
                <div className="form-group">
                  <label className="form-label">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Stock Level */}
                <div className="form-group">
                  <label className="form-label">Initial Stock Level *</label>
                  <input
                    type="number"
                    className={`form-input ${formErrors.stock_quantity ? 'error' : ''}`}
                    placeholder="e.g. 50"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    required
                  />
                  {formErrors.stock_quantity && <div className="form-error">{formErrors.stock_quantity[0]}</div>}
                </div>

                {/* Barcode */}
                <div className="form-group">
                  <label className="form-label">Barcode / UPC</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 8801234567"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                  />
                </div>
              </div>

              {/* Status active/inactive toggler */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                  Enable product for sales terminal
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
