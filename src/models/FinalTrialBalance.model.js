import mongoose from 'mongoose';

const finalTrialBalanceSchema = new mongoose.Schema({
  // Add fields as per future logic
}, { timestamps: true });

const FinalTrialBalance = mongoose.model('FinalTrialBalance', finalTrialBalanceSchema);
export default FinalTrialBalance;
