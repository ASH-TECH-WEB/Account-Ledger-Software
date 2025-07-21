import mongoose from 'mongoose';

const incentiveSchema = new mongoose.Schema({
  M: { type: String },
  S: { type: String },
  A: { type: String },
  T: { type: String },
  C: { type: String }
}, { timestamps: true });

const Incentive = mongoose.model('Incentive', incentiveSchema);
export default Incentive;
