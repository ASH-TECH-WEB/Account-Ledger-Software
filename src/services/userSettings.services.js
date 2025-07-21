import UserSettings from '../models/UserSettings.model.js';

export const getUserSettings = async (userId) => {
  return await UserSettings.findOne({ userId });
};

export const createOrUpdateUserSettings = async (userId, data) => {
  return await UserSettings.findOneAndUpdate(
    { userId },
    { $set: data },
    { upsert: true, new: true }
  );
};

export const deleteUserSettings = async (userId) => {
  return await UserSettings.findOneAndDelete({ userId });
};
