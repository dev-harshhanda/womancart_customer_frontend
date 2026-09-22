"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { setToStorage, getFromStorage } from '@/constants/storage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { useAppSelector } from '@/lib/hook';
import { getToken } from '@/lib/slices/authSlice';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

export default function ReferralClient() {
  const router = useRouter();
  const params = useParams();
  const [code, setCode] = useState<string>('');
  const [showAlert, setShowAlert] = useState(false);
  const token = useAppSelector(getToken);

  useEffect(() => {
    // Try to get code from params first
    let referralCode = params?.code as string;
    
    // If not in params, try to extract from URL pathname (fallback for static export)
    if (!referralCode && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      // Match /referral/CODE or /referral/CODE/
      const match = pathname.match(/\/referral\/([^\/]+)/) || pathname.match(/\/referCode\/([^\/]+)/);
      if (match && match[1]) {
        referralCode = match[1];
      }
    }

    if (referralCode) {
      setCode(referralCode);
      
      // Check if user is logged in (existing user)
      const userToken = token || getFromStorage(STORAGE_KEYS.token);
      
      if (userToken) {
        // User is logged in - show alert like mobile app
        setShowAlert(true);
      } else {
        // New user - store referral code in localStorage (same as mobile app)
        setToStorage(STORAGE_KEYS.referralCode, referralCode);

        // Redirect to sign-up page after storing referral code
        setTimeout(() => {
          router.push('/auth/sign-up');
        }, 500);
      }
    } else {
      // If no code, redirect to home
      router.push('/');
    }
  }, [params, router, token]);

  const handleCloseAlert = () => {
    setShowAlert(false);
    router.push('/');
  };

  return (
    <>
      <Dialog 
        open={showAlert} 
        onClose={handleCloseAlert}
        PaperProps={{
          style: {
            borderRadius: '8px',
            padding: '20px',
            minWidth: '300px',
          }
        }}
      >
        <DialogTitle style={{ fontWeight: 'bold', paddingBottom: '10px' }}>
          Referral Not Applicable
        </DialogTitle>
        <DialogContent>
          <p style={{ margin: 0 }}>
            To redeem the referral code, you must be a new user.
          </p>
        </DialogContent>
        <DialogActions style={{ paddingTop: '20px' }}>
          <Button 
            onClick={handleCloseAlert} 
            variant="contained"
            style={{
              backgroundColor: '#f0f0f0',
              color: '#000',
              textTransform: 'none',
              borderRadius: '4px',
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <p>Processing your referral...</p>
        {code && <p>Referral Code: {code}</p>}
      </div>
    </>
  );
}
