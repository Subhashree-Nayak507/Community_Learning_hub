import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['earn', 'spend'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0 
    },
    purpose: {
      type: String,
      enum: [
        'watch_content',
        'share_content',
        'unlock_premium'
      ],
      required: true
    },
    metadata: {
        contentId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'Content' 
        },
        details: String 
      }
  },
  { timestamps: true }
);
transactionSchema.pre('save', async function (next) {
    if (this.isNew) {
      const user = await mongoose.model('User').findById(this.userId);
      if (this.type === 'earn') {
        user.creditBalance += this.amount;
      } else {
        user.creditBalance -= this.amount;
      }
      await user.save();
    }
    next();
  });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;