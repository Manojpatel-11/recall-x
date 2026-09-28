'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Zap,
  PlusCircle,
  Search,
  History,
  Brain,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Preflight', href: '/preflight', icon: Zap },
  { name: 'Record Experiment', href: '/record', icon: PlusCircle },
  { name: 'Memory Explorer', href: '/explore', icon: Search },
  { name: 'History', href: '/history', icon: History },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-dark-200 transition-all duration-200 z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        <div className={cn('flex items-center justify-between h-16 px-4 border-b border-dark-200', collapsed && 'justify-center')}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-primary-600" />
              <span className="font-semibold text-xl text-dark-900">RECALL-X</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'p-1.5 rounded-lg text-dark-500 hover:bg-dark-100 hover:text-dark-700 transition-colors',
              collapsed && 'mx-auto'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-dark-600 hover:bg-dark-100 hover:text-dark-900',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={cn('p-4 border-t border-dark-200', collapsed && 'hidden')}>
          <div className="text-xs text-dark-500 space-y-1">
            <p className="font-medium text-dark-700">Memory Status</p>
            <div className="flex items-center gap-2 text-dark-600">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Hindsight Connected</span>
            </div>
            <div className="flex items-center gap-2 text-dark-600">
              <span className="w-2 h-2 rounded-full bg-primary-500" />
              <span>LLM Ready</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}