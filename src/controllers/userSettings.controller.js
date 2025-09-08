const UserSettings = require('../models/supabase/UserSettings');
const Party = require('../models/supabase/Party');

// Get user settings
const getUserSettings = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user.id;

    // Verify user is requesting their own settings
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own settings.'
      });
    }

    let settings = await UserSettings.findByUserId(requestedUserId);
    
    if (!settings) {
      // Create default settings if none exist
      settings = await UserSettings.findOrCreate(requestedUserId, { email: req.user.email });
    }

    res.json({
      success: true,
      message: 'User settings retrieved successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user settings'
    });
  }
};

// Create user settings
const createUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const settingsData = { ...req.body, user_id: userId };

    // Check if settings already exist
    const existingSettings = await UserSettings.findByUserId(userId);
    if (existingSettings) {
      return res.status(400).json({
        success: false,
        message: 'User settings already exist'
      });
    }

    const settings = await UserSettings.create(settingsData);

    res.status(201).json({
      success: true,
      message: 'User settings created successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create user settings'
    });
  }
};

// Update user settings
const updateUserSettings = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user.id;
    const updateData = req.body;

    // Verify user is updating their own settings
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own settings.'
      });
    }

    let settings = await UserSettings.findByUserId(requestedUserId);
    const oldCompanyName = settings?.company_account;
    
    if (!settings) {
      // Create settings if they don't exist
      settings = await UserSettings.create({ user_id: requestedUserId, ...updateData });
    } else {
      // Update existing settings
      settings = await UserSettings.update(requestedUserId, updateData);
    }

    // Auto-create company party if company name changed
    if (updateData.company_account && updateData.company_account !== oldCompanyName) {
      try {
        console.log(`🏢 Company name changed from "${oldCompanyName}" to "${updateData.company_account}"`);
        
        // Check if company party already exists
        const existingParties = await Party.findByUserId(requestedUserId);
        const companyPartyExists = existingParties?.some(party => 
          party.party_name === updateData.company_account
        );
        
        if (!companyPartyExists) {
          // Create new company party
          const companyPartyData = {
            user_id: requestedUserId,
            party_name: updateData.company_account,
            sr_no: `COMP_${Date.now()}`,
            status: 'A', // Active
            commi_system: 'Give', // Company gives commission
            balance_limit: '0',
            m_commission: 'With Commission',
            rate: '1',
            monday_final: 'No',
            address: '',
            phone: '',
            email: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const newCompanyParty = await Party.create(companyPartyData);
          console.log(`✅ Company party created: ${updateData.company_account} (ID: ${newCompanyParty.id})`);
        } else {
          console.log(`ℹ️ Company party already exists: ${updateData.company_account}`);
        }
      } catch (partyError) {
        console.error('❌ Error creating company party:', partyError);
        // Don't fail the settings update if party creation fails
      }
    }

    res.json({
      success: true,
      message: 'User settings updated successfully',
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update user settings'
    });
  }
};

// Delete user settings
const deleteUserSettings = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user.id;

    // Verify user is deleting their own settings
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own settings.'
      });
    }

    const settings = await UserSettings.findByUserId(requestedUserId);
    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'User settings not found'
      });
    }

    await UserSettings.delete(requestedUserId);

    res.json({
      success: true,
      message: 'User settings deleted successfully',
      data: { deleted: true }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete user settings'
    });
  }
};

module.exports = {
  getUserSettings,
  createUserSettings,
  updateUserSettings,
  deleteUserSettings
}; 