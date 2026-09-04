import { Badge, ClientGamificationStats } from '../types';

/**
 * Utility to get ISO Week key (e.g. "2026-W34") for a given Date
 */
function getIsoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo < 10 ? '0' : ''}${weekNo}`;
}

/**
 * Calculates gamification metrics dynamically for a client
 */
export function calculateClientGamification(
  appointments: any[] = [],
  measurements: any[] = []
): ClientGamificationStats {
  // 1. Filter completed appointments
  const completedAppts = appointments.filter((a) => {
    const status = (a.status || '').toLowerCase();
    return status === 'completed';
  });

  const totalCompletedSessions = completedAppts.length;
  const measurementCount = (measurements || []).length;

  // Sort completed appointments by date ascending
  const sortedAppts = [...completedAppts].sort((a, b) => {
    const dateA = new Date(a.dateTime || a.bookingDate || a.date || 0).getTime();
    const dateB = new Date(b.dateTime || b.bookingDate || b.date || 0).getTime();
    return dateA - dateB;
  });

  // 2. Count sessions per ISO week
  const sessionsPerWeek: Record<string, number> = {};
  sortedAppts.forEach((a) => {
    const rawDate = a.dateTime || a.bookingDate || a.date;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const weekKey = getIsoWeekKey(d);
        sessionsPerWeek[weekKey] = (sessionsPerWeek[weekKey] || 0) + 1;
      }
    }
  });

  // 3. Compute Streak (Consecutive weeks with >= 2 sessions)
  const weekKeys = Object.keys(sessionsPerWeek).sort();
  let currentStreakWeeks = 0;
  let maxStreakWeeks = 0;
  let streakCounter = 0;

  for (let i = 0; i < weekKeys.length; i++) {
    const count = sessionsPerWeek[weekKeys[i]];
    if (count >= 2) {
      streakCounter++;
      if (streakCounter > maxStreakWeeks) {
        maxStreakWeeks = streakCounter;
      }
    } else {
      streakCounter = 0;
    }
  }

  // Current streak (checking recent active streak)
  currentStreakWeeks = streakCounter;

  // 4. Bonus Sessions Earned (1 bonus session for every 4 consecutive streak weeks)
  const earnedBonusSessions = Math.floor(maxStreakWeeks / 4);

  // 5. Level Calculation
  let level: 'starter' | 'challenger' | 'warrior' | 'legend' = 'starter';
  let levelTitle = 'AQ8 Starter';
  let levelBadgeIcon = 'Target';
  let nextLevelSessionTarget = 5;
  let prevLevelSessionTarget = 0;

  if (totalCompletedSessions >= 50) {
    level = 'legend';
    levelTitle = 'Légende AQ8';
    levelBadgeIcon = 'Crown';
    nextLevelSessionTarget = 100;
    prevLevelSessionTarget = 50;
  } else if (totalCompletedSessions >= 20) {
    level = 'warrior';
    levelTitle = 'EMS Warrior';
    levelBadgeIcon = 'Flame';
    nextLevelSessionTarget = 50;
    prevLevelSessionTarget = 20;
  } else if (totalCompletedSessions >= 5) {
    level = 'challenger';
    levelTitle = 'AQ8 Challenger';
    levelBadgeIcon = 'Zap';
    nextLevelSessionTarget = 20;
    prevLevelSessionTarget = 5;
  }

  const denominator = nextLevelSessionTarget - prevLevelSessionTarget;
  const numerator = Math.max(0, totalCompletedSessions - prevLevelSessionTarget);
  const progressToNextLevel = Math.min(100, Math.round((numerator / denominator) * 100));

  // 6. Badges Definition & Status
  const badges: Badge[] = [
    {
      id: 'starter',
      title: 'AQ8 Starter',
      description: 'Bienvenue chez AQ8 ! Première séance EMS effectuée avec succès.',
      iconName: 'Award',
      category: 'milestone',
      requiredCount: 1,
      currentCount: Math.min(1, totalCompletedSessions),
      isUnlocked: totalCompletedSessions >= 1,
      unlockedAt: sortedAppts[0]?.dateTime || sortedAppts[0]?.bookingDate,
    },
    {
      id: 'streak_10',
      title: '10 Séances Consécutives',
      description: 'Cap des 10 séances atteint. Vos muscles sont en pleine transformation !',
      iconName: 'Flame',
      category: 'milestone',
      requiredCount: 10,
      currentCount: Math.min(10, totalCompletedSessions),
      isUnlocked: totalCompletedSessions >= 10,
      unlockedAt: sortedAppts[9]?.dateTime || sortedAppts[9]?.bookingDate,
    },
    {
      id: 'regularity_master',
      title: 'Maître de la Régularité',
      description: '4 semaines consécutives avec au moins 2 séances/semaine. 1 Séance Bonus offerte !',
      iconName: 'Zap',
      category: 'streak',
      requiredCount: 4,
      currentCount: Math.min(4, maxStreakWeeks),
      isUnlocked: maxStreakWeeks >= 4,
    },
    {
      id: 'ems_warrior',
      title: 'EMS Warrior',
      description: 'Vrai guerrier de l’EMS ! Plus de 20 séances au compteur.',
      iconName: 'Shield',
      category: 'milestone',
      requiredCount: 20,
      currentCount: Math.min(20, totalCompletedSessions),
      isUnlocked: totalCompletedSessions >= 20,
      unlockedAt: sortedAppts[19]?.dateTime || sortedAppts[19]?.bookingDate,
    },
    {
      id: 'measurement_pro',
      title: 'Assiduité Mensurations',
      description: 'Au moins 3 bilans de mensurations et de poids enregistrés avec votre coach.',
      iconName: 'Scale',
      category: 'engagement',
      requiredCount: 3,
      currentCount: Math.min(3, measurementCount),
      isUnlocked: measurementCount >= 3,
    },
    {
      id: 'legend',
      title: 'Légende AQ8',
      description: 'Palier ultime de 50 séances effectuées ! Membre élite AQ8 Algérie.',
      iconName: 'Crown',
      category: 'milestone',
      requiredCount: 50,
      currentCount: Math.min(50, totalCompletedSessions),
      isUnlocked: totalCompletedSessions >= 50,
      unlockedAt: sortedAppts[49]?.dateTime || sortedAppts[49]?.bookingDate,
    },
  ];

  return {
    level,
    levelTitle,
    levelBadgeIcon,
    totalCompletedSessions,
    currentStreakWeeks,
    bestStreakWeeks: maxStreakWeeks,
    earnedBonusSessions,
    progressToNextLevel,
    nextLevelSessionTarget,
    badges,
  };
}
