import React from 'react';
import { Center, Service } from '../../types';
import CenterDetailPage from '../../../app/(public)/centres/[slug]/page';
import { CenterDetailSkeleton } from './CenterDetailSkeleton';

export function PublicCenterDetail({
  centerId,
  centerSlug,
  centers,
}: {
  centerId: string;
  centerSlug?: string;
  centers: Center[];
  services: Service[];
  onNavigate: (route: any) => void;
}) {
  if (centers.length === 0) {
    return <CenterDetailSkeleton />;
  }

  const center = centers.find(c => c.id === centerId) || centers.find(c => c.slug === centerSlug);

  return <CenterDetailPage params={Promise.resolve({ slug: centerSlug || center?.slug || '' })} />;
}
