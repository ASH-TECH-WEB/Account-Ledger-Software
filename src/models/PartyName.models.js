import mongoose from 'mongoose';

const partyNameSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  remarks: { type: String },
  tnsType: { type: String },
  debit: { type: Number },
  balance: { type: Number },
  check: { type: Boolean },
  ti: { type: String },
  partyName: { type: String, required: true },
  amount: { type: Number }
}, { timestamps: true });

const PartyName = mongoose.model('PartyName', partyNameSchema);
export default PartyName;
