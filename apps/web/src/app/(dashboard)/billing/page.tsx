'use client';

import { useState } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');

      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  const createOrder = async (): Promise<CreateOrderResponse> => {
    const response = await fetch(`${API_URL}/billing/create-order`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',

        // Temporary testing:
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmOTA3ZjE1Zi0yNDM0LTRkMTctOTJjOC0yOWI1MWU3OTMwYjMiLCJvcmdJZCI6Ijk5NGI4NDM5LTI5YWEtNDI5Ny1iNWEyLTRjMjYwMTFiZTAyNSIsInJvbGUiOiJvcmdfYWRtaW4iLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4OTc1NzkwMiwiZXhwIjoxNzg5NzYxNTAyfQ.PiTIQbR0LyjmESbUDyRPNC7Qi176i9ht2HB5P4_deYE`,
      },

      body: JSON.stringify({
        planId: 'starter',
        billingCycle: 'monthly',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create order');
    }

    return data;
  };

  const verifyPayment = async (payment: RazorpayResponse) => {
    const response = await fetch(`${API_URL}/billing/verify-payment`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',

        // Temporary testing:
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmOTA3ZjE1Zi0yNDM0LTRkMTctOTJjOC0yOWI1MWU3OTMwYjMiLCJvcmdJZCI6Ijk5NGI4NDM5LTI5YWEtNDI5Ny1iNWEyLTRjMjYwMTFiZTAyNSIsInJvbGUiOiJvcmdfYWRtaW4iLCJ0b2tlblZlcnNpb24iOjAsImlhdCI6MTc4OTc1NzkwMiwiZXhwIjoxNzg5NzYxNTAyfQ.PiTIQbR0LyjmESbUDyRPNC7Qi176i9ht2HB5P4_deYE`,
      },

      body: JSON.stringify({
        orderId: payment.razorpay_order_id,
        paymentId: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Payment verification failed');
    }

    return data;
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setMessage('');

      // 1. Load Razorpay Checkout
      const loaded = await loadRazorpay();

      if (!loaded) {
        throw new Error('Unable to load Razorpay Checkout');
      }

      // 2. Create Razorpay order
      const order = await createOrder();

      console.log('Order created:', order);

      // 3. Razorpay Checkout configuration
      const options = {
        key:
          order.keyId ||
          process.env.B3bFZb3wmjY92e,

        amount: order.amount * 100,

        currency: order.currency,

        name: 'HireSync',

        description: 'Starter Monthly Subscription',

        order_id: order.orderId,

        handler: async (response: RazorpayResponse) => {
  console.log('🔥 RAZORPAY SUCCESS:', response);

  try {
    setMessage('Verifying payment...');

    console.log('➡️ Sending verify request...');

    const result = await verifyPayment(response);

    console.log('✅ VERIFY RESPONSE:', result);

    setMessage('Payment successful! 🎉');
    setLoading(false);
  } catch (error) {
    console.error('❌ VERIFICATION ERROR:', error);

    setMessage(
      error instanceof Error
        ? error.message
        : 'Payment verification failed',
    );

    setLoading(false);
  }
},

        modal: {
          ondismiss: () => {
            setLoading(false);
            setMessage('Payment cancelled');
          },
        },

        prefill: {
          name: 'HireSync User',
          email: 'test@example.com',
          contact: '9999999999',
        },

        notes: {
          source: 'HireSync Billing',
        },

        theme: {
          color: '#111827',
        },
      };

      // 5. Open Razorpay Checkout
      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response);

        setMessage(
          response.error?.description || 'Payment failed',
        );

        setLoading(false);
      });

      razorpay.open();

    } catch (error) {
      console.error('Payment error:', error);

      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong',
      );

      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <h1 className="text-2xl font-bold">
          HireSync Starter
        </h1>

        <p className="mt-2 text-gray-500">
          Essential hiring features
        </p>

        <div className="my-6">
          <span className="text-4xl font-bold">
            ₹999
          </span>

          <span className="text-gray-500">
            {' '}
            / month
          </span>
        </div>

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full rounded-lg bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Pay ₹999'}
        </button>

        {message && (
          <p className="mt-4 text-center text-sm">
            {message}
          </p>
        )}

      </div>
    </main>
  );
}