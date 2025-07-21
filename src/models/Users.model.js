import mongoose from 'mongoose';

const partySchema = new mongoose.Schema({
  partyName: { type: String, required: true, unique: true },
  gstNumber: { type: String },
  panNumber: { type: String },
  contactPerson: { type: String },
  contactNumber: { type: String },
  email: { type: String },
  billingAddress: { type: String },
  shippingAddress: { type: String },
  partyType: {
    type: String,
    enum: ['customer', 'supplier', 'agent', 'broker', 'other'],
    required: true
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  balanceType: {
    type: String,
    enum: ['credit', 'debit'],
    default: 'credit'
  },
  paymentTerms: { type: String }, // e.g., "30 days", "Advance", etc.
  bankDetails: {
    accountNumber: { type: String },
    bankName: { type: String },
    ifscCode: { type: String },
    branch: { type: String },
  },
  documents: [{
    name: { type: String }, // e.g., PAN Card, Aadhar, GST Cert.
    fileUrl: { type: String }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
}, {
  timestamps: true
});

export const Party = mongoose.model('Party', partySchema);
