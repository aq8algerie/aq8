import React from 'react';
import { useSeo } from '../../lib/seo';
import WonderPage from '@/app/(public)/wonder/page';

export function PublicWonder() {
  useSeo('wonder');
  
  return <WonderPage />;
}
