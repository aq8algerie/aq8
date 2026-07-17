import React from 'react';
import { Center, Service } from '../../types';
import CenterDetailPage from '../../../app/(public)/centres/[slug]/page';

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
  const center = centers.find(c => c.id === centerId) || centers.find(c => c.slug === centerSlug);

  return <CenterDetailPage params={{ slug: centerSlug || center?.slug || '' }} center={center} />;
}
