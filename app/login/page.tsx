'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';

export default function LoginPage() {
  const router = useRouter();
  // If already authenticated, redirect out of login
  // This prevents seeing the login form after a successful login
  // (especially on some mobile browsers where SPA state may lag)
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          const role = data.user.role;
          if (role === 'user') {
            router.replace('/dashboard');
          } else if (role === 'restaurant' || role === 'staff') {
            router.replace('/restaurant/dashboard');
          } else if (role === 'admin') {
            router.replace('/admin/dashboard');
          }
        }
      })
      .catch(() => {});
  }, [router]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loggedInUserName, setLoggedInUserName] = useState('');
  const [loggedInUserRole, setLoggedInUserRole] = useState<'user' | 'restaurant' | 'admin' | 'staff'>('user');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Show success modal with user's name
      setLoggedInUserName(data.user.name);
      setLoggedInUserRole(data.user.role);
      setShowSuccessModal(true);
      setLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    // Redirect based on role after modal is closed
      const go = (path: string) => {
        router.replace(path);
        // Fallback in case SPA state hasn't picked up cookie yet
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname !== path) {
            window.location.href = path;
          }
        }, 50);
      };
    
    if (loggedInUserRole === 'user') {
        go('/dashboard');
    } else if (loggedInUserRole === 'restaurant' || loggedInUserRole === 'staff') {
        go('/restaurant/dashboard');
    } else if (loggedInUserRole === 'admin') {
        go('/admin/dashboard');
      } else {
        go('/');
    }
  };

  return (
    <>
      <Navbar />
      <Modal
        isOpen={showSuccessModal}
        onClose={handleModalClose}
        title="Login Successful!"
        message={`Welcome back, ${loggedInUserName}! You have successfully logged in to your account.`}
        type="success"
        showCloseButton={true}
      />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/register"
                className="text-primary-600 hover:text-primary-500"
              >
                Don't have an account? Register
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

