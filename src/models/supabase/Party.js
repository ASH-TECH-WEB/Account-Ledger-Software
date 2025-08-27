const { supabase } = require('../../config/supabase');

class Party {
  static async create(partyData) {
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert([partyData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId, search = '') {
    try {
      let query = supabase
        .from('parties')
        .select('*')
        .eq('user_id', userId);

      if (search) {
        query = query.or(`party_name.ilike.%${search}%,sr_no.ilike.%${search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByPartyName(userId, partyName) {
    try {
      const { data, error } = await supabase
        .from('parties')
        .select('*')
        .eq('user_id', userId)
        .eq('party_name', partyName)
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
        .from('parties')
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
        .from('parties')
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
        .from('parties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async deleteMultiple(ids) {
    try {
      const { error } = await supabase
        .from('parties')
        .delete()
        .in('id', ids);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Party;
