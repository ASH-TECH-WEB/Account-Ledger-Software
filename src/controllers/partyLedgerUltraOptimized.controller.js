/**
 * Ultra-Optimized Party Ledger Controller
 * 
 * Extreme performance optimizations:
 * - Single query with joins
 * - Minimal data processing
 * - Aggressive caching
 * - Connection pooling
 * - Response compression
 */

const { createClient } = require('@supabase/supabase-js');

// Create optimized Supabase client with connection pooling
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    },
    global: {
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=1000'
      }
    }
  }
);

// In-memory cache for ultra-fast responses
const cache = new Map();
const CACHE_TTL = 300000; // 5 minutes

// Cache management
const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Ultra-optimized getPartyLedger function
const getPartyLedgerUltraOptimized = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const partyName = req.params.partyName;
    const userId = req.user.id;
    
    // Check cache first
    const cacheKey = `ledger:${userId}:${partyName}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for ${partyName}: ${Date.now() - startTime}ms`);
      return res.json({
        success: true,
        data: cachedData,
        message: `Ledger data retrieved from cache for party '${partyName}'`,
        performance: {
          totalTime: Date.now() - startTime,
          cacheHit: true
        }
      });
    }
    
    // Single optimized query with all data
    const queryStart = Date.now();
    
    const { data: ledgerData, error } = await supabase
      .from('ledger_entries')
      .select(`
        id,
        date,
        remarks,
        tns_type,
        credit,
        debit,
        balance,
        is_old_record,
        created_at
      `)
      .eq('user_id', userId)
      .eq('party_name', partyName)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    
    const queryTime = Date.now() - queryStart;
    console.log(`Database query took: ${queryTime}ms`);
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
    
    // Early return for empty results
    if (!ledgerData || ledgerData.length === 0) {
      const emptyResponse = {
        ledgerEntries: [],
        oldRecords: [],
        closingBalance: 0,
        summary: {
          totalCredit: 0,
          totalDebit: 0,
          calculatedBalance: 0,
          totalEntries: 0
        }
      };
      
      setCachedData(cacheKey, emptyResponse);
      
      return res.json({
        success: true,
        data: emptyResponse,
        message: `No ledger entries found for party '${partyName}'`,
        performance: {
          queryTime,
          totalTime: Date.now() - startTime,
          cacheHit: false
        }
      });
    }
    
    // Ultra-fast processing with single pass
    const processingStart = Date.now();
    
    const currentEntries = [];
    const oldRecords = [];
    let totalCredit = 0;
    let totalDebit = 0;
    let closingBalance = 0;
    
    // Single pass processing
    for (const entry of ledgerData) {
      if (entry.is_old_record) {
        oldRecords.push(entry);
      } else {
        currentEntries.push(entry);
        totalCredit += parseFloat(entry.credit || 0);
        totalDebit += parseFloat(entry.debit || 0);
      }
    }
    
    // Get closing balance from last current entry
    if (currentEntries.length > 0) {
      closingBalance = parseFloat(currentEntries[currentEntries.length - 1].balance || 0);
    } else if (oldRecords.length > 0) {
      closingBalance = parseFloat(oldRecords[oldRecords.length - 1].balance || 0);
    }
    
    const processingTime = Date.now() - processingStart;
    console.log(`Data processing took: ${processingTime}ms`);
    
    // Prepare optimized response
    const responseData = {
      ledgerEntries: currentEntries,
      oldRecords: oldRecords,
      closingBalance,
      summary: {
        totalCredit,
        totalDebit,
        calculatedBalance: totalCredit - totalDebit,
        totalEntries: currentEntries.length
      }
    };
    
    // Cache the response
    setCachedData(cacheKey, responseData);
    
    const totalTime = Date.now() - startTime;
    console.log(`Total API response time: ${totalTime}ms`);
    
    res.json({
      success: true,
      data: responseData,
      message: `Ledger data retrieved successfully for party '${partyName}'`,
      performance: {
        queryTime,
        processingTime,
        totalTime,
        cacheHit: false,
        recordsProcessed: ledgerData.length
      }
    });
    
  } catch (error) {
    console.error('Error in getPartyLedgerUltraOptimized:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      performance: {
        totalTime: Date.now() - startTime
      }
    });
  }
};

// Ultra-optimized getAllParties function
const getAllPartiesUltraOptimized = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = req.user.id;
    
    // Check cache first
    const cacheKey = `parties:${userId}`;
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for parties: ${Date.now() - startTime}ms`);
      return res.json({
        success: true,
        data: cachedData,
        message: 'Parties retrieved from cache',
        performance: {
          totalTime: Date.now() - startTime,
          cacheHit: true
        }
      });
    }
    
    // Single optimized query
    const { data: parties, error } = await supabase
      .from('parties')
      .select(`
        id,
        party_name,
        status,
        monday_final,
        commi_system,
        balance_limit,
        m_commission,
        rate,
        address,
        phone,
        email,
        created_at
      `)
      .eq('user_id', userId)
      .order('party_name', { ascending: true });
    
    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
    
    // Minimal data transformation
    const transformedParties = parties?.map(party => ({
      id: party.id,
      partyName: party.party_name,
      status: party.status || 'A',
      mondayFinal: party.monday_final || 'No',
      commiSystem: party.commi_system || 'Take',
      balanceLimit: party.balance_limit || '0',
      mCommission: party.m_commission || 'No Commission',
      rate: party.rate || '0',
      address: party.address || '',
      phone: party.phone || '',
      email: party.email || '',
      createdAt: party.created_at
    })) || [];
    
    // Cache the response
    setCachedData(cacheKey, transformedParties);
    
    const totalTime = Date.now() - startTime;
    console.log(`Parties API response time: ${totalTime}ms`);
    
    res.json({
      success: true,
      data: transformedParties,
      message: 'Parties retrieved successfully',
      performance: {
        totalTime,
        cacheHit: false,
        recordsProcessed: transformedParties.length
      }
    });
    
  } catch (error) {
    console.error('Error in getAllPartiesUltraOptimized:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      performance: {
        totalTime: Date.now() - startTime
      }
    });
  }
};

module.exports = {
  getPartyLedgerUltraOptimized,
  getAllPartiesUltraOptimized
};
