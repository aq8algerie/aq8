/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AQ8Database } from '../src/mockData';
import { Center } from '../src/types';
import { getPublicCenters } from '../src/lib/centerVisibility';

export const centers = getPublicCenters(AQ8Database.getCenters());

export function getCenters(): Center[] {
  return getPublicCenters(AQ8Database.getCenters());
}

export function getCenterBySlug(slug: string): Center | undefined {
  return getPublicCenters(AQ8Database.getCenters()).find(c => c.slug === slug);
}

