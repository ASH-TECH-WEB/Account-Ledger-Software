const { supabase } = require('../../config/supabase');

class User {
  static async create(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByGoogleId(googleId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', googleId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async delete(id) {
    try {
      console.log(`🗑️ Attempting to delete user with ID: ${id}`);
      
      // First, let's try to delete related data manually to avoid RLS issues
      console.log('🧹 Cleaning up related data...');
      
      // Delete ledger entries
      const { error: ledgerError } = await supabase
        .from('ledger_entries')
        .delete()
        .eq('user_id', id);
      
      if (ledgerError) {
        console.log('⚠️ Warning: Could not delete ledger entries:', ledgerError.message);
      } else {
        console.log('✅ Ledger entries deleted');
      }
      
      // Delete parties
      const { error: partiesError } = await supabase
        .from('parties')
        .delete()
        .eq('user_id', id);
      
      if (partiesError) {
        console.log('⚠️ Warning: Could not delete parties:', partiesError.message);
      } else {
        console.log('✅ Parties deleted');
      }
      
      // Now delete the user
      console.log('👤 Deleting user...');
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting user:', error);
        throw error;
      }
      
      console.log('✅ User deleted successfully');
      return true;
    } catch (error) {
      console.error('💥 Delete user error:', error);
      throw error;
    }
  }

  // New method for Google authentication
  static async findOrCreateGoogleUser(googleData) {
    try {
      const { email, googleId, fullname, profilePicture } = googleData;

      // First try to find by Google ID
      let user = await this.findByGoogleId(googleId);
      
      if (user) {
        // Update existing Google user
        const updateData = {
          name: fullname || user.name,
          profile_picture: profilePicture || user.profile_picture,
          last_login: new Date().toISOString()
        };
        
        return await this.update(user.id, updateData);
      }

      // Try to find by email (for linking existing accounts)
      user = await this.findByEmail(email);
      
      if (user) {
        // Link existing email user with Google
        const updateData = {
          google_id: googleId,
          profile_picture: profilePicture,
          auth_provider: 'google',
          email_verified: true,
          last_login: new Date().toISOString()
        };
        
        return await this.update(user.id, updateData);
      }

      // Create new Google user
      const newUserData = {
        name: fullname,
        email: email.toLowerCase(),
        google_id: googleId,
        profile_picture: profilePicture,
        auth_provider: 'google',
        email_verified: true,
        phone: '', // Empty for Google users
        password_hash: '', // Empty for Google users
        last_login: new Date().toISOString()
      };

      return await this.create(newUserData);
    } catch (error) {
      throw error;
    }
  }

  // Method to check if user can use password authentication
  static async canUsePassword(userId) {
    try {
      const user = await this.findById(userId);
      return user && user.auth_provider === 'email' && user.password_hash;
    } catch (error) {
      return false;
    }
  }
}

module.exports = User;
