import {
    getUserSettings,
    createOrUpdateUserSettings,
    deleteUserSettings
  } from '../services/userSettings.service.js';
  
  import { validateUserSettings } from '../validators/userSettings.validator.js';
  
  export const getSettings = async (req, res, next) => {
    try {
      const settings = await getUserSettings(req.params.userId);
      if (!settings) return res.status(404).json({ message: 'Settings not found' });
      res.json(settings);
    } catch (err) {
      next(err);
    }
  };
  
  export const updateSettings = async (req, res, next) => {
    try {
      const { error } = validateUserSettings(req.body);
      if (error) return res.status(400).json({ message: error.details[0].message });
  
      const updatedSettings = await createOrUpdateUserSettings(req.params.userId, req.body);
      res.json(updatedSettings);
    } catch (err) {
      next(err);
    }
  };
  
  export const deleteSettings = async (req, res, next) => {
    try {
      const result = await deleteUserSettings(req.params.userId);
      if (!result) return res.status(404).json({ message: 'Settings not found' });
      res.json({ message: 'Settings deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
  