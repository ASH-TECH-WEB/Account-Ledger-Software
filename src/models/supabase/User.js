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
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
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

      // User not found - return null instead of creating new user
      // This prevents unregistered users from automatically logging in
      return null;
    } catch (error) {
      throw error;
    }
  }

  // Method to check if user can use password authentication
  static async canUsePassword(userId) {
    try {
      const user = await this.findById(userId);
      return user && (user.auth_provider === 'email' || user.auth_provider === 'both') && user.password_hash;
    } catch (error) {
      return false;
    }
  }
}

module.exports = User;
