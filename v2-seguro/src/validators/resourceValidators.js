const { z } = require('zod');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createResourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(10000).optional().nullable(),
});

const updateResourceSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(10000).optional().nullable(),
});

const listResourcesQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
});

module.exports = {
  idParamSchema,
  createResourceSchema,
  updateResourceSchema,
  listResourcesQuerySchema,
};
