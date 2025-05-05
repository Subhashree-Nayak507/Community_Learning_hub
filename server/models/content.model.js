import mongoose from 'mongoose';

const contentSchema = new mongoose.Schema(
  {
    
    sourceId: {
      type: String,
      required: true,
      unique: true, 
    },
    title: {
      type: String,
      required: true,
    },
    preview: {
      type: String,
    },
    originalUrl: {
      type: String,
      required: true,
    },
    metadata: {
      isPremium: {
        type: Boolean,
        default: true
      },
      unlockCost: {
        type: Number,
        default: 10  
      }
    }
  },  
  { timestamps: true }
);

const Content = mongoose.model('Content', contentSchema);

export default Content;