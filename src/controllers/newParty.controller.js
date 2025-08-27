/**
 * New Party Controller - Enhanced Version
 * 
 * Handles party creation, management, and SR number generation
 * with enhanced validation, error handling, and business logic.
 * 
 * @author Account Ledger Team
 * @version 3.0.0
 * @since 2024-01-01
 */

const Party = require('../models/supabase/Party');

// Business constants
const BUSINESS_CONSTANTS = {
  SR_NO_MIN_LENGTH: 3,
  SR_NO_MAX_LENGTH: 10,
  PARTY_NAME_MAX_LENGTH: 100,
  ADDRESS_MAX_LENGTH: 500,
  PHONE_MAX_LENGTH: 20,
  EMAIL_MAX_LENGTH: 100,
  COMPANY_NAME_MAX_LENGTH: 150,
  DEFAULT_STATUS: 'A',
  DEFAULT_MONDAY_FINAL: 'No',
  DEFAULT_COMMI_SYSTEM: 'Take',
  DEFAULT_BALANCE_LIMIT: '0',
  DEFAULT_COMMISSION: 'No Commission',
  DEFAULT_RATE: '0',
  MAX_SEARCH_LENGTH: 100,
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100
};

// Input validation utilities
const validatePartyName = (partyName) => {
  if (!partyName || typeof partyName !== 'string') {
    throw new Error('Party name is required and must be a string');
  }
  
  const trimmedName = partyName.trim();
  if (trimmedName.length === 0) {
    throw new Error('Party name cannot be empty');
  }
  
  if (trimmedName.length > BUSINESS_CONSTANTS.PARTY_NAME_MAX_LENGTH) {
    throw new Error(`Party name cannot exceed ${BUSINESS_CONSTANTS.PARTY_NAME_MAX_LENGTH} characters`);
  }
  
  // Check for potentially malicious content
  if (/[<>]/.test(trimmedName) || /javascript:/i.test(trimmedName)) {
    throw new Error('Party name contains invalid characters');
  }
  
  return trimmedName;
};

const validateSrNo = (srNo) => {
  if (!srNo || typeof srNo !== 'string') {
    throw new Error('SR number is required and must be a string');
  }
  
  const trimmedSrNo = srNo.trim();
  if (trimmedSrNo.length === 0) {
    throw new Error('SR number cannot be empty');
  }
  
  if (trimmedSrNo.length < BUSINESS_CONSTANTS.SR_NO_MIN_LENGTH) {
    throw new Error(`SR number must be at least ${BUSINESS_CONSTANTS.SR_NO_MIN_LENGTH} characters long`);
  }
  
  if (trimmedSrNo.length > BUSINESS_CONSTANTS.SR_NO_MAX_LENGTH) {
    throw new Error(`SR number cannot exceed ${BUSINESS_CONSTANTS.SR_NO_MAX_LENGTH} characters`);
  }
  
  // Check if SR number contains only alphanumeric characters and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(trimmedSrNo)) {
    throw new Error('SR number can only contain letters, numbers, and hyphens');
  }
  
  return trimmedSrNo;
};

const validateAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return '';
  }
  
  const trimmedAddress = address.trim();
  if (trimmedAddress.length > BUSINESS_CONSTANTS.ADDRESS_MAX_LENGTH) {
    throw new Error(`Address cannot exceed ${BUSINESS_CONSTANTS.ADDRESS_MAX_LENGTH} characters`);
  }
  
  return trimmedAddress;
};

const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  const trimmedPhone = phone.trim();
  if (trimmedPhone.length > BUSINESS_CONSTANTS.PHONE_MAX_LENGTH) {
    throw new Error(`Phone number cannot exceed ${BUSINESS_CONSTANTS.PHONE_MAX_LENGTH} characters`);
  }
  
  // Basic phone number validation
  const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{0,19}$/;
  if (trimmedPhone.length > 0 && !phoneRegex.test(trimmedPhone)) {
    throw new Error('Invalid phone number format');
  }
  
  return trimmedPhone;
};

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  
  const trimmedEmail = email.trim();
  if (trimmedEmail.length > BUSINESS_CONSTANTS.EMAIL_MAX_LENGTH) {
    throw new Error(`Email cannot exceed ${BUSINESS_CONSTANTS.EMAIL_MAX_LENGTH} characters`);
  }
  
  if (trimmedEmail.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      throw new Error('Invalid email format');
    }
  }
  
  return trimmedEmail;
};

