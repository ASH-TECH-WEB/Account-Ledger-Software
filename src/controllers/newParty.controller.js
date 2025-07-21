import { NewParty } from '../models/NewParty.model.js';

export const createNewParty = async (req, res) => {
  try {
    const party = new NewParty(req.body);
    await party.save();
    res.status(201).json(party);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getAllParties = async (req, res) => {
  try {
    const parties = await NewParty.find();
    res.json(parties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};