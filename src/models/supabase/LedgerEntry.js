const { supabase } = require('../../config/supabase');

class LedgerEntry {
  static async create(entryData) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .insert([entryData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findByPartyName(userId, partyName, isOldRecord = null) {
    try {
      // Optimized query with specific columns only
      let query = supabase
        .from('ledger_entries')
        .select('id, date, remarks, tns_type, credit, debit, balance, party_name, is_old_record, created_at, ti')
        .eq('user_id', userId)
        .eq('party_name', partyName)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true }); // Add created_at ordering for proper chronological order
      
      // Only filter by is_old_record if explicitly specified
      if (isOldRecord !== null) {
        query = query.eq('is_old_record', isOldRecord);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
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
        .from('ledger_entries')
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
        .from('ledger_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  static async findBySettlementId(settlementId) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('settlement_monday_final_id', settlementId)
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all entries for a specific party and user
   */
  static async findByPartyAndUser(userId, partyName) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('party_name', partyName)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Find entries for a party after a specific date and time
   */
  static async findByPartyAndUserAfterDate(userId, partyName, date, createdAfter) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('party_name', partyName)
        .gte('date', date)
        .gt('created_at', createdAfter)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      return [];
    }
  }

  static async updateMultiple(entries) {
    try {
      const { data, error } = await supabase
        .from('ledger_entries')
        .upsert(entries, { onConflict: 'id' });

      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = LedgerEntry;
