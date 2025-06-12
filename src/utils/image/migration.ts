
import { ImageMetadata } from './helpers';
import { migrateLegacyImageUrl } from './integration';
import { logger } from '@/lib/logger';

/**
 * Migrates a rule's image data to new format
 */
export function migrateRuleImageData(rule: any): {
  image_meta: ImageMetadata | null;
  background_image_url: string | null;
} {
  // If image_meta already exists and is valid, use it
  if (rule.image_meta && typeof rule.image_meta === 'object') {
    return {
      image_meta: rule.image_meta as ImageMetadata,
      background_image_url: rule.background_image_url
    };
  }

  // If only background_image_url exists, migrate it
  if (rule.background_image_url) {
    const migratedMeta = migrateLegacyImageUrl(rule.background_image_url);
    return {
      image_meta: migratedMeta,
      background_image_url: rule.background_image_url
    };
  }

  // No image data
  return {
    image_meta: null,
    background_image_url: null
  };
}

/**
 * Migrates a task's image data to new format
 */
export function migrateTaskImageData(task: any): {
  image_meta: ImageMetadata | null;
  background_image_url: string | null;
} {
  // If image_meta already exists and is valid, use it
  if (task.image_meta && typeof task.image_meta === 'object') {
    return {
      image_meta: task.image_meta as ImageMetadata,
      background_image_url: task.background_image_url
    };
  }

  // If only background_image_url exists, migrate it
  if (task.background_image_url) {
    const migratedMeta = migrateLegacyImageUrl(task.background_image_url);
    return {
      image_meta: migratedMeta,
      background_image_url: task.background_image_url
    };
  }

  // No image data
  return {
    image_meta: null,
    background_image_url: null
  };
}

/**
 * Helper to check if an entity needs image migration
 */
export function needsImageMigration(entity: any): boolean {
  return !!(entity.background_image_url && !entity.image_meta);
}

/**
 * Logs migration status for debugging
 */
export function logMigrationStatus(entityType: string, entities: any[]): void {
  const needsMigration = entities.filter(needsImageMigration);
  const hasMeta = entities.filter(e => e.image_meta);
  
  logger.debug(`[Image Migration] ${entityType} status:`, {
    total: entities.length,
    needsMigration: needsMigration.length,
    alreadyMigrated: hasMeta.length
  });
}