const validateCompanyName = (companyName) => {
  if (!companyName || typeof companyName !== 'string') {
    return '';
  }
  
  const trimmedCompanyName = companyName.trim();
  if (trimmedCompanyName.length > BUSINESS_CONSTANTS.COMPANY_NAME_MAX_LENGTH) {
    throw new Error(`Company name cannot exceed ${BUSINESS_CONSTANTS.COMPANY_NAME_MAX_LENGTH} characters`);
  }
  
  return trimmedCompanyName;
};

const validateSearchQuery = (search) => {
  if (!search || typeof search !== 'string') {
    return '';
  }
  
  const trimmedSearch = search.trim();
  if (trimmedSearch.length > BUSINESS_CONSTANTS.MAX_SEARCH_LENGTH) {
    throw new Error(`Search query cannot exceed ${BUSINESS_CONSTANTS.MAX_SEARCH_LENGTH} characters`);
  }
  
  return trimmedSearch;
};

const validatePagination = (page, limit) => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || BUSINESS_CONSTANTS.DEFAULT_PAGE_SIZE;
  
  if (pageNum < 1) {
    throw new Error('Page number must be greater than 0');
  }
  
  if (limitNum < 1 || limitNum > BUSINESS_CONSTANTS.MAX_PAGE_SIZE) {
    throw new Error(`Limit must be between 1 and ${BUSINESS_CONSTANTS.MAX_PAGE_SIZE}`);
  }
  
  return { page: pageNum, limit: limitNum };
};

// Input sanitization function with enhanced security
const sanitizeInput = (input, maxLength = 1000) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data URLs
    .replace(/vbscript:/gi, '') // Remove VBScript
    .substring(0, maxLength);
};

// Response utilities
const sendSuccessResponse = (res, data, message = 'Operation completed successfully', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const sendErrorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: res.req?.originalUrl || 'unknown'
  };
  
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message;
    response.stack = error.stack;
  }
  
  res.status(statusCode).json(response);
};

// Get next SR number with enhanced validation and error handling
const getNextSrNo = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!userId) {
      return sendErrorResponse(res, 401, 'User not authenticated');
    }

    // Get parties for user with error handling
    const parties = await Party.findByUserId(userId);
    
    if (!parties) {
      return sendSuccessResponse(res, { nextSrNo: '001' }, 'No existing parties found, starting with 001');
    }
    
    let nextSrNo = '001';
    
    if (parties.length > 0) {
      // Filter parties for this user and sort by sr_no
      const userParties = parties.filter(party => party.user_id === userId);
      
      if (userParties.length > 0) {
        // Sort by sr_no and get the highest for this user
        const sortedParties = userParties.sort((a, b) => {
          const aNum = parseInt(a.sr_no || '0');
          const bNum = parseInt(b.sr_no || '0');
          return bNum - aNum;
        });
        
        const lastParty = sortedParties[0];
        
        if (lastParty && lastParty.sr_no) {
          const lastNumber = parseInt(lastParty.sr_no);
          if (!isNaN(lastNumber)) {
            nextSrNo = String(lastNumber + 1).padStart(3, '0');
          }
        }
      }
    }

    sendSuccessResponse(res, { nextSrNo }, 'Next SR number retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to get next SR number', error);
  }
};

