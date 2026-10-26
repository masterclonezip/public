import React, { useEffect } from 'react';
import AdminLoginComponent from '../components/AdminLogin';
import { useNavigate, useLocation } from 'react-router-dom';
import { saveSession, clearSession } from '../services/adminAuthService';
import { getAdminPath } from '../lib/utils';

export default function AdminLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentBase = location.pathname.toLowerCase().startsWith('/masterworld') 
    ? 'masterworld' 
    : getAdminPath();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const isLogout = searchParams.get('logout') === '1' || searchParams.get('logout') === 'true';

    if (isLogout) {
      clearSession();
    }
  }, [location.search]);

  return (
    <AdminLoginComponent 
      onSuccess={(idToken, refreshToken, email) => {
        saveSession({
          idToken,
          refreshToken,
          email,
          expiresAt: Date.now() + 55 * 60 * 1000
        });
        navigate(`/${currentBase}/dashboard`);
      }}
    />
  );
}
