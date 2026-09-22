import { useState, useCallback } from 'react';

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description?: string;
    image?: string;
    order_id?: string;
    handler: (response: any) => void;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes?: {
        [key: string]: string;
    };
    theme?: {
        color: string;
    };
    modal?: {
        ondismiss?: () => void;
    };
    onPaymentFailed?: (response: any) => void;
}

interface UseRazorpayReturn {
    isLoaded: boolean;
    openPayment: (options: RazorpayOptions) => void;
}

export const useRazorpay = (): UseRazorpayReturn => {
    const [isLoaded, setIsLoaded] = useState(false);

    const loadScript = useCallback(() => {
        return new Promise((resolve) => {
            if (document.getElementById('razorpay-script')) {
                setIsLoaded(true);
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.id = 'razorpay-script';
            script.onload = () => {
                setIsLoaded(true);
                resolve(true);
            };
            script.onerror = () => {
                setIsLoaded(false);
                resolve(false);
            };
            document.body.appendChild(script);
        });
    }, []);

    const openPayment = useCallback(async (options: RazorpayOptions) => {
        const loaded = await loadScript();
        if (!loaded) {
            alert('Razorpay SDK failed to load. Are you online?');
            return;
        }

        const rzp = new (window as any).Razorpay(options);
        if (typeof options.onPaymentFailed === "function") {
            rzp.on("payment.failed", options.onPaymentFailed);
        }
        rzp.open();
    }, [loadScript]);

    return { isLoaded, openPayment };
};
