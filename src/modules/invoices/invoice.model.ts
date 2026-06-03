import { Schema, model, type Document, type Types } from 'mongoose';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface ILineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  amountCents: number;
}

export interface IInvoice extends Document {
  userId: Types.ObjectId;
  clientId: Types.ObjectId;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  lineItems: ILineItem[];
  taxRate: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  notes?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<ILineItem>(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.01 },
    unitPriceCents: { type: Number, required: true, min: 0 },
    amountCents: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const invoiceSchema = new Schema<IInvoice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    invoiceNumber: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    lineItems: { type: [lineItemSchema], default: [] },
    taxRate: { type: Number, default: 0, min: 0, max: 1 },
    subtotalCents: { type: Number, default: 0 },
    taxCents: { type: Number, default: 0 },
    totalCents: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

invoiceSchema.index({ userId: 1, isDeleted: 1 });
invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ userId: 1, clientId: 1 });
invoiceSchema.index({ userId: 1, status: 1 });

export const Invoice = model<IInvoice>('Invoice', invoiceSchema);

export const VALID_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['paid', 'overdue', 'cancelled'],
  paid: [],
  overdue: ['paid', 'cancelled'],
  cancelled: [],
};

export function computeLineItemAmount(quantity: number, unitPriceCents: number): number {
  return Math.round(quantity * unitPriceCents);
}

export function computeInvoiceTotals(
  lineItems: ILineItem[],
  taxRate: number
): { subtotalCents: number; taxCents: number; totalCents: number } {
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;
  return { subtotalCents, taxCents, totalCents };
}

export function normalizeLineItems(
  items: Array<{ description: string; quantity: number; unitPriceCents: number }>
): ILineItem[] {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    amountCents: computeLineItemAmount(item.quantity, item.unitPriceCents),
  }));
}
