import Joi from 'joi';

export const newPartySchema = Joi.object({
  SrNo: Joi.number().required(),
  partyName: Joi.string().required(),
  status: Joi.string().valid('active', 'inactive').required(),
  comiSuite: Joi.string().required(),
  balanceLimit: Joi.number().required(),
});