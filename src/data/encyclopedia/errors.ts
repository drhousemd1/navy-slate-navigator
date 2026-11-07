export class EncyclopediaError extends Error {
  constructor(public code: string, public definite = false) { super(code); }
}
const messages: Record<string, string> = {
  EDITOR_REQUIRED: 'Editorial permission is no longer available. Your draft is still saved; ordinary library reading remains available.',
  AUTHENTICATION_REQUIRED: 'Sign in again to check this editorial request. Your saved draft has not been discarded.',
  ACCOUNT_UNAVAILABLE: 'This account cannot publish changes right now. Your draft has not been discarded.',
  ENTRY_REVISION_CONFLICT: 'This entry changed after your draft began. Review the latest version before saving your changes.',
  ENTRY_NOT_FOUND: 'This entry is no longer available. Your draft is still saved.',
  INVALID_INPUT: 'Some changes are not valid. Review the title, formatting, image and display settings.',
  COMMAND_ID_REUSED: 'This saved request could not be matched safely. Keep the draft and reload before continuing.',
  ENTRY_ID_REUSED: 'This entry identifier has already been used. Keep the draft and reload before continuing.',
  DEVICE_STORAGE_UNAVAILABLE: 'This draft could not be saved safely on this device. No new request was sent. Retry when storage is available, or choose a smaller image. The 5 MB image limit does not guarantee enough browser storage.',
  DEVICE_STORAGE_CHANGED: 'Another tab changed this editorial draft. Reload the saved draft before continuing.',
};
export const encyclopediaErrorText = (error: unknown) => error instanceof EncyclopediaError && messages[error.code]
  ? messages[error.code] : 'The result could not be confirmed. Your draft and exact request are kept. Retry to check the same request.';
