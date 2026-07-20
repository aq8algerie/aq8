import React from 'react';

export function CenterDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8 lg:py-12 animate-pulse">
      {/* Hero Skeleton */}
      <div className="relative overflow-hidden rounded-lg bg-slate-200 h-[280px] sm:h-[350px] lg:h-[400px] flex items-center px-6 py-14 sm:px-10 lg:px-14">
        <div className="space-y-6 w-full max-w-2xl">
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-slate-300 rounded-full" />
            <div className="h-6 w-20 bg-slate-300 rounded-full" />
          </div>
          <div className="h-10 sm:h-14 bg-slate-300 rounded-md w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-slate-300 rounded w-full" />
            <div className="h-4 bg-slate-300 rounded w-5/6" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="h-12 bg-slate-300 rounded-md w-full sm:w-40" />
            <div className="h-12 bg-slate-300 rounded-md w-full sm:w-40" />
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid gap-8 lg:grid-cols-5 items-start">
        {/* Left Column (Details) */}
        <div className="space-y-8 lg:col-span-3">
          {/* Intro Card */}
          <div className="rounded-lg border border-slate-100 bg-white p-6 sm:p-8 space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded-full" />
            <div className="h-8 w-2/3 bg-slate-200 rounded-md" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 rounded w-full" />
              <div className="h-4 bg-slate-200 rounded w-11/12" />
              <div className="h-4 bg-slate-200 rounded w-4/5" />
            </div>
          </div>

          {/* Important Info Card */}
          <div className="rounded-lg border border-slate-100 bg-white p-6 space-y-4">
            <div className="h-6 w-40 bg-slate-200 rounded-md" />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-20 bg-slate-100 rounded-md" />
              <div className="h-20 bg-slate-100 rounded-md" />
            </div>
          </div>

          {/* Hours Card */}
          <div className="rounded-lg border border-slate-100 bg-white p-6 space-y-4">
            <div className="h-6 w-32 bg-slate-200 rounded-md" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-32 bg-slate-100 rounded-md" />
              <div className="h-32 bg-slate-100 rounded-md" />
            </div>
          </div>
        </div>

        {/* Right Column (Form) */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-slate-100 bg-white p-6 space-y-6">
            <div className="space-y-2">
              <div className="h-4 w-20 bg-slate-200 rounded-full" />
              <div className="h-7 w-2/3 bg-slate-200 rounded-md" />
              <div className="h-4 w-full bg-slate-200 rounded" />
            </div>
            <div className="h-16 bg-slate-50 rounded-md" />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-slate-100 rounded-md" />
                <div className="h-10 bg-slate-100 rounded-md" />
              </div>
              <div className="h-10 bg-slate-100 rounded-md" />
              <div className="h-10 bg-slate-100 rounded-md" />
              <div className="h-12 bg-slate-200 rounded-md w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
