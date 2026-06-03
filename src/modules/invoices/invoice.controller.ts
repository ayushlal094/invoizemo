import type { Request, Response, NextFunction } from 'express';
import * as invoiceService from './invoice.service.js';
import type { ListInvoicesQuery } from './invoice.schema.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await invoiceService.listInvoices(req.user!.id, req.query as unknown as ListInvoicesQuery);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await invoiceService.createInvoice(req.user!.id, req.body);
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await invoiceService.getInvoice(req.user!.id, req.params.id as string);
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await invoiceService.updateInvoice(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invoice = await invoiceService.updateInvoiceStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status
    );
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await invoiceService.deleteInvoice(req.user!.id, req.params.id as string);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
