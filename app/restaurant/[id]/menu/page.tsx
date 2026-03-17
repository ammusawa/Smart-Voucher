'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import { useModal } from '@/hooks/useModal';

export default function MenuManagementPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [restockingItem, setRestockingItem] = useState<any | null>(null);
  const [restockQuantity, setRestockQuantity] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    description: '',
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const { modal, showSuccess, showError, hideModal } = useModal();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || (data.user.role !== 'restaurant' && data.user.role !== 'admin' && data.user.role !== 'staff')) {
          router.push('/');
          return;
        }
      })
      .catch(() => router.push('/'));

    fetchMenuItems();
  }, [restaurantId, router]);

  const fetchMenuItems = () => {
    fetch(`/api/restaurants/${restaurantId}/menu`)
      .then(res => res.json())
      .then(data => {
        setMenuItems(data.menuItems || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', imageFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to upload image');
        setUploading(false);
        return null;
      }

      setUploading(false);
      return data.url;
    } catch (err) {
      showError('Failed to upload image');
      setUploading(false);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate price and stock before submission
    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock);

    if (isNaN(price) || price < 0) {
      showError('Price must be a positive number. Please enter a valid price.');
      return;
    }

    if (isNaN(stock) || stock < 0) {
      showError('Stock must be a non-negative number. Please enter a valid stock quantity.');
      return;
    }

    if (price === 0) {
      showError('Price must be greater than zero. Please enter a valid price.');
      return;
    }
    
    // Upload image first if provided
    let imageUrl = formData.imageUrl;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        return; // Stop if image upload failed
      }
    }

    try {
      const url = editingItem 
        ? `/api/restaurants/${restaurantId}/menu/${editingItem.id}`
        : `/api/restaurants/${restaurantId}/menu`;
      
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          price: price,
          stock: stock,
          description: formData.description,
          imageUrl: imageUrl || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || `Failed to ${editingItem ? 'update' : 'add'} menu item`);
        return;
      }

      showSuccess(`Menu item ${editingItem ? 'updated' : 'added'} successfully`, 'Success', 2000);
      setFormData({ name: '', price: '', stock: '', description: '', imageUrl: '' });
      setImageFile(null);
      setImagePreview('');
      setShowForm(false);
      setEditingItem(null);
      fetchMenuItems();
    } catch (err) {
      showError('An error occurred. Please try again.');
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      stock: item.stock.toString(),
      description: item.description || '',
      imageUrl: item.imageUrl || '',
    });
    setImagePreview(item.imageUrl || '');
    setImageFile(null);
    setShowForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deletingItem) return;

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/${deletingItem.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to delete menu item');
        return;
      }

      showSuccess('Menu item deleted successfully', 'Success', 2000);
      setDeletingItem(null);
      fetchMenuItems();
    } catch (err) {
      showError('An error occurred. Please try again.');
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', price: '', stock: '', description: '', imageUrl: '' });
    setImageFile(null);
    setImagePreview('');
    setShowForm(false);
    setEditingItem(null);
  };

  const handleRestock = async () => {
    if (!restockingItem || !restockQuantity) {
      showError('Please enter a quantity');
      return;
    }

    const quantity = parseInt(restockQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      showError('Please enter a valid positive number');
      return;
    }

    try {
      const newStock = restockingItem.stock + quantity;
      const res = await fetch(`/api/restaurants/${restaurantId}/menu/${restockingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: restockingItem.name,
          price: restockingItem.price,
          stock: newStock,
          description: restockingItem.description || '',
          imageUrl: restockingItem.imageUrl || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || 'Failed to restock item');
        return;
      }

      showSuccess(`Added ${quantity} to stock. New stock: ${newStock}`, 'Restocked', 2000);
      setRestockingItem(null);
      setRestockQuantity('');
      fetchMenuItems();
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
            <button
              onClick={() => {
                if (showForm) {
                  handleCancel();
                } else {
                  setShowForm(true);
                }
              }}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700"
            >
              {showForm ? 'Cancel' : 'Add Menu Item'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price (₦)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock</label>
                    <input
                      type="number"
                      min="0"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Item Image</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Menu Items</h2>
            </div>
            {menuItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No menu items. Add your first item above.
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {menuItems.map((item) => (
                  <div key={item.id} className="p-6 flex gap-6 items-start hover:bg-gray-50 transition-colors">
                    {item.imageUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-300 cursor-pointer"
                          onClick={() => setViewingItem(item)}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                      )}
                      <div className="mt-2 flex space-x-4 items-center">
                        <span className="text-primary-600 font-semibold">₦{parseFloat(item.price).toFixed(2)}</span>
                        <span className={`text-sm ${item.stock > 0 ? 'text-gray-600' : 'text-red-600 font-semibold'}`}>
                          Stock: {item.stock}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex gap-2 flex-wrap">
                      <button
                        onClick={() => setViewingItem(item)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium text-sm"
                        title="View Details"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setRestockingItem(item);
                          setRestockQuantity('');
                        }}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium text-sm"
                        title="Restock Item"
                      >
                        Restock
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium text-sm"
                        title="Edit Item"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium text-sm"
                        title="Delete Item"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{viewingItem.name}</h2>
                <button
                  onClick={() => setViewingItem(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {viewingItem.imageUrl && (
                <div className="mb-4">
                  <img
                    src={viewingItem.imageUrl}
                    alt={viewingItem.name}
                    className="w-full h-64 object-cover rounded-lg border border-gray-300"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Price:</span>
                  <p className="text-xl font-bold text-primary-600">₦{parseFloat(viewingItem.price).toFixed(2)}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Stock:</span>
                  <p className={`text-lg font-semibold ${viewingItem.stock > 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {viewingItem.stock} {viewingItem.stock === 1 ? 'item' : 'items'}
                  </p>
                </div>

                {viewingItem.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Description:</span>
                    <p className="text-gray-700 mt-1">{viewingItem.description}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setViewingItem(null);
                        setRestockingItem(viewingItem);
                        setRestockQuantity('');
                      }}
                      className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700"
                    >
                      Restock
                    </button>
                    <button
                      onClick={() => {
                        setViewingItem(null);
                        handleEdit(viewingItem);
                      }}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
                    >
                      Edit Item
                    </button>
                    <button
                      onClick={() => {
                        setViewingItem(null);
                        setDeletingItem(viewingItem);
                      }}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                    >
                      Delete Item
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">Restock Item</h2>
              <button
                onClick={() => {
                  setRestockingItem(null);
                  setRestockQuantity('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                <strong>{restockingItem.name}</strong>
              </p>
              <p className="text-sm text-gray-600">
                Current stock: <span className="font-semibold">{restockingItem.stock}</span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Add
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                placeholder="Enter quantity"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRestock();
                  }
                }}
              />
              {restockQuantity && !isNaN(parseInt(restockQuantity)) && parseInt(restockQuantity) > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  New stock will be: <span className="font-semibold text-purple-600">
                    {restockingItem.stock + parseInt(restockQuantity)}
                  </span>
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRestock}
                disabled={!restockQuantity || isNaN(parseInt(restockQuantity)) || parseInt(restockQuantity) <= 0}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Stock
              </button>
              <button
                onClick={() => {
                  setRestockingItem(null);
                  setRestockQuantity('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Menu Item</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{deletingItem.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setDeletingItem(null)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

