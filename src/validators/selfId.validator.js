import { body } from 'express-validator';

export const validateSelfId = [
  body('M').notEmpty().withMessage('M is required'),
  body('S').notEmpty().withMessage('S is required'),
  body('A').notEmpty().withMessage('A is required'),
  body('T').notEmpty().withMessage('T is required'),
  body('C').notEmpty().withMessage('C is required'),
];
