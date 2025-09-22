import { DefaultUrlSerializer, UrlTree } from '@angular/router';

const TRAILING_SLASH_EXCLUSION = /\.[^/]+$/;

/**
 * Ensures router-generated URLs consistently include a trailing slash for directory-like routes.
 */
export class TrailingSlashUrlSerializer extends DefaultUrlSerializer {
  override serialize(tree: UrlTree): string {
    const serialized = super.serialize(tree);
    if (!serialized) {
      return serialized;
    }

    const [withoutFragment, fragment] = serialized.split('#', 2);
    const [path, query] = withoutFragment.split('?', 2);

    if (!path || path === '/' || path.endsWith('/') || TRAILING_SLASH_EXCLUSION.test(path)) {
      return serialized;
    }

    const rebuiltPath = `${path}/`;
    const rebuiltQuery = query ? `?${query}` : '';
    const rebuiltFragment = fragment ? `#${fragment}` : '';

    return `${rebuiltPath}${rebuiltQuery}${rebuiltFragment}`;
  }
}
