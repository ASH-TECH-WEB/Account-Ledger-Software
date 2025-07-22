import SelfId from '../models/SelfId.model.js';

export const createSelfIdEntry = async (data) => {
  return await SelfId.create(data);
};

export const getSelfIdEntries = async () => {
  return await SelfId.find();
};
