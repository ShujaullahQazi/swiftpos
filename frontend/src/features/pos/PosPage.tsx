import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import ReactDOM from 'react-dom';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { useToast } from '../../hooks/useToast';
import { Search, Plus, Minus, Trash2, User, Percent, Receipt, CreditCard, DollarSign, Smartphone, Loader, X, Check, Printer, ShoppingCart } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface Product {
  id: number;
  category_id: number;
  name: string;
  price: string | number;
  stock_quantity: number;
  sku: string;
  barcode: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Customer {
  id: number;
  name: string;
  phone: string | null;
}

// ─── Memoized product card — only re-renders when its own data/qty changes ───
interface ProductCardProps {
  product: Product;
  inCartQty: number;
  onAdd: (product: Product) => void;
}

const ProductCard = memo(({ product, inCartQty, onAdd }: ProductCardProps) => {
  const isOutOfStock = product.stock_quantity <= 0;

  return (
    <div
      onClick={() => !isOutOfStock && onAdd(product)}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        border: isOutOfStock
          ? '1px dashed var(--border)'
          : inCartQty > 0
          ? '2px solid var(--accent)'
          : '1px solid var(--border)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
        opacity: isOutOfStock ? 0.55 : 1,
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        transition: 'transform 0.15s ease',
      }}
      className="pos-product-card"
      onMouseEnter={(e) => { if (!isOutOfStock) e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { if (!isOutOfStock) e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {inCartQty > 0 && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          backgroundColor: 'var(--accent)',
          color: 'white',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          boxShadow: 'var(--shadow-md)',
        }}>
          {inCartQty}
        </div>
      )}

      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
        {product.sku}
      </span>

      <h4 style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        lineHeight: 1.3,
        flex: 1,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {product.name}
      </h4>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '6px' }}>
        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {formatCurrency(product.price)}
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: isOutOfStock ? 'var(--danger)' : (product.stock_quantity <= 10 ? 'var(--warning-text)' : 'var(--text-secondary)'),
        }}>
          {isOutOfStock ? 'Sold Out' : `${product.stock_quantity} left`}
        </span>
      </div>
    </div>
  );
});

