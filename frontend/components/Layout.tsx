'use client';

import { Sidebar } from './Sidebar';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dark-50">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-200 min-h-screen',
          'lg:ml-64'
        )}
      >
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}