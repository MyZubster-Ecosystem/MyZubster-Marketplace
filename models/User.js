const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'cittadino' },
  sellerPlan: { type: String, enum: ['free', 'paid'], default: 'free' },
  sellerPaymentMethodStatus: { type: String, enum: ['not_required', 'required', 'configured'], default: 'not_required' },
  sellerPaidActivatedAt: Date,
  xmrAddress: String,
  xmrVerified: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  reputation: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Hash password prima di salvare
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Metodo per confrontare le password
UserSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
