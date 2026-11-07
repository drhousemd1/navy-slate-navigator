import { reviewedRecordingContext, type RecordingData, type RecordingDefinition } from '@/data/recordings/readModel';
import type { PunishmentData } from '@/contexts/punishments/types';
import type { PunishmentExpectedContext } from '@/domain/actions/types';

export interface ReviewedPunishment {
  punishment: PunishmentData & RecordingDefinition;
  expectedContext: PunishmentExpectedContext;
  reviewKey: string;
}

/** Use the same definitions, participants, currencies and calendars as ordinary Punish. */
export function reviewRandomPunishments(data: RecordingData): ReviewedPunishment[] {
  return data.definitions.filter(definition => !definition.deleted_at).map(definition => {
    const punishment = definition as PunishmentData & RecordingDefinition;
    let expectedContext: ReturnType<typeof reviewedRecordingContext>;
    try { expectedContext = reviewedRecordingContext('punishment', definition, data.progress.find(item => item.subjectId === definition.id)); }
    catch { throw new Error('The current punishment details could not be verified. Refresh punishments before picking again.'); }
    if (expectedContext.kind !== 'punishment_apply') throw new Error('Refresh punishments before picking again.');
    // A preview also becomes stale when its displayed title, description or image changes.
    const reviewKey = JSON.stringify([punishment.id, punishment.title, punishment.description,
      punishment.background_image_url, punishment.background_opacity, punishment.focal_point_x, punishment.focal_point_y,
      punishment.icon_name, punishment.icon_color, punishment.title_color, punishment.subtext_color, punishment.highlight_effect,
      expectedContext]);
    return { punishment, expectedContext, reviewKey };
  }).sort((a, b) => a.punishment.id.localeCompare(b.punishment.id));
}
