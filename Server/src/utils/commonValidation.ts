import { z } from 'zod';

const isValidObjectId = (id: string) => {
  const hexRegExp = /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i;
  return hexRegExp.test(id);
};

export const commonValidations = {
  id: z.string().refine((id) => isValidObjectId(id), 'Is not a valid id'),
};
