import mongoose from 'mongoose';

const newPartySchema = new mongoose.Schema({
  srNo: { type: Number, required: true },
  partyName: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  comiSuite: { type: String },
  balanceLimit: { type: Number, default: 0 }
}, { timestamps: true });

const NewParty = mongoose.model('NewParty', newPartySchema);
export default NewParty;
