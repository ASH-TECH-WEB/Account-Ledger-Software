import mongoose from 'mongoose';

const selfIdSchema = new mongoose.Schema({
  M: { type: String },
  S: { type: String },
  A: { type: String },
  T: { type: String },
  C: { type: String }
}, { timestamps: true });

const SelfId = mongoose.model('SelfId', selfIdSchema);
export default SelfId;
