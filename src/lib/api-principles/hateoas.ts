import { HateoasLink, HateoasResource } from './types';

/**
 * HATEOAS (Hypermedia as the Engine of Application State)
 * Attaches navigational and action state transitions (_links) directly to resource payloads.
 */
export function attachHateoasLinks<T extends object>(
  data: T,
  links: Record<string, HateoasLink>
): HateoasResource<T> {
  return {
    ...data,
    _links: links,
  };
}

export const HateoasLinkBuilders = {
  /**
   * Generates state-aware HATEOAS links for POS Restaurant Orders
   */
  forOrder(options: {
    baseUrl?: string;
    storeSlug: string;
    orderId: string;
    status: string;
  }): Record<string, HateoasLink> {
    const base = options.baseUrl ? options.baseUrl.replace(/\/+$/, '') : '';
    const orderPath = `${base}/api/r/${options.storeSlug}/orders/${options.orderId}`;
    const collectionPath = `${base}/api/r/${options.storeSlug}/orders`;

    const links: Record<string, HateoasLink> = {
      self: { href: orderPath, method: 'GET', description: 'Retrieve order details' },
      collection: { href: collectionPath, method: 'GET', description: 'List all orders' },
      update: { href: orderPath, method: 'PATCH', description: 'Update order status or items' },
    };

    if (options.status === 'PENDING') {
      links.pay = {
        href: `${orderPath}/pay`,
        method: 'POST',
        description: 'Submit payment for this order',
      };
    }

    if (options.status === 'PAID') {
      links.receipt = {
        href: `${base}/r/${options.storeSlug}/receipt/${options.orderId}`,
        method: 'GET',
        description: 'View digital e-receipt',
      };
    }

    return links;
  },

  /**
   * Generates HATEOAS links for Menu Items
   */
  forMenuItem(options: {
    baseUrl?: string;
    storeSlug: string;
    menuItemId: string;
  }): Record<string, HateoasLink> {
    const base = options.baseUrl ? options.baseUrl.replace(/\/+$/, '') : '';
    const itemPath = `${base}/api/r/${options.storeSlug}/menu/${options.menuItemId}`;

    return {
      self: { href: itemPath, method: 'GET', description: 'Retrieve dish details' },
      update: { href: itemPath, method: 'PATCH', description: 'Update dish pricing or availability' },
      delete: { href: itemPath, method: 'DELETE', description: 'Remove dish from menu' },
      menu: { href: `${base}/api/r/${options.storeSlug}/menu`, method: 'GET', description: 'Full menu collection' },
    };
  },
};
