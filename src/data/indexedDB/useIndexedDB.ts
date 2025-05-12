
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

// Configure localforage
localforage.config({
  name: 'kingdom-app',
  version: 1.0,
  storeName: 'app_data',
  description: 'App offline data cache'
});

// Storage Keys
const TASKS_KEY = "tasks-data";
const TASKS_SYNC_KEY = "tasks-last-sync";
const RULES_KEY = "rules-data";
const RULES_SYNC_KEY = "rules-last-sync";
const REWARDS_KEY = "rewards-data";
const REWARDS_SYNC_KEY = "rewards-last-sync";
const PUNISHMENTS_KEY = "punishments-data";
const PUNISHMENTS_SYNC_KEY = "punishments-last-sync";
const POINTS_KEY = "points";
const DOM_POINTS_KEY = "dom_points";
const PUNISHMENT_HISTORY_KEY = "punishment_history";

// Tasks
export async function loadTasksFromDB() {
  return await localforage.getItem(TASKS_KEY);
}

export async function saveTasksToDB(data) {
  await localforage.setItem(TASKS_KEY, data);
}

export async function getLastSyncTimeForTasks() {
  return await localforage.getItem(TASKS_SYNC_KEY);
}

export async function setLastSyncTimeForTasks(date) {
  await localforage.setItem(TASKS_SYNC_KEY, date);
}

// Rules
export async function loadRulesFromDB() {
  return await localforage.getItem(RULES_KEY);
}

export async function saveRulesToDB(data) {
  await localforage.setItem(RULES_KEY, data);
}

export async function getLastSyncTimeForRules() {
  return await localforage.getItem(RULES_SYNC_KEY);
}

export async function setLastSyncTimeForRules(date) {
  await localforage.setItem(RULES_SYNC_KEY, date);
}

// Rewards
export async function loadRewardsFromDB() {
  return await localforage.getItem(REWARDS_KEY);
}

export async function saveRewardsToDB(data) {
  await localforage.setItem(REWARDS_KEY, data);
}

export async function getLastSyncTimeForRewards() {
  return await localforage.getItem(REWARDS_SYNC_KEY);
}

export async function setLastSyncTimeForRewards(date) {
  await localforage.setItem(REWARDS_SYNC_KEY, date);
}

// Punishments
export async function loadPunishmentsFromDB() {
  return await localforage.getItem(PUNISHMENTS_KEY);
}

export async function savePunishmentsToDB(data) {
  await localforage.setItem(PUNISHMENTS_KEY, data);
}

export async function getLastSyncTimeForPunishments() {
  return await localforage.getItem(PUNISHMENTS_SYNC_KEY);
}

export async function setLastSyncTimeForPunishments(date) {
  await localforage.setItem(PUNISHMENTS_SYNC_KEY, date);
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

// Helper to clear all cached data
export async function clearAllCachedData(): Promise<void> {
  await localforage.clear();
}

// Helper to get all keys in the store
export async function getAllCacheKeys(): Promise<string[]> {
  return localforage.keys();
}
