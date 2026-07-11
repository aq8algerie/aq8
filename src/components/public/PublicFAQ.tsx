import React from 'react';
import { useSeo } from '../../lib/seo';
import FaqPage from '@/app/(public)/faq/page';

export function PublicFAQ() {
  useSeo('faq');
  
  return <FaqPage />;
}
