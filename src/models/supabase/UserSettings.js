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
        
        // Auto-create Commission party for new users
        try {
          const Party = require('./Party');
          
          // Check if Commission party already exists
          const existingParties = await Party.findByUserId(userId);
          const commissionPartyExists = existingParties?.some(party => 
            party.party_name === 'Commission'
          );
          
          if (!commissionPartyExists) {
            // Create Commission party
            const commissionPartyData = {
              user_id: userId,
              party_name: 'Commission',
              sr_no: `COMM_${Date.now()}`,
              status: 'A', // Active
              commi_system: 'Give', // Commission system
              balance_limit: '0',
              m_commission: 'With Commission',
              rate: '0', // No rate for Commission party itself
              monday_final: 'No',
              address: '',
              phone: '',
              email: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            const newCommissionParty = await Party.create(commissionPartyData);
            console.log(`✅ Commission party created for new user: ${userId} (ID: ${newCommissionParty.id})`);
          } else {
            console.log(`ℹ️ Commission party already exists for user: ${userId}`);
          }
        } catch (partyError) {
          console.error('❌ Error creating Commission party for new user:', partyError);
          // Don't fail the settings creation if party creation fails
        }
      }
      
      return settings;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserSettings;
