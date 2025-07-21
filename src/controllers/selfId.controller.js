import SelfId from '../models/SelfId.model.js';

export const createSelfId = async (req, res) => {
  try {
    const newSelfId = await SelfId.create(req.body);
    res.status(201).json(newSelfId);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllSelfIds = async (req, res) => {
  try {
    const selfIds = await SelfId.find();
    res.status(200).json(selfIds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
