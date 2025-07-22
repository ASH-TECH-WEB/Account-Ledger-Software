import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
  fullname: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true
  },
  phone: { 
    type: String, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  medicalLicenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: true
  },
  qualification: {
    type: String,
    required: true
  },
  experience: {
    type: Number,
    default: 0
  },
  clinicDetails: {
    name: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String },
    phone: { type: String }
  },
  consultationFee: {
    type: Number,
    default: 0
  },
  availableSlots: [{
    day: { 
      type: String, 
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] 
    },
    startTime: { type: String },
    endTime: { type: String }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'pending_verification'
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: { type: String }, // e.g., 'license', 'degree', 'certificate'
    fileUrl: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    }
  }]
}, {
  timestamps: true
});

// Create indexes for faster queries
doctorSchema.index({ email: 1 });
doctorSchema.index({ medicalLicenseNumber: 1 });
doctorSchema.index({ specialization: 1 });

const Doctors = mongoose.model('Doctors', doctorSchema);
export default Doctors; 