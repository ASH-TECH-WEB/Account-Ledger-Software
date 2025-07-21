import mongoose from 'mongoose';

const agentIdSchema = new mongoose.Schema({
  M: { type: String },
  S: { type: String },
  A: { type: String },
  T: { type: String },
  C: { type: String }
}, { timestamps: true });

const AgentId = mongoose.model('AgentId', agentIdSchema);
export default AgentId;
