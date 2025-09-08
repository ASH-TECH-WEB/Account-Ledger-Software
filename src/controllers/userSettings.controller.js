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

    // Check if company name is being set and create corresponding party
    if (settingsData.companyName && settingsData.companyName.trim()) {
      try {
        // Check if a party with this company name already exists for this user
        const existingParties = await Party.findByUserId(userId);
        const existingCompanyParty = existingParties.find(p => 
          p.party_name === settingsData.companyName.trim() && p.user_id === userId
        );

        if (!existingCompanyParty) {
          // Get next SR number for the user
          const allParties = await Party.findByUserId(userId);
          let nextSrNo = '001';
          
          if (allParties && allParties.length > 0) {
            const sortedParties = allParties.sort((a, b) => {
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

          // Create party data for the company
          const companyPartyData = {
            user_id: userId,
            party_name: settingsData.companyName.trim(),
            sr_no: nextSrNo,
            status: 'A', // Active
            commi_system: 'Take',
            balance_limit: '0',
            m_commission: 'No Commission',
            rate: '0',
            monday_final: 'No',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Create the company party
          const companyParty = await Party.create(companyPartyData);
          
          console.log(`✅ Auto-created company party: ${settingsData.companyName} (SR: ${nextSrNo}) for user ${userId}`);
        } else {
          console.log(`ℹ️ Company party already exists: ${settingsData.companyName} for user ${userId}`);
        }
      } catch (partyError) {
        console.error('⚠️ Failed to create company party:', partyError);
        // Don't fail the settings creation if party creation fails
      }
    }

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
    
    if (!settings) {
      // Create settings if they don't exist
      settings = await UserSettings.create({ user_id: requestedUserId, ...updateData });
    } else {
      // Update existing settings
      settings = await UserSettings.update(requestedUserId, updateData);
    }

    // Check if company name is being set/updated and create corresponding party
    if (updateData.companyName && updateData.companyName.trim()) {
      try {
        // Check if a party with this company name already exists for this user
        const existingParties = await Party.findByUserId(requestedUserId);
        const existingCompanyParty = existingParties.find(p => 
          p.party_name === updateData.companyName.trim() && p.user_id === requestedUserId
        );

        if (!existingCompanyParty) {
          // Get next SR number for the user
          const allParties = await Party.findByUserId(requestedUserId);
          let nextSrNo = '001';
          
          if (allParties && allParties.length > 0) {
            const sortedParties = allParties.sort((a, b) => {
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

          // Create party data for the company
          const companyPartyData = {
            user_id: requestedUserId,
            party_name: updateData.companyName.trim(),
            sr_no: nextSrNo,
            status: 'A', // Active
            commi_system: 'Take',
            balance_limit: '0',
            m_commission: 'No Commission',
            rate: '0',
            monday_final: 'No',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // Create the company party
          const companyParty = await Party.create(companyPartyData);
          
          console.log(`✅ Auto-created company party: ${updateData.companyName} (SR: ${nextSrNo}) for user ${requestedUserId}`);
        } else {
          console.log(`ℹ️ Company party already exists: ${updateData.companyName} for user ${requestedUserId}`);
        }
      } catch (partyError) {
        console.error('⚠️ Failed to create company party:', partyError);
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