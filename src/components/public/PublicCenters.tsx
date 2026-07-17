import React from 'react';
import { useSeo } from '../../lib/seo';
import { Center } from '../../types';
import CentresPage from '@/app/(public)/centres/page';

export function PublicCenters({ centers }: { centers: Center[] }) {
  useSeo('centers');
  
  return <CentresPage centers={centers} />;
}
