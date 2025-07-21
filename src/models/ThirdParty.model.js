import mongoose from 'mongoose';

const thirdPartySchema = new mongoose.Schema({
  M: { type: String },
  S: { type: String },
  A: { type: String },
  T: { type: String },
  C: { type: String }
}, { timestamps: true });

const ThirdParty = mongoose.model('ThirdParty', thirdPartySchema);
export default ThirdParty;