// Get all parties for user with enhanced filtering and pagination
const getAllParties = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!userId) {
      return sendErrorResponse(res, 401, 'User not authenticated');
    }
    
    const { search, status, page, limit } = req.query;

    // Validate and sanitize inputs
    const validatedSearch = validateSearchQuery(search);
    const { page: validatedPage, limit: validatedLimit } = validatePagination(page, limit);
    
    // Get parties for user
    let parties = await Party.findByUserId(userId);
    
    if (!parties) {
      return sendSuccessResponse(res, {
        parties: [],
        pagination: {
          currentPage: validatedPage,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: validatedLimit
        }
      }, 'No parties found');
    }
    
    // Apply search filter if provided
    if (validatedSearch) {
      const sanitizedSearch = sanitizeInput(validatedSearch);
      parties = parties.filter(party => 
        party.party_name?.toLowerCase().includes(sanitizedSearch.toLowerCase()) ||
        party.sr_no?.toLowerCase().includes(sanitizedSearch.toLowerCase())
      );
    }

    // Apply status filter if provided
    if (status && ['A', 'I'].includes(status)) {
      parties = parties.filter(party => party.status === status);
    }

    // Calculate pagination
    const total = parties.length;
    const skip = (validatedPage - 1) * validatedLimit;
    const paginatedParties = parties.slice(skip, skip + validatedLimit);

    // Transform data for frontend compatibility with simplified business fields
    const transformedParties = paginatedParties.map(party => ({
      id: party.id,
      name: party.party_name,
      party_name: party.party_name,
      sr_no: party.sr_no,
      address: party.address || '',
      phone: party.phone || '',
      email: party.email || '',
      companyName: party.company_name || party.party_name,
      status: party.status || BUSINESS_CONSTANTS.DEFAULT_STATUS,
      mondayFinal: party.monday_final || BUSINESS_CONSTANTS.DEFAULT_MONDAY_FINAL,
      commiSystem: party.commi_system || BUSINESS_CONSTANTS.DEFAULT_COMMI_SYSTEM,
      balanceLimit: party.balance_limit || BUSINESS_CONSTANTS.DEFAULT_BALANCE_LIMIT,
      mCommission: party.m_commission || BUSINESS_CONSTANTS.DEFAULT_COMMISSION,
      rate: party.rate || BUSINESS_CONSTANTS.DEFAULT_RATE,
      created_at: party.created_at,
      updated_at: party.updated_at
    }));

    sendSuccessResponse(res, {
      parties: transformedParties,
      pagination: {
        currentPage: validatedPage,
        totalPages: Math.ceil(total / validatedLimit),
        totalItems: total,
        itemsPerPage: validatedLimit
      }
    }, 'Parties retrieved successfully');
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to get parties', error);
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
      srNo: party.sr_no,
      partyName: party.party_name,
      status: party.status || 'R',
      commiSystem: party.commi_system || 'Take',
      balanceLimit: party.balance_limit || '0',
      mCommission: party.m_commission || 'No Commission',
      rate: party.rate || '0',
      mondayFinal: party.monday_final || 'No',
      createdAt: party.created_at,
      updatedAt: party.updated_at
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

    // Transform data for Supabase with only the fields sent by frontend
    const supabaseData = {
      user_id: userId,
      party_name: partyData.partyName,
      sr_no: partyData.srNo,
      status: partyData.status || 'R',
      commi_system: partyData.commiSystem || 'Take',
      balance_limit: partyData.balanceLimit || '0',
      m_commission: partyData.mCommission || 'No Commission',
      rate: partyData.rate || '0',
      monday_final: partyData.mondayFinal || 'No',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const party = await Party.create(supabaseData);

    // Transform created party for frontend compatibility
    const transformedParty = {
      id: party.id,
      srNo: party.sr_no,
      partyName: party.party_name,
      status: party.status || 'R',
      commiSystem: party.commi_system || 'Take',
      balanceLimit: party.balance_limit || '0',
      mCommission: party.m_commission || 'No Commission',
      rate: party.rate || '0',
      mondayFinal: party.monday_final || 'No',
      createdAt: party.created_at,
      updatedAt: party.updated_at
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

    // Transform data for Supabase with simplified fields
    const supabaseData = {
      party_name: updateData.partyName,
      sr_no: updateData.srNo,
      status: updateData.status,
      commi_system: updateData.commiSystem,
      balance_limit: updateData.balanceLimit,
      m_commission: updateData.mCommission,
      rate: updateData.rate,
      monday_final: updateData.mondayFinal,
      updated_at: new Date().toISOString()
    };

    const updatedParty = await Party.update(id, supabaseData);

    // Transform updated party for frontend compatibility
    const transformedParty = {
      id: updatedParty.id,
      srNo: updatedParty.sr_no,
      partyName: updatedParty.party_name,
      status: updatedParty.status || 'R',
      commiSystem: updatedParty.commi_system || 'Take',
      balanceLimit: updatedParty.balance_limit || '0',
      mCommission: updatedParty.m_commission || 'No Commission',
      rate: updatedParty.rate || '0',
      mondayFinal: updatedParty.monday_final || 'No',
      createdAt: updatedParty.created_at,
      updatedAt: updatedParty.updated_at
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