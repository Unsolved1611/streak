import type { TKey } from '../i18n/translations';

/** Maps the machine-readable sync error codes to localised copy. */
export function syncErrorKey(code: string | null | undefined): TKey {
  switch (code) {
    case 'unauthorized':
      return 'error.unauthorized';
    case 'not-found':
      return 'error.notFound';
    case 'forbidden':
      return 'error.forbidden';
    case 'network':
      return 'error.network';
    case 'invalid-payload':
      return 'error.invalidPayload';
    case 'no-gist':
      return 'error.noGist';
    default:
      return 'error.sync';
  }
}
