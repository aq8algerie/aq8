import React from 'react';
import { useSeo } from '../../lib/seo';
import ReservationPage from '@/app/(public)/reservation/page';

export function PublicBooking() {
  useSeo('booking');
  
  return <ReservationPage />;
}
