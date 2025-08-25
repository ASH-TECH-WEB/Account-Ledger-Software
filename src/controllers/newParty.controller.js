const Party = require('../models/supabase/Party');

// Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

// Get next SR number
const getNextSrNo = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🔍 Getting next SR number for user: ${userId}`);

    // Find the highest SR number for THIS SPECIFIC USER only
    const parties = await Party.findByUserId(userId);
    console.log(`📊 Found ${parties?.length || 0} parties for user`);
    
    let nextSrNo = '001';
    
    if (parties && parties.length > 0) {
      console.log(`📝 Parties found:`, parties.map(p => ({ id: p.id, sr_no: p.sr_no, party_name: p.party_name })));
      
      // Filter parties for this user and sort by sr_no
      const userParties = parties.filter(party => party.user_id === userId);
      console.log(`👤 User-specific parties: ${userParties.length}`);
      
      if (userParties.length > 0) {
        // Sort by sr_no and get the highest for this user
        const sortedParties = userParties.sort((a, b) => {
          const aNum = parseInt(a.sr_no || '0');
          const bNum = parseInt(b.sr_no || '0');
          console.log(`🔢 Comparing: ${a.sr_no} (${aNum}) vs ${b.sr_no} (${bNum})`);
          return bNum - aNum;
        });
        
        const lastParty = sortedParties[0];
        console.log(`🏆 Last party:`, lastParty);
        
        if (lastParty && lastParty.sr_no) {
          const lastNumber = parseInt(lastParty.sr_no);
          nextSrNo = String(lastNumber + 1).padStart(3, '0');
          console.log(`📈 Last number: ${lastNumber}, Next: ${nextSrNo}`);
        }
      }
    }

    console.log(`🎯 User ${userId}: Final Next SR Number = ${nextSrNo}`);

    res.json({
      success: true,
      message: 'Next SR number retrieved successfully',
      data: { nextSrNo }
    });
  } catch (error) {
    console.error('❌ Error getting next SR number:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get next SR number',
      error: error.message
    });
  }
};

// Get all parties for user
const getAllParties = async (req, res) => {
  try {
    const userId = req.user.id;
    const { search, status, page = 1, limit = 50 } = req.query;

    // Get parties for user
    let parties = await Party.findByUserId(userId);
    
    // Apply search filter if provided
    if (search) {
      const sanitizedSearch = sanitizeInput(search);
      parties = parties.filter(party => 
        party.party_name?.toLowerCase().includes(sanitizedSearch.toLowerCase()) ||
        party.sr_no?.toLowerCase().includes(sanitizedSearch.toLowerCase())
      );
    }

    // Apply status filter if provided
    if (status) {
      parties = parties.filter(party => party.status === status);
    }

    // Calculate pagination
    const total = parties.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedParties = parties.slice(skip, skip + parseInt(limit));

    // Transform data for frontend compatibility with complete business fields
    const transformedParties = paginatedParties.map(party => ({
      id: party.id,
      name: party.party_name, // Frontend expects 'name'
      party_name: party.party_name, // Keep original for compatibility
      sr_no: party.sr_no,
      address: party.address,
      phone: party.phone,
      email: party.email,
      companyName: party.company_name || party.party_name,
      status: party.status || 'A',
      mondayFinal: party.monday_final || 'No', // Frontend expects 'mondayFinal'
      commiSystem: party.commi_system || 'Take',
      balanceLimit: party.balance_limit || '0',
      mCommission: party.m_commission || 'No Commission',
      rate: party.rate || '0',
      // Commission structure
      selfLD: party.self_ld || { M: '', S: '', A: '', T: '', C: '' },
      agentLD: party.agent_ld || { name: '', M: '', S: '', A: '', T: '', C: '' },
      thirdPartyLD: party.third_party_ld || { name: '', M: '', S: '', A: '', T: '', C: '' },
      selfCommission: party.self_commission || { M: '', S: '' },
      agentCommission: party.agent_commission || { M: '', S: '' },
      thirdPartyCommission: party.third_party_commission || { M: '', S: '' },
      created_at: party.created_at,
      updated_at: party.updated_at
    }));

    res.json({
      success: true,
      message: 'Parties retrieved successfully',
      data: transformedParties,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting parties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get parties'
    });
  }
};

// Get party by ID
const getPartyById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const party = await Party.findById(id);
    if (!party || party.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Transform party for frontend compatibility
    const transformedParty = {
      id: party.id,
      name: party.party_name, // Frontend expects 'name'
      party_name: party.party_name, // Keep original for compatibility
      sr_no: party.sr_no,
      address: party.address,
      phone: party.phone,
      email: party.email,
      status: party.status || 'A',
      mondayFinal: party.monday_final || 'No', // Frontend expects 'mondayFinal'
      commiSystem: party.commi_system || 'Take',
      balanceLimit: party.balance_limit || '0',
      mCommission: party.m_commission || 'No Commission',
      rate: party.rate || '0',
      created_at: party.created_at,
      updated_at: party.updated_at
    };

    res.json({
      success: true,
      message: 'Party retrieved successfully',
      data: transformedParty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get party'
    });
  }
};

// Create new party
const createParty = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Log incoming data for debugging
    // Prepare party data with defaults
    const partyData = {
      ...req.body,
      userId,
      // Set default values for required fields
      commiSystem: req.body.commiSystem || 'Take',
      status: req.body.status || 'A',
      mCommission: req.body.mCommission || 'No Commission',
      balanceLimit: req.body.balanceLimit || '0',
      rate: req.body.rate || '0',
      // Initialize nested objects if not provided
      selfLD: req.body.selfLD || { M: '', S: '', A: '', T: '', C: '' },
      agentLD: req.body.agentLD || { name: '', M: '', S: '', A: '', T: '', C: '' },
      thirdPartyLD: req.body.thirdPartyLD || { name: '', M: '', S: '', A: '', T: '', C: '' },
      selfCommission: req.body.selfCommission || { M: '', S: '' },
      agentCommission: req.body.agentCommission || { M: '', S: '' },
      thirdPartyCommission: req.body.thirdPartyCommission || { M: '', S: '' }
    };

    // Validate required fields
    if (!partyData.partyName) {
      return res.status(400).json({
        success: false,
        message: 'Party name is required'
      });
    }

    if (!partyData.srNo) {
      return res.status(400).json({
        success: false,
        message: 'SR number is required'
      });
    }

    // Check if party name already exists for THIS USER ONLY
    const existingParties = await Party.findByUserId(userId);
    const existingParty = existingParties.find(p => 
      p.party_name === partyData.partyName && p.user_id === userId
    );

    if (existingParty) {
      return res.status(400).json({
        success: false,
        message: 'Party with this name already exists for your account'
      });
    }

    // Check if SR number already exists for THIS USER ONLY
    const existingSrNo = existingParties.find(p => 
      p.sr_no === partyData.srNo && p.user_id === userId
    );

    if (existingSrNo) {
      return res.status(400).json({
        success: false,
        message: 'SR number already exists for your account'
      });
    }

    // Transform data for Supabase with complete business fields
    const supabaseData = {
      user_id: userId,
      party_name: partyData.partyName,
      sr_no: partyData.srNo,
      address: partyData.address || '',
      phone: partyData.phone || '',
      email: partyData.email || '',
      company_name: partyData.companyName || partyData.partyName, // Company name
      status: partyData.status || 'A',
      commi_system: partyData.commiSystem || 'Take',
      balance_limit: partyData.balanceLimit || '0',
      m_commission: partyData.mCommission || 'No Commission',
      rate: partyData.rate || '0',
      monday_final: partyData.mondayFinal || 'No',
      // Commission structure
      self_ld: partyData.selfLD || { M: '', S: '', A: '', T: '', C: '' },
      agent_ld: partyData.agentLD || { name: '', M: '', S: '', A: '', T: '', C: '' },
      third_party_ld: partyData.thirdPartyLD || { name: '', M: '', S: '', A: '', T: '', C: '' },
      self_commission: partyData.selfCommission || { M: '', S: '' },
      agent_commission: partyData.agentCommission || { M: '', S: '' },
      third_party_commission: partyData.thirdPartyCommission || { M: '', S: '' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const party = await Party.create(supabaseData);

    // Transform created party for frontend compatibility
    const transformedParty = {
      id: party.id,
      name: party.party_name, // Frontend expects 'name'
      party_name: party.party_name, // Keep original for compatibility
      sr_no: party.sr_no,
      address: party.address,
      phone: party.phone,
      email: party.email,
      status: party.status || 'A',
      mondayFinal: party.monday_final || 'No', // Frontend expects 'mondayFinal'
      commiSystem: party.commi_system || 'Take',
      balanceLimit: party.balance_limit || '0',
      mCommission: party.m_commission || 'No Commission',
      rate: party.rate || '0',
      created_at: party.created_at,
      updated_at: party.updated_at
    };

    res.status(201).json({
      success: true,
      message: 'Party created successfully',
      data: transformedParty
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create party'
    });
  }
};

// Update party
const updateParty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    // Check if party exists and belongs to user
    const existingParty = await Party.findById(id);
    if (!existingParty || existingParty.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    // Check if party name is being changed and if it conflicts for THIS USER ONLY
    if (updateData.partyName && updateData.partyName !== existingParty.party_name) {
      const allParties = await Party.findByUserId(userId);
      const nameConflict = allParties.find(p => 
        p.party_name === updateData.partyName && 
        p.id !== id && 
        p.user_id === userId
      );

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: 'Party with this name already exists for your account'
        });
      }
    }

    // Check if SR number is being changed and if it conflicts for THIS USER ONLY
    if (updateData.srNo && updateData.srNo !== existingParty.sr_no) {
      const allParties = await Party.findByUserId(userId);
      const srNoConflict = allParties.find(p => 
        p.sr_no === updateData.srNo && 
        p.id !== id && 
        p.user_id === userId
      );

      if (srNoConflict) {
        return res.status(400).json({
          success: false,
          message: 'SR number already exists for your account'
        });
      }
    }

    // Transform data for Supabase
    const supabaseData = {
      party_name: updateData.partyName,
      sr_no: updateData.srNo,
      address: updateData.address,
      phone: updateData.phone,
      email: updateData.email,
      updated_at: new Date().toISOString()
    };

    const updatedParty = await Party.update(id, supabaseData);

    // Transform updated party for frontend compatibility
    const transformedParty = {
      id: updatedParty.id,
      name: updatedParty.party_name, // Frontend expects 'name'
      party_name: updatedParty.party_name, // Keep original for compatibility
      sr_no: updatedParty.sr_no,
      address: updatedParty.address,
      phone: updatedParty.phone,
      email: updatedParty.email,
      status: updatedParty.status || 'A',
      mondayFinal: updatedParty.monday_final || 'No', // Frontend expects 'mondayFinal'
      commiSystem: updatedParty.commi_system || 'Take',
      balanceLimit: updatedParty.balance_limit || '0',
      mCommission: updatedParty.m_commission || 'No Commission',
      rate: updatedParty.rate || '0',
      created_at: updatedParty.created_at,
      updated_at: updatedParty.updated_at
    };

    res.json({
      success: true,
      message: 'Party updated successfully',
      data: transformedParty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update party'
    });
  }
};

// Delete party
const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const party = await Party.findById(id);
    
    if (!party || party.user_id !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Party not found'
      });
    }

    await Party.delete(id);

    res.json({
      success: true,
      message: 'Party deleted successfully',
      data: {
        id: party.id,
        partyName: party.party_name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete party'
    });
  }
};

// Bulk delete parties
const bulkDeleteParties = async (req, res) => {
  try {
    const { partyIds } = req.body;
    const userId = req.user.id;

    if (!partyIds || !Array.isArray(partyIds)) {
      return res.status(400).json({
        success: false,
        message: 'Party IDs array is required'
      });
    }

    // Verify all parties belong to user before deleting
    const allParties = await Party.findByUserId(userId);
    const userPartyIds = allParties.map(p => p.id);
    const validPartyIds = partyIds.filter(id => userPartyIds.includes(id));

    if (validPartyIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid parties found for deletion'
      });
    }

    await Party.deleteMultiple(validPartyIds);

    res.json({
      success: true,
      message: `${validPartyIds.length} parties deleted successfully`,
      data: { deletedCount: validPartyIds.length }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete parties'
    });
  }
};

module.exports = {
  getNextSrNo,
  getAllParties,
  getPartyById,
  createParty,
  updateParty,
  deleteParty,
  bulkDeleteParties
}; 