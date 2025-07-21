import mongoose from 'mongoose';

const userSettingsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  language: { type: String, default: 'en' },
  notificationSettings: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: true }
  },
  layoutPreferences: {
    showSidebar: { type: Boolean, default: true },
    compactMode: { type: Boolean, default: false }
  },
  defaultPage: { type: String, default: 'dashboard' }
}, { timestamps: true });

const UserSettings = mongoose.model('UserSettings', userSettingsSchema);
export default UserSettings;
