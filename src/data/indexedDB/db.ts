
import Dexie, { Table } from 'dexie';
import { Task } from '@/data/tasks/types';
import { Rule } from '@/data/interfaces/Rule';
// import { Reward } from '@/data/rewards/types'; // Assuming Reward type exists

export interface LastSync {
  id: string; // e.g., 'tasks', 'rules'
  timestamp: string; // ISO string
}

export class AppDB extends Dexie {
  tasks!: Table<Task, string>;
  rules!: Table<Rule, string>;
  // rewards!: Table<Reward, string>;
  lastSyncTimes!: Table<LastSync, string>;

  constructor() {
    super('AppDB');
    this.version(2).stores({
      tasks: 'id, title, completed, frequency, last_completed_date, created_at',
      rules: 'id, title, frequency, created_at',
      // rewards: 'id, title, cost, type, created_at',
      lastSyncTimes: 'id', // Primary key 'id' will be 'tasks', 'rules', etc.
    });
    // Upgrade from version 1 if needed (example)
    this.version(1).stores({
        tasks: 'id, title, completed, frequency, last_completed_date',
        rules: 'id, title, frequency',
        // rewards: 'id, title, cost, type',
        lastSyncTimes: 'id',
    }).upgrade(tx => {
        // Example: If you added 'created_at' index to tasks in v2
        // No explicit data migration needed if just adding index on existing property
        // If properties were added to objects, they'd be undefined until next save
        console.log("Upgrading DB from v1 to v2");
    });
    // Ensure all tables are defined
    this.tasks = this.table('tasks');
    this.rules = this.table('rules');
    // this.rewards = this.table('rewards');
    this.lastSyncTimes = this.table('lastSyncTimes');
  }
}

export const db = new AppDB();
