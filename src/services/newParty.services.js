import { NewParty } from '../models/NewParty.model.js';

export const addParty = async (data) => {
  const newParty = new NewParty(data);
  return await newParty.save();
};

export const fetchParties = async () => {
  return await NewParty.find();
};