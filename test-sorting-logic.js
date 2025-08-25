const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSortingLogic() {
  try {
    console.log('🔍 Testing Sorting Logic...\n');

    // 1. Check if there are any ledger entries
    const { count: totalEntries, error: countError } = await supabase
      .from('ledger_entries')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;
    console.log(`📊 Total ledger entries: ${totalEntries}`);

    if (totalEntries === 0) {
      console.log('✅ No entries to test - database is clean');
      return;
    }

    // 2. Get all entries for a specific party (if exists)
    const { data: allEntries, error: entriesError } = await supabase
      .from('ledger_entries')
      .select('*')
      .limit(10)
      .order('created_at', { ascending: true });

    if (entriesError) throw entriesError;

    if (allEntries.length > 0) {
      const partyName = allEntries[0].party_name;
      console.log(`🔍 Testing sorting for party: ${partyName}`);

      // 3. Get entries for this specific party
      const { data: partyEntries, error: partyError } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('party_name', partyName)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

      if (partyError) throw partyError;

      console.log(`📊 Found ${partyEntries.length} entries for party: ${partyName}`);

      // 4. Test the sorting logic
      const sortEntriesByOriginalOrder = (entries) => {
        return entries.sort((a, b) => {
          // First sort by date
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA - dateB; // Oldest date first
          }
          
          // If same date, sort by creation time (original order)
          // Handle both timestamp and time string formats
          let timeA = 0;
          let timeB = 0;
          
          if (a.created_at) {
            // If created_at is a full timestamp (e.g., "2025-08-19T06:17:16.389+00:00")
            if (a.created_at.includes('T')) {
              timeA = new Date(a.created_at).getTime();
            } else {
              // If created_at is just time (e.g., "06:17:16")
              timeA = new Date('1970-01-01T' + a.created_at).getTime();
            }
          }
          
          if (b.created_at) {
            // If created_at is a full timestamp (e.g., "2025-08-19T06:17:16.389+00:00")
            if (b.created_at.includes('T')) {
              timeB = new Date(b.created_at).getTime();
            } else {
              // If created_at is just time (e.g., "06:17:16")
              timeB = new Date('1970-01-01T' + b.created_at).getTime();
            }
          }
          
          return timeA - timeB; // Earlier creation time first (original order)
        });
      };

      // 5. Separate current and old records
      const currentEntries = partyEntries.filter(entry => !entry.is_old_record);
      const oldRecords = partyEntries.filter(entry => entry.is_old_record);

      console.log(`📊 Current entries: ${currentEntries.length}, Old records: ${oldRecords.length}`);

      // 6. Test sorting
      const sortedCurrentEntries = sortEntriesByOriginalOrder([...currentEntries]);
      const sortedOldRecords = sortEntriesByOriginalOrder([...oldRecords]);

      // 7. Display results
      if (sortedOldRecords.length > 0) {
        console.log('\n📋 Old Records in Sorted Order (Old to New):');
        sortedOldRecords.forEach((entry, index) => {
          const createdTime = entry.created_at;
          let timeDisplay = 'N/A';
          let sortValue = 0;
          
          if (createdTime) {
            if (createdTime.includes('T')) {
              // Full timestamp
              const timestamp = new Date(createdTime);
              timeDisplay = timestamp.toLocaleTimeString();
              sortValue = timestamp.getTime();
            } else {
              // Just time
              timeDisplay = createdTime;
              sortValue = new Date('1970-01-01T' + createdTime).getTime();
            }
          }
          
          console.log(`  ${index + 1}. Date: ${entry.date}, Time: ${timeDisplay}, Sort Value: ${sortValue}`);
          console.log(`     Type: ${entry.tns_type}, Amount: ${entry.credit || entry.debit}, Remarks: ${entry.remarks}`);
          console.log(`     Is Old Record: ${entry.is_old_record}, Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
          console.log('');
        });
      }

      if (sortedCurrentEntries.length > 0) {
        console.log('\n📋 Current Entries in Sorted Order (Old to New):');
        sortedCurrentEntries.forEach((entry, index) => {
          const createdTime = entry.created_at;
          let timeDisplay = 'N/A';
          let sortValue = 0;
          
          if (createdTime) {
            if (createdTime.includes('T')) {
              // Full timestamp
              const timestamp = new Date(createdTime);
              timeDisplay = timestamp.toLocaleTimeString();
              sortValue = timestamp.getTime();
            } else {
              // Just time
              timeDisplay = createdTime;
              sortValue = new Date('1970-01-01T' + createdTime).getTime();
            }
          }
          
          console.log(`  ${index + 1}. Date: ${entry.date}, Time: ${timeDisplay}, Sort Value: ${sortValue}`);
          console.log(`     Type: ${entry.tns_type}, Amount: ${entry.credit || entry.debit}, Remarks: ${entry.remarks}`);
          console.log(`     Is Old Record: ${entry.is_old_record}, Settlement ID: ${entry.settlement_monday_final_id || 'None'}`);
          console.log('');
        });
      }

      // 8. Verify sorting order
      console.log('🔍 Sorting Verification:');
      if (sortedOldRecords.length > 1) {
        const firstEntry = sortedOldRecords[0];
        const lastEntry = sortedOldRecords[sortedOldRecords.length - 1];
        
        const firstTime = firstEntry.created_at ? new Date(firstEntry.created_at).getTime() : 0;
        const lastTime = lastEntry.created_at ? new Date(lastEntry.created_at).getTime() : 0;
        
        console.log(`   First entry time: ${firstTime} (${firstEntry.created_at})`);
        console.log(`   Last entry time: ${lastTime} (${lastEntry.created_at})`);
        console.log(`   Sorting correct: ${firstTime <= lastTime ? '✅' : '❌'}`);
      }
    }

    console.log('\n✅ Sorting test completed!');

  } catch (error) {
    console.error('❌ Error testing sorting:', error);
  }
}

testSortingLogic();
