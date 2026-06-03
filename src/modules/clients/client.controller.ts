import type { Request, Response, NextFunction } from 'express';
import * as clientService from './client.service.js';
import type { ListClientsQuery } from './client.schema.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await clientService.listClients(req.user!.id, req.query as unknown as ListClientsQuery);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await clientService.createClient(req.user!.id, req.body);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await clientService.getClient(req.user!.id, req.params.id as string);
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const client = await clientService.updateClient(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await clientService.deleteClient(req.user!.id, req.params.id as string);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
