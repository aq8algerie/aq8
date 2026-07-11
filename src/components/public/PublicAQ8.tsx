import React from 'react';
import { useSeo } from '../../lib/seo';
import Aq8Page from '@/app/(public)/aq8/page';

export function PublicAQ8() {
  useSeo('aq8');
  
  return <Aq8Page />;
}
