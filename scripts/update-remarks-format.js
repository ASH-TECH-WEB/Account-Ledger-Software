const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL ERROR: Missing required environment variables');
  console.error('Please ensure the following environment variables are set:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Update existing ledger entries to use Party Name(Remarks) format
 */
const updateRemarksFormat = async () => {
  try {
    // Get all ledger entries
    const { data: entries, error: fetchError } = await supabase
      .from('ledger_entries')
      .select('id, party_name, remarks, user_id')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch entries: ${fetchError.message}`);
    }

    if (!entries || entries.length === 0) {
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const entry of entries) {
      try {
        const { id, party_name, remarks, user_id } = entry;
        
        // Skip if already in correct format (contains parentheses)
        if (remarks && remarks.includes('(') && remarks.includes(')')) {
          skippedCount++;
          continue;
        }

        // Create new format: Party Name(Remarks)
        let newRemarks = '';
        
        if (party_name && remarks && remarks.trim()) {
          // Both party name and remarks: Party Name(Remarks)
          newRemarks = `${party_name}(${remarks.trim()})`;
        } else if (party_name) {
          // Only party name: Party Name
          newRemarks = party_name;
        } else if (remarks && remarks.trim()) {
          // Only remarks: Remarks
          newRemarks = remarks.trim();
        } else {
          // Neither: keep as is
          newRemarks = remarks || 'Transaction';
        }

        // Update the entry
        const { error: updateError } = await supabase
          .from('ledger_entries')
          .update({ 
            remarks: newRemarks,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error(`❌ Failed to update entry ${id}:`, updateError.message);
          continue;
        }

        updatedCount++;

        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (entryError) {
        console.error(`❌ Error processing entry ${entry.id}:`, entryError.message);
      }
    }

    : ${skippedCount} entries`);
    if (updatedCount > 0) {
      format');
    } else {
      }

  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }
};

// Run update if this file is executed directly
if (require.main === module) {
  updateRemarksFormat();
}

module.exports = { updateRemarksFormat };
