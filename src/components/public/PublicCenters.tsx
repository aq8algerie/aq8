import React from 'react';
import { useSeo } from '../../lib/seo';
import CentresPage from '@/app/(public)/centres/page';

export function PublicCenters() {
  useSeo('centers');
  
  return <CentresPage />;
}
