
import { db } from './db';
import { Rule } from '@/data/interfaces/Rule'; // Use the canonical Rule interface
import { getLastSyncTime, setLastSyncTime } from './common';

const RULES_ENTITY_NAME = 'rules';

export const loadRulesFromDB = async (): Promise<Rule[] | null> => {
  try {
    const rules = await db.rules.toArray();
    // Ensure the returned rules conform to the Rule interface
    return rules.length > 0 ? rules.map(rule => rule as Rule) : null;
  } catch (error) {
    console.error("Error loading rules from IndexedDB:", error);
    return null;
  }
};

export const saveRulesToDB = async (rules: Rule[]): Promise<void> => {
  try {
    await db.transaction('rw', db.rules, async () => {
      await db.rules.clear();
      await db.rules.bulkAdd(rules);
    });
  } catch (error) {
    console.error("Error saving rules to IndexedDB:", error);
  }
};

export const getRuleByIdFromDB = async (id: string): Promise<Rule | null> => {
  try {
    const rule = await db.rules.get(id);
    return rule ? rule as Rule : null;
  } catch (error) {
    console.error(`Error getting rule ${id} from IndexedDB:`, error);
    return null;
  }
};

export const addRuleToDB = async (rule: Rule): Promise<void> => {
  try {
    await db.rules.add(rule);
  } catch (error) {
    console.error("Error adding rule to IndexedDB:", error);
  }
};

export const updateRuleInDB = async (rule: Rule): Promise<void> => {
  try {
    await db.rules.put(rule);
  } catch (error) {
    console.error("Error updating rule in IndexedDB:", error);
  }
};

export const deleteRuleFromDB = async (id: string): Promise<void> => {
  try {
    await db.rules.delete(id);
  } catch (error) {
    console.error("Error deleting rule from IndexedDB:", error);
  }
};

export const getLastSyncTimeForRules = (): Promise<string | null> => {
  return getLastSyncTime(RULES_ENTITY_NAME);
};

export const setLastSyncTimeForRules = (timestamp: string): Promise<void> => {
  return setLastSyncTime(RULES_ENTITY_NAME, timestamp);
};
