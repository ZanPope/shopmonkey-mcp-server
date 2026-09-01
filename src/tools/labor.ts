import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { shopmonkeyRequest, sanitizePathParam, getDefaultLocationId } from '../client.js';
import type { Labor, TimeclockEntry, User } from '../types/shopmonkey.js';
import type { ToolHandlerMap } from '../types/tools.js';

export const definitions: Tool[] = [
  {
    name: 'list_labor',
    description: 'List labor line items for a specific service on a work order. Shopmonkey nests labor under order > service, so both orderId and serviceId are required (use list_services with an orderId first to find the serviceId).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        orderId: { type: 'string', description: 'The work order ID the service belongs to' },
        serviceId: { type: 'string', description: 'The service ID to list labor line items for' },
      },
      required: ['orderId', 'serviceId'],
    },
  },
  {
    name: 'assign_technician',
    description: 'Assign a technician to a labor line item on a work order. Use list_services (with orderId) to find the serviceId, then list_labor (with orderId + serviceId) to find the laborId, then call this with the technician\'s user ID (from list_users).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        orderId: { type: 'string', description: 'The work order ID' },
        serviceId: { type: 'string', description: 'The service ID the labor line item belongs to' },
        laborId: { type: 'string', description: 'The labor line item ID to assign a technician to' },
        technicianId: { type: 'string', description: 'The technician/user ID to assign (from list_users)' },
      },
      required: ['orderId', 'serviceId', 'laborId', 'technicianId'],
    },
  },
  {
    name: 'list_timeclock',
    description: 'List technician time clock events. Track clock-in/clock-out for shop staff.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        userId: { type: 'string', description: 'Filter by user/technician ID' },
        locationId: { type: 'string', description: 'Filter by location ID. Defaults to SHOPMONKEY_LOCATION_ID env var if set.' },
        startDate: { type: 'string', description: 'Filter by start date (ISO 8601 format)' },
        endDate: { type: 'string', description: 'Filter by end date (ISO 8601 format)' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 25)' },
        skip: { type: 'number', description: 'Number of records to skip for pagination (default: 0)' },
      },
    },
  },
  {
    name: 'list_users',
    description: 'List shop users and technicians from Shopmonkey.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        locationId: { type: 'string', description: 'Filter by location ID. Defaults to SHOPMONKEY_LOCATION_ID env var if set.' },
        limit: { type: 'number', description: 'Maximum number of results to return (default: 25)' },
        skip: { type: 'number', description: 'Number of records to skip for pagination (default: 0)' },
      },
    },
  },
  {
    name: 'get_user',
    description: 'Get detailed information about a single shop user or technician by their ID.',
    inputSchema: { type: 'object' as const, properties: { id: { type: 'string', description: 'The user/technician ID' } }, required: ['id'] },
  },
];

function applyDefaultLocation(params: Record<string, string>): void {
  if (!params.locationId) {
    const defaultId = getDefaultLocationId();
    if (defaultId) params.locationId = defaultId;
  }
}

export const handlers: ToolHandlerMap = {
  async list_labor(args) {
    if (!args.orderId) return { content: [{ type: 'text', text: 'Error: orderId is required' }], isError: true };
    if (!args.serviceId) return { content: [{ type: 'text', text: 'Error: serviceId is required' }], isError: true };

    const data = await shopmonkeyRequest<Labor[]>(
      'GET',
      `/order/${sanitizePathParam(String(args.orderId))}/service/${sanitizePathParam(String(args.serviceId))}/labor`
    );
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },

  async assign_technician(args) {
    if (!args.orderId) return { content: [{ type: 'text', text: 'Error: orderId is required' }], isError: true };
    if (!args.serviceId) return { content: [{ type: 'text', text: 'Error: serviceId is required' }], isError: true };
    if (!args.laborId) return { content: [{ type: 'text', text: 'Error: laborId is required' }], isError: true };
    if (!args.technicianId) return { content: [{ type: 'text', text: 'Error: technicianId is required' }], isError: true };

    const data = await shopmonkeyRequest<Labor>(
      'PUT',
      `/order/${sanitizePathParam(String(args.orderId))}/service/${sanitizePathParam(String(args.serviceId))}/labor/${sanitizePathParam(String(args.laborId))}`,
      { technicianId: args.technicianId }
    );
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },

  async list_timeclock(args) {
    const params: Record<string, string> = {};
    if (args.userId !== undefined) params.userId = String(args.userId);
    if (args.locationId !== undefined) params.locationId = String(args.locationId);
    if (args.startDate !== undefined) params.startDate = String(args.startDate);
    if (args.endDate !== undefined) params.endDate = String(args.endDate);
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.skip !== undefined) params.skip = String(args.skip);
    applyDefaultLocation(params);

    const data = await shopmonkeyRequest<TimeclockEntry[]>('GET', '/timeclock', undefined, params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },

  async list_users(args) {
    const params: Record<string, string> = {};
    if (args.locationId !== undefined) params.locationId = String(args.locationId);
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.skip !== undefined) params.skip = String(args.skip);
    applyDefaultLocation(params);

    const data = await shopmonkeyRequest<User[]>('GET', '/user', undefined, params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },

  async get_user(args) {
    if (!args.id) return { content: [{ type: 'text', text: 'Error: id is required' }], isError: true };
    const data = await shopmonkeyRequest<User>('GET', `/user/${sanitizePathParam(String(args.id))}`);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  },
};
