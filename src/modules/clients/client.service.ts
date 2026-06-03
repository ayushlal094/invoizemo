import { Types } from 'mongoose';
import { Client } from './client.model.js';
import { assertOwnership } from '../../utils/ownershipCheck.js';
import { AppError } from '../../utils/appError.js';
import type { CreateClientInput, UpdateClientInput, ListClientsQuery } from './client.schema.js';

function sanitizeClient(client: {
  _id: unknown;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: client._id,
    name: client.name,
    email: client.email,
    company: client.company,
    phone: client.phone,
    address: client.address,
    notes: client.notes,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

export async function listClients(userId: string, query: ListClientsQuery) {
  const filter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    isDeleted: false,
  };

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { company: { $regex: query.search, $options: 'i' } },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [clients, total] = await Promise.all([
    Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Client.countDocuments(filter),
  ]);

  return {
    data: clients.map(sanitizeClient),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}

export async function createClient(userId: string, input: CreateClientInput) {
  const client = await Client.create({
    userId: new Types.ObjectId(userId),
    name: input.name,
    email: input.email || undefined,
    company: input.company,
    phone: input.phone,
    address: input.address,
    notes: input.notes,
  });
  return sanitizeClient(client);
}

export async function getClient(userId: string, clientId: string) {
  const client = await assertOwnership(Client, clientId, userId);
  return sanitizeClient(client);
}

export async function updateClient(userId: string, clientId: string, input: UpdateClientInput) {
  const client = await assertOwnership(Client, clientId, userId);

  if (input.name !== undefined) client.name = input.name;
  if (input.email !== undefined) client.email = input.email || undefined;
  if (input.company !== undefined) client.company = input.company;
  if (input.phone !== undefined) client.phone = input.phone;
  if (input.address !== undefined) client.address = input.address;
  if (input.notes !== undefined) client.notes = input.notes;

  await client.save();
  return sanitizeClient(client);
}

export async function deleteClient(userId: string, clientId: string) {
  const client = await assertOwnership(Client, clientId, userId);
  client.isDeleted = true;
  await client.save();
  return { message: 'Client deleted' };
}

export async function assertClientOwnership(userId: string, clientId: string) {
  if (!Types.ObjectId.isValid(clientId)) {
    throw new AppError(404, 'NOT_FOUND', 'Client not found');
  }
  await assertOwnership(Client, clientId, userId);
}
