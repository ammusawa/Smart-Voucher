'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (user) {
    if (user.role === 'user') {
      router.push('/dashboard');
      return null;
    } else if (user.role === 'restaurant' || user.role === 'staff') {
      router.push('/restaurant/dashboard');
      return null;
    } else if (user.role === 'admin') {
      router.push('/admin/dashboard');
      return null;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Baze Smart Voucher
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Digital meal voucher system
        </p>

        <div className="space-y-4">
          <Link
            href="/login"
            className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="block w-full bg-gray-200 text-gray-800 text-center py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Register
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-center text-gray-500">
            Scan QR codes to pay for meals at campus restaurants
          </p>
        </div>
      </div>
    </div>
  );
}

