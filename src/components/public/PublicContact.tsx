import React from 'react';
import { useSeo } from '../../lib/seo';
import ContactPage from '@/app/(public)/contact/page';

export function PublicContact({ centers }: { centers?: any }) {
  useSeo('contact');
  
  return <ContactPage />;
}
