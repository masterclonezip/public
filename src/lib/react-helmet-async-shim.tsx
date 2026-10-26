import React from 'react';

export function HelmetProvider({ children }: { children: React.ReactNode; context?: any }) {
  return <>{children}</>;
}

interface HelmetProps {
  children?: React.ReactNode;
}

export function Helmet({ children }: HelmetProps) {
  return null;
}



