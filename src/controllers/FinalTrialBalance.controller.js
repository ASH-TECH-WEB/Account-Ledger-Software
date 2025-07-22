import FinalTrialBalance from '../models/FinalTrialBalance.model.js';

export const createFinalTrialBalance = async (req, res) => {
  try {
    const newEntry = await FinalTrialBalance.create(req.body);
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllFinalTrialBalances = async (req, res) => {
  try {
    const entries = await FinalTrialBalance.find();
    res.status(200).json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFinalTrialBalanceById = async (req, res) => {
  try {
    const entry = await FinalTrialBalance.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ message: 'Final Trial Balance entry not found' });
    }
    res.status(200).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateFinalTrialBalance = async (req, res) => {
  try {
    const updatedEntry = await FinalTrialBalance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedEntry) {
      return res.status(404).json({ message: 'Final Trial Balance entry not found' });
    }
    res.status(200).json(updatedEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteFinalTrialBalance = async (req, res) => {
  try {
    const deletedEntry = await FinalTrialBalance.findByIdAndDelete(req.params.id);
    if (!deletedEntry) {
      return res.status(404).json({ message: 'Final Trial Balance entry not found' });
    }
    res.status(200).json({ message: 'Final Trial Balance entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
