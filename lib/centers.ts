/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AQ8Database } from '../src/mockData';
import { Center } from '../src/types';

export const centers = AQ8Database.getCenters();

export function getCenters(): Center[] {
  return AQ8Database.getCenters();
}

export function getCenterBySlug(slug: string): Center | undefined {
  return AQ8Database.getCenters().find(c => c.slug === slug);
}

