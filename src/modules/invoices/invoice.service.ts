import { Types } from 'mongoose';
import {
  Invoice,
  VALID_STATUS_TRANSITIONS,
  normalizeLineItems,
  computeInvoiceTotals,
  type InvoiceStatus,
} from './invoice.model.js';
import { assertOwnership } from '../../utils/ownershipCheck.js';
import { assertClientOwnership } from '../clients/client.service.js';
import { AppError } from '../../utils/appError.js';
import type { CreateInvoiceInput, UpdateInvoiceInput, ListInvoicesQuery } from './invoice.schema.js';

async function generateInvoiceNumber(userId: string): Promise<string> {
  const count = await Invoice.countDocuments({ userId: new Types.ObjectId(userId) });
  return `INV-${String(count + 1).padStart(4, '0')}`;
}

function sanitizeInvoice(invoice: InstanceType<typeof Invoice>) {
  const populatedClient =
    typeof invoice.clientId === 'object' &&
    invoice.clientId !== null &&
    'name' in invoice.clientId
      ? invoice.clientId
      : undefined;

  return {
    _id: invoice._id,
    clientId: populatedClient ?? invoice.clientId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    lineItems: invoice.lineItems,
    taxRate: invoice.taxRate,
    subtotalCents: invoice.subtotalCents,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    currency: invoice.currency,
    notes: invoice.notes,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

export async function listInvoices(userId: string, query: ListInvoicesQuery) {
  const filter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    isDeleted: false,
  };

  if (query.status) filter.status = query.status;
  if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);

  const skip = (query.page - 1) * query.limit;
  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate('clientId', 'name email company')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Invoice.countDocuments(filter),
  ]);

  return {
    data: invoices.map(sanitizeInvoice),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    },
  };
}

export async function createInvoice(userId: string, input: CreateInvoiceInput) {
  await assertClientOwnership(userId, input.clientId);

  const lineItems = normalizeLineItems(input.lineItems);
  const taxRate = input.taxRate ?? 0;
  const totals = computeInvoiceTotals(lineItems, taxRate);
  const invoiceNumber = await generateInvoiceNumber(userId);

  const invoice = await Invoice.create({
    userId: new Types.ObjectId(userId),
    clientId: new Types.ObjectId(input.clientId),
    invoiceNumber,
    status: 'draft',
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    lineItems,
    taxRate,
    ...totals,
    currency: input.currency ?? 'USD',
    notes: input.notes,
  });

  await invoice.populate('clientId', 'name email company');
  return sanitizeInvoice(invoice);
}

export async function getInvoice(userId: string, invoiceId: string) {
  const invoice = await assertOwnership(Invoice, invoiceId, userId);
  await invoice.populate('clientId', 'name email company phone address');
  return sanitizeInvoice(invoice);
}

export async function updateInvoice(userId: string, invoiceId: string, input: UpdateInvoiceInput) {
  const invoice = await assertOwnership(Invoice, invoiceId, userId);

  if (invoice.status !== 'draft') {
    throw new AppError(400, 'INVALID_REQUEST', 'Only draft invoices can be edited');
  }

  if (input.clientId) {
    await assertClientOwnership(userId, input.clientId);
    invoice.clientId = new Types.ObjectId(input.clientId);
  }

  if (input.issueDate) invoice.issueDate = input.issueDate;
  if (input.dueDate) invoice.dueDate = input.dueDate;
  if (input.notes !== undefined) invoice.notes = input.notes;
  if (input.currency) invoice.currency = input.currency;

  if (input.lineItems) {
    invoice.lineItems = normalizeLineItems(input.lineItems);
  }

  if (input.taxRate !== undefined) {
    invoice.taxRate = input.taxRate;
  }

  const totals = computeInvoiceTotals(invoice.lineItems, invoice.taxRate);
  invoice.subtotalCents = totals.subtotalCents;
  invoice.taxCents = totals.taxCents;
  invoice.totalCents = totals.totalCents;

  await invoice.save();
  await invoice.populate('clientId', 'name email company');
  return sanitizeInvoice(invoice);
}

export async function updateInvoiceStatus(
  userId: string,
  invoiceId: string,
  status: InvoiceStatus
) {
  const invoice = await assertOwnership(Invoice, invoiceId, userId);
  const allowed = VALID_STATUS_TRANSITIONS[invoice.status];

  if (!allowed.includes(status)) {
    throw new AppError(
      400,
      'INVALID_REQUEST',
      `Cannot transition from ${invoice.status} to ${status}`
    );
  }

  invoice.status = status;
  await invoice.save();
  await invoice.populate('clientId', 'name email company');
  return sanitizeInvoice(invoice);
}

export async function deleteInvoice(userId: string, invoiceId: string) {
  const invoice = await assertOwnership(Invoice, invoiceId, userId);

  if (!['draft', 'cancelled'].includes(invoice.status)) {
    throw new AppError(400, 'INVALID_REQUEST', 'Only draft or cancelled invoices can be deleted');
  }

  invoice.isDeleted = true;
  await invoice.save();
  return { message: 'Invoice deleted' };
}
