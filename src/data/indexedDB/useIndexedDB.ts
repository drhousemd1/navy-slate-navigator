
/**
 * CENTRALIZED DATA LOGIC – DO NOT COPY OR MODIFY OUTSIDE THIS FOLDER.
 * No query, mutation, or sync logic is allowed in components or page files.
 * All logic must use these shared, optimized hooks and utilities only.
 */

import localforage from "localforage";
import { Task } from "@/lib/taskUtils";
import { Rule } from "@/data/interfaces/Rule";
import { Reward } from "@/lib/rewardUtils";
import { PunishmentData, PunishmentHistoryItem } from "@/contexts/punishments/types";
import { AdminTestingCardData } from "@/components/admin-testing/defaultAdminTestingCards";
import { MonthlyMetricsResult } from "@/data/queries/useMonthlyMetrics";
import { WeeklyMetricsSummary } from "@/data/queries/useWeeklyMetrics";

// Add cache version to prevent stale data issues
const CACHE_VERSION = 'v2';

// Configure localforage
localforage.config({
  name: 'kingdom-app',
  version: 1.0,
  storeName: 'app_data',
  description: 'App offline data cache'
});

// Apply cache version to all keys
const TASKS_KEY = `${CACHE_VERSION}_tasks`;
const RULES_KEY = `${CACHE_VERSION}_rules`;
const REWARDS_KEY = `${CACHE_VERSION}_rewards`;
const PUNISHMENTS_KEY = `${CACHE_VERSION}_punishments`;
const ADMIN_CARDS_KEY = `${CACHE_VERSION}_admin_cards`;
const POINTS_KEY = `${CACHE_VERSION}_points`;
const DOM_POINTS_KEY = `${CACHE_VERSION}_dom_points`;
const PUNISHMENT_HISTORY_KEY = `${CACHE_VERSION}_punishment_history`;
const MONTHLY_METRICS_KEY = `${CACHE_VERSION}_monthly_metrics`;
const WEEKLY_METRICS_KEY = `${CACHE_VERSION}_weekly_metrics`;

// Tasks
export async function saveTasksToDB(tasks: Task[]): Promise<void> {
  await localforage.setItem(TASKS_KEY, tasks);
}

export async function loadTasksFromDB(): Promise<Task[] | null> {
  return localforage.getItem<Task[]>(TASKS_KEY);
}

// Rules
export async function saveRulesToDB(rules: Rule[]): Promise<void> {
  await localforage.setItem(RULES_KEY, rules);
}

export async function loadRulesFromDB(): Promise<Rule[] | null> {
  return localforage.getItem<Rule[]>(RULES_KEY);
}

// Rewards
export async function saveRewardsToDB(rewards: Reward[]): Promise<void> {
  await localforage.setItem(REWARDS_KEY, rewards);
}

export async function loadRewardsFromDB(): Promise<Reward[] | null> {
  return localforage.getItem<Reward[]>(REWARDS_KEY);
}

// Punishments
export async function savePunishmentsToDB(punishments: PunishmentData[]): Promise<void> {
  await localforage.setItem(PUNISHMENTS_KEY, punishments);
}

export async function loadPunishmentsFromDB(): Promise<PunishmentData[] | null> {
  return localforage.getItem<PunishmentData[]>(PUNISHMENTS_KEY);
}

// Admin Testing Cards
export async function saveAdminCardsToDB(cards: AdminTestingCardData[]): Promise<void> {
  await localforage.setItem(ADMIN_CARDS_KEY, cards);
}

export async function loadAdminCardsFromDB(): Promise<AdminTestingCardData[] | null> {
  return localforage.getItem<AdminTestingCardData[]>(ADMIN_CARDS_KEY);
}

// Points
export async function savePointsToDB(points: number): Promise<void> {
  await localforage.setItem(POINTS_KEY, points);
}

export async function loadPointsFromDB(): Promise<number | null> {
  return localforage.getItem<number>(POINTS_KEY);
}

export async function saveDomPointsToDB(points: number): Promise<void> {
  await localforage.setItem(DOM_POINTS_KEY, points);
}

export async function loadDomPointsFromDB(): Promise<number | null> {
  return localforage.getItem<number>(DOM_POINTS_KEY);
}

// Punishment History
export async function savePunishmentHistoryToDB(history: PunishmentHistoryItem[]): Promise<void> {
  await localforage.setItem(PUNISHMENT_HISTORY_KEY, history);
}

export async function loadPunishmentHistoryFromDB(): Promise<PunishmentHistoryItem[] | null> {
  return localforage.getItem<PunishmentHistoryItem[]>(PUNISHMENT_HISTORY_KEY);
}

// Monthly Metrics
export async function saveMonthlyMetricsToDB(data: MonthlyMetricsResult): Promise<void> {
  await localforage.setItem(MONTHLY_METRICS_KEY, data);
}

export async function loadMonthlyMetricsFromDB(): Promise<MonthlyMetricsResult | null> {
  return localforage.getItem<MonthlyMetricsResult>(MONTHLY_METRICS_KEY);
}

// Weekly Metrics
export async function saveWeeklyMetricsToDB(data: WeeklyMetricsSummary): Promise<void> {
  await localforage.setItem(WEEKLY_METRICS_KEY, data);
}

export async function loadWeeklyMetricsFromDB(): Promise<WeeklyMetricsSummary | null> {
  return localforage.getItem<WeeklyMetricsSummary>(WEEKLY_METRICS_KEY);
}

// Helper to clear all cached data
export async function clearAllCachedData(): Promise<void> {
  await localforage.clear();
}

// Helper to get all keys in the store
export async function getAllCacheKeys(): Promise<string[]> {
  return localforage.keys();
}

// Helper to clear old cache versions
export async function clearOldCacheVersions(): Promise<void> {
  const keys = await localforage.keys();
  const oldKeys = keys.filter(key => !key.startsWith(CACHE_VERSION));
  for (const key of oldKeys) {
    await localforage.removeItem(key);
  }
}
