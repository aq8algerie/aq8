import React from 'react';
import { Center, Service } from '../../types';
import CenterDetailPage from '../../../app/(public)/centres/[slug]/page';

export function PublicCenterDetail({
  centerId,
  centers,
}: {
  centerId: string;
  centers: Center[];
  services: Service[];
  onNavigate: (route: any) => void;
}) {
  const center = centers.find(c => c.id === centerId) || centers[0];
  if (!center) return null;

  return <CenterDetailPage params={{ slug: center.slug }} />;
}
