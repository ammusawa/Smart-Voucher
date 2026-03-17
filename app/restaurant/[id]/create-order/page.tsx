'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  description?: string;
  imageUrl?: string;
}

interface SelectedItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const params = useParams();
  const routeRestaurantId = params.id as string;
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string>(routeRestaurantId);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'digital' | 'cash' | 'transfer'>('digital');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const { modal, showSuccess, showError, hideModal } = useModal();
  const pollersRef = useRef<{ [orderId: number]: any }>({});
  const [paidOrderIds, setPaidOrderIds] = useState<Set<number>>(new Set());
  const removedOrderIdsRef = useRef<Set<number>>(new Set());
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || (data.user.role !== 'restaurant' && data.user.role !== 'admin' && data.user.role !== 'staff')) {
          router.push('/');
          return;
        }
        // If staff, ensure we are on their restaurant and set currentRestaurantId
        if (data.user.role === 'staff') {
          fetch('/api/restaurants/my')
            .then(res => res.json())
            .then(restData => {
              const myRest = restData.restaurant;
              if (myRest?.id) {
                const idStr = String(myRest.id);
                setCurrentRestaurantId(idStr);
                if (routeRestaurantId !== idStr) {
                  router.replace(`/restaurant/${idStr}/create-order`);
                }
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => router.push('/'));

    // Fetch menu items
    fetch(`/api/restaurants/${currentRestaurantId}/menu`)
      .then(res => res.json())
      .then(data => {
        const items = (data.menuItems || []).map((item: any) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          stock: parseInt(item.stock) || 0,
        }));
        setMenuItems(items);
        setFilteredItems(items);
        setLoadingMenu(false);
      })
      .catch(() => setLoadingMenu(false));

    // Fetch pending/unpaid orders from database
    fetch(`/api/restaurants/${currentRestaurantId}/orders`)
      .then(res => res.json())
      .then(data => {
        if (data.orders && Array.isArray(data.orders)) {
          // Filter to only show pending/unpaid orders and parse items
          const pendingOrders = data.orders
            .filter((order: any) => order.status !== 'Paid' && order.status !== 'Completed')
            .map((order: any) => ({
              ...order,
              items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
              totalAmount: parseFloat(order.totalAmount) || 0,
              paymentMethod: order.paymentMethod || 'digital', // Default to digital if not set
            }));
          // Merge with existing orders, avoiding duplicates and excluding removed ones
          setOrders(prev => {
            const existingIds = new Set(prev.map(o => o.id));
            const removedIds = removedOrderIdsRef.current;
            const newOrders = pendingOrders.filter((o: any) => 
              !existingIds.has(o.id) && !removedIds.has(o.id)
            );
            // Also filter out removed orders from existing ones
            const keptOrders = prev.filter(o => !removedIds.has(o.id));
            return [...keptOrders, ...newOrders];
          });
          // The existing useEffect will handle starting polling for digital orders
        }
      })
      .catch((err) => {
        console.error('Failed to fetch pending orders:', err);
      });
  }, [routeRestaurantId, currentRestaurantId, router]);

  // Filter menu items based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(menuItems);
    } else {
      const filtered = menuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchQuery, menuItems]);

  const addToOrder = (item: MenuItem) => {
    const existing = selectedItems.find(s => s.menuItemId === item.id);
    if (existing) {
      setSelectedItems(selectedItems.map(s =>
        s.menuItemId === item.id
          ? { ...s, quantity: s.quantity + 1 }
          : s
      ));
    } else {
      setSelectedItems([...selectedItems, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      }]);
    }
  };

  const removeFromOrder = (menuItemId: number) => {
    setSelectedItems(selectedItems.filter(s => s.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(menuItemId);
      return;
    }
    setSelectedItems(selectedItems.map(s =>
      s.menuItemId === menuItemId ? { ...s, quantity } : s
    ));
  };

  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      showError('Please select at least one menu item');
      return;
    }

    setLoading(true);

    const items = selectedItems.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      menuItemId: item.menuItemId,
    }));

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: parseInt(currentRestaurantId),
          userId: null,
          customerName: customerName || null,
          items,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to create order');
        setLoading(false);
        return;
      }

      // Add new order to the list
      setOrders([...orders, data.order]);
      // Start polling this order for payment status (only for digital payments)
      if (paymentMethod === 'digital') {
        startPollingOrderStatus(data.order.id);
        showSuccess('Order created successfully. QR code generated.', 'Order Created', 2000);
      } else {
        showSuccess(`Order created successfully. Payment method: ${paymentMethod}. Mark as paid when payment is received.`, 'Order Created', 2000);
      }
      
      // Clear form for next order
      setSelectedItems([]);
      setCustomerName('');
      setPaymentMethod('digital');
      setLoading(false);
    } catch (err) {
      showError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  // Start polling a specific order until it becomes Paid, then notify and remove it
  const startPollingOrderStatus = (orderId: number) => {
    if (pollersRef.current[orderId]) return; // already polling
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (res.ok && data.order) {
          if (data.order.status === 'Paid') {
            const paidBy = data.order.customerName || 'Customer';
            showSuccess(`Order #${orderId} paid by ${paidBy}`, 'Payment Received', 1500);
            // Show paid badge animation
            setPaidOrderIds(prev => new Set([...Array.from(prev), orderId]));
            // Broadcast to other tabs (e.g., dashboard)
            try {
              const BC = (window as any).BroadcastChannel;
              if (BC) {
                const bc = new BC('payments');
                bc.postMessage({
                  type: 'paid',
                  orderId,
                  customerName: data.order.customerName || null,
                  restaurantId: data.order.restaurantId,
                  totalAmount: data.order.totalAmount,
                });
                if (typeof bc.close === 'function') {
                  bc.close();
                }
              }
            } catch {}
            // Remove from visible orders after short delay
            setTimeout(() => {
              setOrders(prev => prev.filter(o => o.id !== orderId));
              setPaidOrderIds(prev => {
                const n = new Set(prev);
                n.delete(orderId);
                return n;
              });
              clearInterval(intervalId);
              delete pollersRef.current[orderId];
            }, 1400);
          }
        } else if (res.status === 404) {
          // Order no longer exists; stop polling
          clearInterval(intervalId);
          delete pollersRef.current[orderId];
        }
      } catch {
        // Ignore transient errors; keep polling
      }
    }, 2000);
    pollersRef.current[orderId] = intervalId;
  };

  // Ensure we clear pollers when an order card is manually removed or cleared
  useEffect(() => {
    // Start polling for any orders that don't have a poller yet
    orders.forEach((o) => {
      if (o && typeof o.id === 'number' && !pollersRef.current[o.id]) {
        startPollingOrderStatus(o.id);
      }
    });
    // Clean up pollers for orders that no longer exist in state
    const activeIds = new Set(orders.map(o => o.id));
    Object.keys(pollersRef.current).forEach(key => {
      const id = Number(key);
      if (!activeIds.has(id)) {
        clearInterval(pollersRef.current[id]);
        delete pollersRef.current[id];
      }
    });
    return () => {
      // On unmount, clear all
      Object.values(pollersRef.current).forEach((intervalId: any) => clearInterval(intervalId));
      pollersRef.current = {};
    };
  }, [orders]);

  return (
    <>
      <Navbar />
      <Modal
        isOpen={modal.isOpen}
        onClose={hideModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        autoClose={modal.autoClose}
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => router.push('/restaurant/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create Order</h1>
          </div>

          {orders.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Created Orders ({orders.length})</h2>
                <button
                  onClick={() => {
                    const allIds = orders.map(o => o.id);
                    allIds.forEach(id => removedOrderIdsRef.current.add(id));
                    // Stop all pollers
                    Object.values(pollersRef.current).forEach((intervalId: any) => clearInterval(intervalId));
                    pollersRef.current = {};
                    setOrders([]);
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => (
                  <div key={order.id} className="relative border border-gray-200 rounded-lg p-4 overflow-hidden">
                    {paidOrderIds.has(order.id) && (
                      <div className="absolute inset-0 bg-green-50/70 flex items-center justify-center">
                        <span className="px-4 py-2 bg-green-600 text-white rounded-full text-sm font-semibold animate-bounce">
                          Paid ✓
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-sm">Order #{order.id}</p>
                        {order.customerName && (
                          <p className="text-xs font-medium text-primary-600 mt-1">
                            {order.customerName}
                          </p>
                        )}
                        <p className="text-xs text-gray-600">
                          ₦{parseFloat(order.totalAmount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.timestamp).toLocaleTimeString()}
                        </p>
                        <p className="text-xs font-medium mt-1">
                          Payment: <span className={`${
                            order.paymentMethod === 'digital' ? 'text-blue-600' :
                            order.paymentMethod === 'cash' ? 'text-green-600' :
                            'text-purple-600'
                          }`}>
                            {order.paymentMethod === 'digital' ? 'Digital' :
                             order.paymentMethod === 'cash' ? 'Cash' :
                             'Transfer'}
                          </span>
                        </p>
                        {order.createdByName && (
                          <p className="text-xs text-gray-400 mt-1">
                            Created by: {order.createdByName}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={async () => {
                            setLoadingOrderDetails(true);
                            try {
                              const res = await fetch(`/api/orders/${order.id}`);
                              const data = await res.json();
                              if (res.ok && data.order) {
                                setViewingOrder({
                                  ...data.order,
                                  items: typeof data.order.items === 'string' 
                                    ? JSON.parse(data.order.items) 
                                    : data.order.items,
                                });
                              } else {
                                showError('Failed to load order details');
                              }
                            } catch (err) {
                              showError('An error occurred while loading order details');
                            } finally {
                              setLoadingOrderDetails(false);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 text-xs px-2 py-1 border border-blue-600 rounded hover:bg-blue-50"
                          disabled={loadingOrderDetails}
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setOrders(orders.filter(o => o.id !== order.id));
                            removedOrderIdsRef.current.add(order.id);
                            // Stop polling for this order
                            if (pollersRef.current[order.id]) {
                              clearInterval(pollersRef.current[order.id]);
                              delete pollersRef.current[order.id];
                            }
                          }}
                          className="text-gray-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {order.paymentMethod === 'digital' && order.qrCode && (
                      <>
                        <div className="flex justify-center mb-3">
                          <img 
                            src={order.qrCode} 
                            alt={`Order ${order.id} QR Code`} 
                            className="w-32 h-32 border border-gray-200 rounded"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-2">
                            Scan to pay
                          </p>
                          <a
                            href={order.qrCode}
                            download={`order-${order.id}-qr.png`}
                            className="text-xs text-primary-600 hover:text-primary-700 underline"
                          >
                            Download QR
                          </a>
                        </div>
                      </>
                    )}
                    {(order.paymentMethod === 'cash' || order.paymentMethod === 'transfer') && order.status === 'Pending' && (
                      <div className="mt-3">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/orders/${order.id}/mark-paid`, {
                                method: 'POST',
                              });
                              const data = await res.json();
                              if (res.ok) {
                                showSuccess(`Order #${order.id} marked as paid!`, 'Payment Received', 2000);
                                // Update order in list
                                setOrders(prev => prev.map(o => 
                                  o.id === order.id ? { ...o, status: 'Paid' } : o
                                ));
                                setPaidOrderIds(prev => new Set([...Array.from(prev), order.id]));
                                // Remove after delay
                                setTimeout(() => {
                                  setOrders(prev => prev.filter(o => o.id !== order.id));
                                  setPaidOrderIds(prev => {
                                    const n = new Set(prev);
                                    n.delete(order.id);
                                    return n;
                                  });
                                }, 1400);
                              } else {
                                showError(data.error || 'Failed to mark order as paid');
                              }
                            } catch (err) {
                              showError('An error occurred. Please try again.');
                            }
                          }}
                          className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 text-sm"
                        >
                          Mark as Paid
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          {order.paymentMethod === 'cash' 
                            ? 'Click when cash payment is received'
                            : 'Click when transfer payment is confirmed'}
                        </p>
                      </div>
                    )}
                    {order.status === 'Paid' && (order.paymentMethod === 'cash' || order.paymentMethod === 'transfer') && (
                      <div className="mt-3 text-center">
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Paid ✓
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Menu Items Section */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Menu Items
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {loadingMenu ? (
                  <div className="text-center py-8 text-gray-500">Loading menu items...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No items found matching your search' : 'No menu items available'}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredItems.map((item) => {
                      const isSelected = selectedItems.find(s => s.menuItemId === item.id);
                      const isOutOfStock = item.stock <= 0;
                      
                      return (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-4 flex gap-4 items-center ${
                            isOutOfStock ? 'opacity-50 bg-gray-50' : 'hover:shadow-md transition'
                          }`}
                        >
                          {item.imageUrl && (
                            <div className="flex-shrink-0">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-300"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                            <div className="mt-2 flex space-x-4">
                              <span className="text-primary-600 font-semibold">
                                ₦{item.price.toFixed(2)}
                              </span>
                              <span className={`text-sm ${
                                item.stock > 0 ? 'text-gray-600' : 'text-red-600'
                              }`}>
                                Stock: {item.stock}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addToOrder(item)}
                            disabled={isOutOfStock}
                            className={`px-4 py-2 rounded-lg font-semibold flex-shrink-0 ${
                              isOutOfStock
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : isSelected
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-primary-600 text-white hover:bg-primary-700'
                            }`}
                          >
                            {isSelected ? '✓ Added' : isOutOfStock ? 'Out of Stock' : 'Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order Summary Section */}
              <div className="lg:col-span-1">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6 sticky top-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name (optional)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Helpful for identifying orders. Leave empty if customer will scan QR code directly.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('digital')}
                        className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                          paymentMethod === 'digital'
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        Digital
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                          paymentMethod === 'cash'
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        Cash
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transfer')}
                        className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                          paymentMethod === 'transfer'
                            ? 'border-primary-600 bg-primary-50 text-primary-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        Transfer
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {paymentMethod === 'digital' 
                        ? 'Customer will scan QR code to pay from their balance'
                        : paymentMethod === 'cash'
                        ? 'Customer will pay with cash. Mark as paid when received.'
                        : 'Customer will pay via bank transfer. Mark as paid when confirmed.'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                    {selectedItems.length === 0 ? (
                      <p className="text-gray-500 text-sm">No items selected</p>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {selectedItems.map((item) => (
                          <div key={item.menuItemId} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">{item.name}</h4>
                                <p className="text-xs text-gray-600">₦{item.price.toFixed(2)} each</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromOrder(item.menuItemId)}
                                className="text-red-500 hover:text-red-700 text-lg"
                              >
                                ×
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                                className="bg-gray-200 text-gray-700 w-8 h-8 rounded font-semibold hover:bg-gray-300"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  updateQuantity(item.menuItemId, newQuantity);
                                }}
                                onBlur={(e) => {
                                  const value = parseInt(e.target.value);
                                  if (!value || value < 1) {
                                    updateQuantity(item.menuItemId, 1);
                                  }
                                }}
                                className="flex-1 text-center font-semibold border border-gray-300 rounded px-2 py-1 w-16 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                className="bg-gray-200 text-gray-700 w-8 h-8 rounded font-semibold hover:bg-gray-300"
                              >
                                +
                              </button>
                              <span className="text-primary-600 font-semibold ml-2">
                                ₦{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold">Total Amount:</span>
                      <span className="text-xl font-bold text-primary-600">
                        ₦{totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || selectedItems.length === 0}
                    className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading 
                      ? 'Creating Order...' 
                      : paymentMethod === 'digital'
                      ? 'Create Order & Generate QR Code'
                      : 'Create Order'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-semibold">Order #{viewingOrder.id} Details</h3>
              <button
                onClick={() => setViewingOrder(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="font-semibold">#{viewingOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-semibold ${
                    viewingOrder.status === 'Paid' ? 'text-green-600' :
                    viewingOrder.status === 'Completed' ? 'text-blue-600' :
                    'text-orange-600'
                  }`}>
                    {viewingOrder.status}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className={`font-semibold ${
                    viewingOrder.paymentMethod === 'digital' ? 'text-blue-600' :
                    viewingOrder.paymentMethod === 'cash' ? 'text-green-600' :
                    'text-purple-600'
                  }`}>
                    {viewingOrder.paymentMethod === 'digital' ? 'Digital' :
                     viewingOrder.paymentMethod === 'cash' ? 'Cash' :
                     'Transfer'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-semibold text-lg text-primary-600">
                    ₦{parseFloat(viewingOrder.totalAmount || 0).toFixed(2)}
                  </p>
                </div>
                {viewingOrder.customerName && (
                  <div>
                    <p className="text-sm text-gray-500">Customer Name</p>
                    <p className="font-semibold">{viewingOrder.customerName}</p>
                  </div>
                )}
                {viewingOrder.createdByName && (
                  <div>
                    <p className="text-sm text-gray-500">Created By</p>
                    <p className="font-semibold">{viewingOrder.createdByName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="font-semibold">
                    {new Date(viewingOrder.timestamp).toLocaleString()}
                  </p>
                </div>
                {viewingOrder.updatedAt && (
                  <div>
                    <p className="text-sm text-gray-500">Last Updated</p>
                    <p className="font-semibold">
                      {new Date(viewingOrder.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="border-t pt-4">
                <h4 className="font-semibold text-lg mb-3">Order Items</h4>
                {viewingOrder.items && Array.isArray(viewingOrder.items) && viewingOrder.items.length > 0 ? (
                  <div className="space-y-3">
                    {viewingOrder.items.map((item: any, index: number) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold">{item.name}</p>
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                            <div className="mt-2 flex gap-4 text-sm">
                              <span className="text-gray-600">
                                Quantity: <span className="font-semibold">{item.quantity}</span>
                              </span>
                              <span className="text-gray-600">
                                Price: <span className="font-semibold">₦{parseFloat(item.price || 0).toFixed(2)}</span>
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary-600">
                              ₦{(parseFloat(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No items found</p>
                )}
              </div>

              {/* QR Code for Digital Payments */}
              {viewingOrder.paymentMethod === 'digital' && viewingOrder.qrCode && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-lg mb-3">QR Code</h4>
                  <div className="flex flex-col items-center">
                    <img 
                      src={viewingOrder.qrCode} 
                      alt={`Order ${viewingOrder.id} QR Code`} 
                      className="w-48 h-48 border border-gray-200 rounded-lg mb-3"
                    />
                    <a
                      href={viewingOrder.qrCode}
                      download={`order-${viewingOrder.id}-qr.png`}
                      className="text-primary-600 hover:text-primary-700 underline text-sm"
                    >
                      Download QR Code
                    </a>
                  </div>
                </div>
              )}

              {/* Restaurant Info if available */}
              {viewingOrder.restaurantName && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-lg mb-3">Restaurant</h4>
                  <p className="font-semibold">{viewingOrder.restaurantName}</p>
                  {viewingOrder.bankName && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Bank: {viewingOrder.bankName}</p>
                      {viewingOrder.accountNumber && (
                        <p>Account: {viewingOrder.accountNumber}</p>
                      )}
                      {viewingOrder.accountName && (
                        <p>Account Name: {viewingOrder.accountName}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setViewingOrder(null)}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