export const PosPage: React.FC = () => {
  // ─── Server state via TanStack Query (cached, instant on re-visit) ───────────
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['pos-products'],
    queryFn: async () => { const r = await api.get('/products?all=1'); return r.data; },
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['pos-categories'],
    queryFn: async () => { const r = await api.get('/categories'); return r.data; },
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['pos-customers'],
    queryFn: async () => { const r = await api.get('/customers?all=1'); return r.data; },
  });

  const isLoading = productsLoading || categoriesLoading || customersLoading;
  
  // Selection/Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Cart & Pricing
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Loading States (isLoading is derived from useQuery hooks above)
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Mobile cart drawer
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [latestOrderReceipt, setLatestOrderReceipt] = useState<any>(null);

  const toast = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  // Debounce timer ref — avoids creating a new timer object every render
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The debounced value that actually drives the filter (lags input by 200ms)
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sync debounced search whenever the raw query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // ─── Memoized computed pricing — only recalculates when cart/discount changes ───
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (parseFloat(item.product.price as string) * item.quantity), 0),
    [cart]
  );
  const calculatedDiscount = useMemo(
    () => discountPercent > 0 ? (cartSubtotal * (discountPercent / 100)) : discountAmount,
    [discountPercent, discountAmount, cartSubtotal]
  );
  const taxRate = 0.08; // 8%
  const taxableAmount = useMemo(() => Math.max(0, cartSubtotal - calculatedDiscount), [cartSubtotal, calculatedDiscount]);
  const cartTax = useMemo(() => taxableAmount * taxRate, [taxableAmount]);
  const cartTotal = useMemo(() => taxableAmount + cartTax, [taxableAmount, cartTax]);

  // ─── Memoized handlers — stable references so ProductCard never re-renders due to callbacks ───
  const addToCart = useCallback((product: Product) => {
    if (product.stock_quantity <= 0) {
      toast.warning(`Product '${product.name}' is out of stock!`);
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock_quantity) {
          toast.warning(`Cannot exceed available stock level (${product.stock_quantity}).`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  }, [toast]);

  const updateQuantity = useCallback((productId: number, delta: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock_quantity) {
            toast.warning(`Cannot exceed available stock level (${item.product.stock_quantity}).`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as CartItem[]
    );
  }, [toast]);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  }, []);

  // ─── Memoized filter — only recalculates when products/category/debounced search changes ───
  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return products.filter((prod) => {
      const matchesCategory = selectedCategory === 'all' || prod.category_id.toString() === selectedCategory;
      const matchesSearch = q === '' ||
        prod.name.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q) ||
        (prod.barcode && prod.barcode.includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, debouncedSearch]);

  const handleOpenPayment = useCallback(() => {
    if (cart.length === 0) { toast.warning('Cart is empty.'); return; }
    setTenderedAmount(cartTotal.toFixed(2));
    setPaymentMethod('cash');
    setIsPaymentModalOpen(true);
  }, [cart.length, cartTotal, toast]);

  const calculatedChange = useMemo(
    () => Math.max(0, parseFloat(tenderedAmount || '0') - cartTotal),
    [tenderedAmount, cartTotal]
  );

  // Complete Order & Post to Laravel
  const handleCompletePayment = async () => {
    const tenderedVal = parseFloat(tenderedAmount || '0');
    if (paymentMethod === 'cash' && tenderedVal < cartTotal) {
      toast.error('Tendered cash is less than total amount due.');
      return;
    }

    setIsCheckoutSubmitting(true);
    try {
      const orderPayload = {
        customer_id: selectedCustomer?.id || null,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        discount_amount: calculatedDiscount,
        payment_method: paymentMethod,
        payment_tendered: paymentMethod === 'cash' ? tenderedVal : cartTotal,
        notes: '',
      };

      const res = await api.post('/orders', orderPayload);
      setLatestOrderReceipt(res.data.order);

      // Invalidate the products cache — next render will get fresh stock levels
      queryClient.invalidateQueries({ queryKey: ['pos-products'] });

      // Clear checkout/cart state
      setCart([]);
      setSelectedCustomer(null);
      setDiscountPercent(0);
      setDiscountAmount(0);
      setIsPaymentModalOpen(false);

      // Open Receipt Modal
      setIsReceiptModalOpen(true);
      toast.success('Order completed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Payment checkout process failed.');
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  // Print receipt — opens a dedicated print window with correct filename as <title>
  // This is 100% reliable for PDF filenames vs the document.title approach
  const handlePrint = () => {
    if (!latestOrderReceipt) return;

    const orderNum = latestOrderReceipt.order_number || 'SWP-000000';
    const dateStr = new Date(latestOrderReceipt.created_at || new Date())
      .toISOString()
      .split('T')[0];
    const rawCustomer = latestOrderReceipt.customer?.name || 'WalkIn';
    const cleanCustomer = rawCustomer.trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    const filename = `Receipt_${orderNum}_${cleanCustomer}_${dateStr}`;

    // Build items rows HTML
    const itemsHtml = (latestOrderReceipt.items || []).map((item: any) => `
      <tr>
        <td>${item.product?.name || 'Item'}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">$${parseFloat(item.total_price).toFixed(2)}</td>
      </tr>
    `).join('');

    const discount = parseFloat(latestOrderReceipt.discount_amount || 0);
    const payments = latestOrderReceipt.payments || [];
    const payment = payments[0];

    const receiptHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${filename}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #000;
      background: #fff;
      width: 72mm;
      margin: 0 auto;
      padding: 6mm;
    }
    h2 { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
    p { margin: 2px 0; }
    .center { text-align: center; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
    .bold { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    thead tr { border-bottom: 1px dashed #000; }
    th { padding-bottom: 4px; text-align: left; font-weight: bold; }
    td { padding: 3px 0; vertical-align: top; }
    .barcode { font-size: 16px; letter-spacing: 3px; text-align: center; margin: 6px 0; }
  </style>
</head>
<body>
  <div class="center">
    <h2>SwiftPOS Retail</h2>
    <p>123 Commerce Avenue, Tech City</p>
    <p>Tel: +1 (555) 100-2000</p>
    <div class="divider"></div>
    <p class="bold" style="letter-spacing:1px">*** CUSTOMER RECEIPT ***</p>
    <div class="divider"></div>
  </div>

  <div class="row"><span><b>Receipt #:</b> ${latestOrderReceipt.order_number}</span><span><b>Date:</b> ${new Date(latestOrderReceipt.created_at).toLocaleDateString()}</span></div>
  <div class="row"><span><b>Cashier:</b> ${latestOrderReceipt.user?.name || 'Cashier'}</span><span><b>Time:</b> ${new Date(latestOrderReceipt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
  <div class="row"><span><b>Customer:</b> ${latestOrderReceipt.customer?.name || 'Walking Customer'}</span>${latestOrderReceipt.customer?.phone ? `<span><b>Ph:</b> ${latestOrderReceipt.customer.phone}</span>` : ''}</div>

  <div class="divider"></div>

  <table>
    <thead><tr><th style="width:55%">Item</th><th style="width:15%;text-align:center">Qty</th><th style="width:30%;text-align:right">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="divider"></div>

  <div class="row"><span>Subtotal:</span><span>$${parseFloat(latestOrderReceipt.subtotal).toFixed(2)}</span></div>
  ${discount > 0 ? `<div class="row"><span>Discount:</span><span>-$${discount.toFixed(2)}</span></div>` : ''}
  <div class="row"><span>Tax (8.00%):</span><span>$${parseFloat(latestOrderReceipt.tax_amount).toFixed(2)}</span></div>
  <div class="divider"></div>
  <div class="row bold"><span>TOTAL DUE:</span><span>$${parseFloat(latestOrderReceipt.total).toFixed(2)}</span></div>

  <div class="divider"></div>

  ${payment ? `
  <div class="row"><span>Payment:</span><span class="bold" style="text-transform:uppercase">${payment.method === 'mobile' ? 'Mobile Pay' : payment.method}</span></div>
  ${payment.method === 'cash' ? `
  <div class="row"><span>Tendered:</span><span>$${parseFloat(payment.tendered).toFixed(2)}</span></div>
  <div class="row"><span>Change:</span><span>$${parseFloat(payment.change_amount).toFixed(2)}</span></div>
  ` : ''}
  <div class="divider"></div>
  ` : ''}

  <div class="center">
    <div class="barcode">||| ||||| || ||||| |||</div>
    <p>${latestOrderReceipt.order_number}</p>
    <p class="bold" style="margin-top:6px">Thank you for shopping with us!</p>
    <p>Powered by SwiftPOS</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

    const sw = window.screen.width  || 1280;
    const sh = window.screen.height || 800;
    const printWindow = window.open('', '_blank', `width=${sw},height=${sh},scrollbars=yes,left=0,top=0`);
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '12px' }}>
        <Loader size={36} className="animate-spin" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Loading checkout terminal...</span>
      </div>
    );
  }

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Shared Cart Panel — rendered both in desktop sidebar and mobile drawer
  const cartPanelContent = (
    <>
      {/* Cart Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Current Checkout Cart</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-info" style={{ borderRadius: '12px' }}>
            {totalCartItems} Items
          </span>
          {/* Close button — only visible in drawer context */}
          <button
            className="pos-cart-drawer-close-btn"
            onClick={() => setIsCartDrawerOpen(false)}
            style={{ color: 'var(--text-muted)', display: 'none' }}
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Customer Selector */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <select
            className="form-input"
            style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
            value={selectedCustomer ? selectedCustomer.id.toString() : ''}
            onChange={(e) => {
              const id = e.target.value;
              if (!id) setSelectedCustomer(null);
              else {
                const match = customers.find(c => c.id.toString() === id);
                if (match) setSelectedCustomer(match);
              }
            }}
          >
            <option value="">Walking Customer (Default)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
            ))}
          </select>
          <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        </div>
      </div>

      {/* Cart Item rows list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {cart.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cart.map((item) => (
              <div key={item.product.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--bg-hover)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h5 style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product.name}
                  </h5>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {formatCurrency(item.product.price)} each
                  </span>
                </div>

                {/* Quantity Actions */}
                <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    style={{ padding: '4px 8px', backgroundColor: 'var(--bg-hover)' }}
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ padding: '0 8px', fontSize: '12px', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    style={{ padding: '4px 8px', backgroundColor: 'var(--bg-hover)' }}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Delete Item */}
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  style={{ color: 'var(--danger)', padding: '4px' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Receipt size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
            <p style={{ fontSize: '13px', fontWeight: 600 }}>Checkout cart is empty</p>
            <p style={{ fontSize: '11px' }}>Click items on the left to add them here</p>
          </div>
        )}
      </div>

      {/* Cart Totals & Payments Panel */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        {/* Subtotal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(cartSubtotal)}</span>
        </div>

        {/* Discount input picker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Percent size={12} /> Discount (%)
          </span>
          <input
            type="number"
            min="0"
            max="100"
            className="form-input"
            style={{ width: '70px', padding: '4px 8px', height: '28px', textAlign: 'right', fontSize: '12px' }}
            value={discountPercent || ''}
            onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
          />
        </div>

        {/* Tax (8%) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Tax (8.00%)</span>
          <span style={{ fontWeight: 600 }}>{formatCurrency(cartTax)}</span>
        </div>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '8px', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
          <span>Total Payable</span>
          <span style={{ color: 'var(--accent-text)' }}>{formatCurrency(cartTotal)}</span>
        </div>

        {/* Pay Button */}
        <button
          onClick={() => { setIsCartDrawerOpen(false); handleOpenPayment(); }}
          disabled={cart.length === 0}
          className="btn btn-primary"
          style={{ width: '100%', height: '46px', marginTop: '12px', fontSize: '15px' }}
        >
          Pay &amp; Complete Checkout
        </button>
      </div>
    </>
  );

  const posTerminal = (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 380px',
      gap: '20px',
      height: 'calc(100vh - 32px)',
    }} className="pos-terminal-layout">
      
      {/* COLUMN 1: PRODUCT PICKER GRID */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden' }}>
        {/* Search and Category filters bar */}
        <div style={{
          display: 'flex',
          gap: '16px',
          backgroundColor: 'var(--bg-card)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          alignItems: 'center',
        }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              ref={searchInputRef}
              type="text"
              className="form-input"
              placeholder="Search product SKU / Name / Barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '40px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          {/* Quick Clear */}
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="btn btn-secondary" style={{ padding: '8px 12px', height: '40px' }}>
              Clear
            </button>
          )}
        </div>

        {/* Category horizontal scroller */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: selectedCategory === 'all' ? 'var(--accent)' : 'var(--bg-card)',
              color: selectedCategory === 'all' ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              whiteSpace: 'nowrap',
            }}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id.toString())}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: selectedCategory === cat.id.toString() ? 'var(--accent)' : 'var(--bg-card)',
                color: selectedCategory === cat.id.toString() ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Picker Grid Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '14px',
          alignContent: 'start',
          padding: '2px',
        }} className="pos-products-grid">
          {filteredProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              inCartQty={cart.find(item => item.product.id === prod.id)?.quantity || 0}
              onAdd={addToCart}
            />
          ))}
        </div>
      </div>

      {/* COLUMN 2: CHECKOUT CART PANEL — Desktop only */}
      <div className="pos-cart-desktop" style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}>
        {cartPanelContent}
      </div>

      {/* MODAL 1: CHOOSE PAYMENT METHOD SHEET */}
      {isPaymentModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px',
          backdropFilter: 'blur(4px)',
        }}>
          <div className="animate-fade-in" style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '480px',
            width: '100%',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Choose Payment Method</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-hover)', padding: '12px 16px', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount Due:</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-text)' }}>{formatCurrency(cartTotal)}</span>
              </div>

              {/* Payment Methods buttons list */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('cash'); setTenderedAmount(cartTotal.toFixed(2)); }}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: `2px solid ${paymentMethod === 'cash' ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: paymentMethod === 'cash' ? 'var(--accent-light)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  <DollarSign size={22} style={{ color: paymentMethod === 'cash' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  Cash
                </button>

                {/* Card */}
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('card'); setTenderedAmount(cartTotal.toFixed(2)); }}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: `2px solid ${paymentMethod === 'card' ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: paymentMethod === 'card' ? 'var(--accent-light)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  <CreditCard size={22} style={{ color: paymentMethod === 'card' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  Card
                </button>

                {/* Mobile Pay */}
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('mobile'); setTenderedAmount(cartTotal.toFixed(2)); }}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: `2px solid ${paymentMethod === 'mobile' ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: paymentMethod === 'mobile' ? 'var(--accent-light)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  <Smartphone size={22} style={{ color: paymentMethod === 'mobile' ? 'var(--accent)' : 'var(--text-secondary)' }} />
                  Mobile Pay
                </button>
              </div>

              {/* Cash tendered inputs panels (Only for Cash payments) */}
              {paymentMethod === 'cash' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <label className="form-label">Tendered Cash Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    style={{ fontSize: '18px', fontWeight: 800, textAlign: 'center', height: '46px' }}
                  />

                  {/* Quick cash denomination buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '4px' }}>
                    {[Math.ceil(cartTotal), 10, 20, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTenderedAmount(val.toFixed(2))}
                        className="btn btn-secondary"
                        style={{ padding: '6px 0', fontSize: '12px', fontWeight: 700 }}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>

                  {/* Cash Change Due calculations */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '10px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--danger-light)',
                    border: '1px solid rgba(239, 68, 68, 0.1)',
                    fontSize: '13px',
                  }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Cash Change Due:</span>
                    <strong style={{ fontSize: '14px', color: 'var(--danger-text)' }}>{formatCurrency(calculatedChange)}</strong>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="btn btn-secondary" disabled={isCheckoutSubmitting}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompletePayment}
                  className="btn btn-primary"
                  disabled={isCheckoutSubmitting}
                  style={{ display: 'inline-flex', gap: '6px' }}
                >
                  {isCheckoutSubmitting ? (
                    <>
                      <Loader size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Complete Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Mobile cart drawer portal
  const mobileCartDrawer = ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`pos-cart-backdrop${isCartDrawerOpen ? ' pos-cart-backdrop--open' : ''}`}
        onClick={() => setIsCartDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`pos-cart-drawer${isCartDrawerOpen ? ' pos-cart-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: 'var(--border)' }} />
        </div>
        {cartPanelContent}
      </div>

      {/* Floating Cart FAB — only on mobile/tablet */}
      <button
        className="pos-cart-fab"
        onClick={() => setIsCartDrawerOpen(true)}
        aria-label={`Open cart (${totalCartItems} items)`}
      >
        <ShoppingCart size={22} />
        {totalCartItems > 0 && (
          <span className="pos-cart-fab-badge">{totalCartItems}</span>
        )}
        {totalCartItems > 0 && (
          <span style={{ fontSize: '12px', fontWeight: 700, marginLeft: '4px' }}>
            {formatCurrency(cartTotal)}
          </span>
        )}
      </button>
    </>,
    document.body
  );



  // Render receipt modal via portal so it sits at document.body,
  // completely escaping the AppLayout grid/flex hierarchy for clean printing.
  const receiptPortal =
    isReceiptModalOpen && latestOrderReceipt
      ? ReactDOM.createPortal(
          <div
            className="receipt-modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              padding: '16px',
              backdropFilter: 'blur(4px)',
              overflowY: 'auto',
            }}
          >
            <div
              className="animate-fade-in receipt-modal-container"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)',
                maxWidth: '400px',
                width: '100%',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              {/* Printable Receipt Layout */}
              <div
                className="printable-receipt"
                style={{
                  padding: '20px',
                  fontSize: '12px',
                  fontFamily: "'Courier New', Courier, monospace",
                  color: '#000000',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px 0', color: '#000000', fontFamily: "'Courier New', Courier, monospace" }}>SwiftPOS Retail</h2>
                  <p style={{ margin: '2px 0', color: '#000000' }}>123 Commerce Avenue, Tech City</p>
                  <p style={{ margin: '2px 0', color: '#000000' }}>Tel: +1 (555) 100-2000</p>
                  <div className="receipt-divider" />
                  <p style={{ fontWeight: 'bold', margin: '4px 0', letterSpacing: '1px', color: '#000000' }}>*** CUSTOMER RECEIPT ***</p>
                  <div className="receipt-divider" />
                </div>

                {/* Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="receipt-row">
                    <span><strong>Receipt #:</strong> {latestOrderReceipt.order_number}</span>
                    <span><strong>Date:</strong> {new Date(latestOrderReceipt.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="receipt-row">
                    <span><strong>Cashier:</strong> {latestOrderReceipt.user?.name || 'Cashier'}</span>
                    <span><strong>Time:</strong> {new Date(latestOrderReceipt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="receipt-row">
                    <span><strong>Customer:</strong> {latestOrderReceipt.customer?.name || 'Walking Customer'}</span>
                    {latestOrderReceipt.customer?.phone && (
                      <span><strong>Ph:</strong> {latestOrderReceipt.customer.phone}</span>
                    )}
                  </div>
                </div>

                <div className="receipt-divider" />

                {/* Items Table */}
                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th style={{ width: '55%' }}>Item</th>
                      <th style={{ width: '15%', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '30%', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestOrderReceipt.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td>{item.product?.name || 'Item'}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="receipt-divider" />

                {/* Totals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                  <div className="receipt-row">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(latestOrderReceipt.subtotal)}</span>
                  </div>
                  {parseFloat(latestOrderReceipt.discount_amount) > 0 && (
                    <div className="receipt-row">
                      <span>Discount:</span>
                      <span>-{formatCurrency(latestOrderReceipt.discount_amount)}</span>
                    </div>
                  )}
                  <div className="receipt-row">
                    <span>Tax (8.00%):</span>
                    <span>{formatCurrency(latestOrderReceipt.tax_amount)}</span>
                  </div>
                  <div className="receipt-divider" />
                  <div className="receipt-row bold" style={{ fontSize: '13px' }}>
                    <span>TOTAL DUE:</span>
                    <span>{formatCurrency(latestOrderReceipt.total)}</span>
                  </div>
                </div>

                <div className="receipt-divider" />

                {/* Payment Details */}
                {latestOrderReceipt.payments && latestOrderReceipt.payments.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', margin: '4px 0' }}>
                    <div className="receipt-row">
                      <span>Payment:</span>
                      <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                        {latestOrderReceipt.payments[0].method === 'mobile' ? 'Mobile Pay' : latestOrderReceipt.payments[0].method}
                      </span>
                    </div>
                    {latestOrderReceipt.payments[0].method === 'cash' && (
                      <>
                        <div className="receipt-row">
                          <span>Tendered:</span>
                          <span>{formatCurrency(latestOrderReceipt.payments[0].tendered)}</span>
                        </div>
                        <div className="receipt-row">
                          <span>Change:</span>
                          <span>{formatCurrency(latestOrderReceipt.payments[0].change_amount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="receipt-divider" />

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', letterSpacing: '3px', margin: '6px 0', color: '#000000' }}>
                    ||| ||||| || ||||| |||
                  </div>
                  <p style={{ fontSize: '10px', color: '#000000', margin: '3px 0' }}>Order: {latestOrderReceipt.order_number}</p>
                  <p style={{ fontWeight: 'bold', margin: '6px 0', color: '#000000' }}>Thank you for shopping with us!</p>
                  <p style={{ fontSize: '10px', color: '#000000' }}>Powered by SwiftPOS</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="receipt-modal-actions"
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-hover)',
                  borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                }}
              >
                <button
                  type="button"
                  onClick={handlePrint}
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'inline-flex', gap: '6px', justifyContent: 'center' }}
                >
                  <Printer size={16} /> Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Done / New Order
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {posTerminal}
      {mobileCartDrawer}
      {receiptPortal}
    </>
  );
};
