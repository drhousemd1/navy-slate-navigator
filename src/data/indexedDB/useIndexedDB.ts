
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

// Tasks
export async function saveTasksToDB(tasks: Task[]): Promise<void> {
  await localforage.setItem("tasks", tasks);
}

export async function loadTasksFromDB(): Promise<Task[] | null> {
  return localforage.getItem<Task[]>("tasks");
}

// Rules
export async function saveRulesToDB(rules: Rule[]): Promise<void> {
  await localforage.setItem("rules", rules);
}

export async function loadRulesFromDB(): Promise<Rule[] | null> {
  return localforage.getItem<Rule[]>("rules");
}

// Rewards
export async function saveRewardsToDB(rewards: Reward[]): Promise<void> {
  await localforage.setItem("rewards", rewards);
}

export async function loadRewardsFromDB(): Promise<Reward[] | null> {
  return localforage.getItem<Reward[]>("rewards");
}

// Punishments
export async function savePunishmentsToDB(punishments: PunishmentData[]): Promise<void> {
  await localforage.setItem("punishments", punishments);
}

export async function loadPunishmentsFromDB(): Promise<PunishmentData[] | null> {
  return localforage.getItem<PunishmentData[]>("punishments");
}

// Points
export async function savePointsToDB(points: number): Promise<void> {
  await localforage.setItem("points", points);
}

export async function loadPointsFromDB(): Promise<number | null> {
  return localforage.getItem<number>("points");
}

export async function saveDomPointsToDB(points: number): Promise<void> {
  await localforage.setItem("dom_points", points);
}

export async function loadDomPointsFromDB(): Promise<number | null> {
  return localforage.getItem<number>("dom_points");
}

// Punishment History
export async function savePunishmentHistoryToDB(history: PunishmentHistoryItem[]): Promise<void> {
  await localforage.setItem("punishment_history", history);
}

export async function loadPunishmentHistoryFromDB(): Promise<PunishmentHistoryItem[] | null> {
  return localforage.getItem<PunishmentHistoryItem[]>("punishment_history");
}

// Helper to clear all cached data
export async function clearAllCachedData(): Promise<void> {
  await localforage.clear();
}

// Helper to get all keys in the store
export async function getAllCacheKeys(): Promise<string[]> {
  return localforage.keys();
}
