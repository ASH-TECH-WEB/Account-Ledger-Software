const { supabase } = require('../../config/supabase');

class UserSettings {
  // Find settings by user ID
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Create new settings
  static async create(settingsData) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert([settingsData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Update existing settings
  static async update(userId, updateData) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Upsert settings (create if not exists, update if exists)
  static async upsert(userId, settingsData) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .upsert([{ user_id: userId, ...settingsData }], {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Delete settings
  static async delete(userId) {
    try {
      const { error } = await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Find or create settings
  static async findOrCreate(userId, defaultData = {}) {
    try {
      let settings = await this.findByUserId(userId);
      
      if (!settings) {
        // Create default settings
        const defaultSettings = {
          user_id: userId,
          company_account: 'AQC',
          company_name: 'AQC',
          email: defaultData.email || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...defaultData
        };
        
        settings = await this.create(defaultSettings);
      }
      
      return settings;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserSettings;
