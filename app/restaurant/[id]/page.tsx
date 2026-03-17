'use client';

import { useEffect, useState } from 'react';
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

export default function RestaurantPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { modal, showSuccess, showError, showWarning, hideModal } = useModal();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'user') {
          router.push('/');
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.push('/'));

    fetch(`/api/restaurants/${restaurantId}/menu`)
      .then(res => res.json())
      .then(data => {
        // Ensure prices are numbers
        const items = (data.menuItems || []).map((item: any) => ({
          ...item,
          price: parseFloat(item.price) || 0,
          stock: parseInt(item.stock) || 0,
        }));
        setMenuItems(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch('/api/restaurants')
      .then(res => res.json())
      .then(data => {
        const found = data.restaurants?.find((r: any) => r.id === parseInt(restaurantId));
        setRestaurant(found);
      })
      .catch(() => {});
  }, [restaurantId, router]);

  const addToCart = (item: MenuItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.item.id === item.id 
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId: number) => {
    setCart(cart.filter(c => c.item.id !== itemId));
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(c => 
      c.item.id === itemId ? { ...c, quantity } : c
    ));
  };

  const totalAmount = cart.reduce((sum, c) => sum + parseFloat(c.item.price) * c.quantity, 0);

  const handlePayment = async () => {
    if (cart.length === 0) {
      showWarning('Cart is empty', 'Empty Cart');
      return;
    }

    if (!user || user.balance < totalAmount) {
      showError('Insufficient balance. Please top up your account.', 'Insufficient Balance');
      return;
    }

    const items = cart.map(c => ({
      menuItemId: c.item.id,
      quantity: c.quantity,
      price: parseFloat(c.item.price),
      name: c.item.name,
    }));

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: parseInt(restaurantId),
          items,
          totalAmount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Payment failed');
        return;
      }

      showSuccess('Payment successful!', 'Payment Complete', 2000);
      setCart([]);
      setTimeout(() => {
        router.push('/transactions');
      }, 2000);
    } catch (err) {
      showError('An error occurred. Please try again.');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl">Loading...</div>
        </div>
      </>
    );
  }

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
          {restaurant && (
            <div className="mb-6 bg-white rounded-lg shadow p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
              <p className="text-gray-600 mb-4">{restaurant.location}</p>
              
              {restaurant.description && (
                <p className="text-gray-700 mb-4">{restaurant.description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {restaurant.phone && (
                  <div>
                    <span className="font-semibold text-gray-700">Phone: </span>
                    <span className="text-gray-600">{restaurant.phone}</span>
                  </div>
                )}
                {restaurant.email && (
                  <div>
                    <span className="font-semibold text-gray-700">Email: </span>
                    <span className="text-gray-600">{restaurant.email}</span>
                  </div>
                )}
                {restaurant.openingHours && (
                  <div>
                    <span className="font-semibold text-gray-700">Hours: </span>
                    <span className="text-gray-600">{restaurant.openingHours}</span>
                  </div>
                )}
                {restaurant.website && (
                  <div>
                    <span className="font-semibold text-gray-700">Website: </span>
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                      {restaurant.website}
                    </a>
                  </div>
                )}
              </div>
              
              {restaurant.address && (
                <div className="mt-4">
                  <span className="font-semibold text-gray-700">Address: </span>
                  <span className="text-gray-600">{restaurant.address}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Menu</h2>
                {menuItems.length === 0 ? (
                  <p className="text-gray-500">No menu items available.</p>
                ) : (
                  <div className="space-y-4">
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4 flex gap-4 items-center"
                      >
                        {item.imageUrl && (
                          <div className="flex-shrink-0">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-24 h-24 object-cover rounded-lg border border-gray-300"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          <p className="text-primary-600 font-semibold mt-2">
                            ₦{parseFloat(item.price).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Stock: {item.stock}</p>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 flex-shrink-0"
                        >
                          Add to Cart
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4">Cart</h2>
                {cart.length === 0 ? (
                  <p className="text-gray-500">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {cart.map((c) => (
                        <div key={c.item.id} className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{c.item.name}</p>
                            <p className="text-sm text-gray-600">₦{parseFloat(c.item.price).toFixed(2)} × {c.quantity}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateQuantity(c.item.id, c.quantity - 1)}
                              className="bg-gray-200 text-gray-700 w-8 h-8 rounded"
                            >
                              -
                            </button>
                            <span>{c.quantity}</span>
                            <button
                              onClick={() => updateQuantity(c.item.id, c.quantity + 1)}
                              className="bg-gray-200 text-gray-700 w-8 h-8 rounded"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeFromCart(c.item.id)}
                              className="text-red-500 ml-2"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between mb-4">
                        <span className="font-semibold">Total:</span>
                        <span className="font-bold text-xl">₦{totalAmount.toFixed(2)}</span>
                      </div>
                      <button
                        onClick={handlePayment}
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700"
                      >
                        Pay Now
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

