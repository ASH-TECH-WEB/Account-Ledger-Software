import Joi from 'joi';

export const validateUserSettings = (data) => {
  const schema = Joi.object({
    theme: Joi.string().valid('light', 'dark'),
    language: Joi.string().max(5),
    notificationSettings: Joi.object({
      email: Joi.boolean(),
      sms: Joi.boolean(),
      push: Joi.boolean()
    }),
    layoutPreferences: Joi.object({
      showSidebar: Joi.boolean(),
      compactMode: Joi.boolean()
    }),
    defaultPage: Joi.string()
  });

  return schema.validate(data);
};
