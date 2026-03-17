import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Users, CreditCard, ArrowUpRight } from 'lucide-react';

export function Overview() {
  const { profile } = useAuth();

  const stats = [
    { label: 'Total Revenue', value: '$45,231.89', change: '+20.1%', icon: <CreditCard className="w-5 h-5" /> },
    { label: 'Active Users', value: '+2350', change: '+180.1%', icon: <Users className="w-5 h-5" /> },
    { label: 'Active Sessions', value: '+12,234', change: '+19%', icon: <Activity className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900">Overview</h2>
        <p className="text-zinc-500 mt-2">Welcome back, {profile?.displayName || 'User'}!</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat, i) => (
          <div key={i} className="p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-500">{stat.label}</h3>
              <div className="p-2 bg-zinc-100 text-zinc-900 rounded-lg">
                {stat.icon}
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-900">{stat.value}</span>
              <span className="text-sm font-medium text-emerald-600 flex items-center">
                {stat.change}
                <ArrowUpRight className="w-4 h-4 ml-0.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm min-h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Recent Activity</h3>
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm border-2 border-dashed border-zinc-100 rounded-xl">
            Activity chart placeholder
          </div>
        </div>
        <div className="lg:col-span-3 p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm min-h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Recent Sales</h3>
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm border-2 border-dashed border-zinc-100 rounded-xl">
            Sales list placeholder
          </div>
        </div>
      </div>
    </div>
  );
}
