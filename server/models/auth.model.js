import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
   fullname:{
    type:String,
    required:true
   },
   username:{
    type:String,
    required:true,
    unique:true
   },
   email:{
    type:String,
    required:true,
    unique:true
   },
   password:{
    type:String,
    required:true,
    minLength: 6,
   },
   role:{
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
   },
   creditBalance:{
    type:Number,
    default:0,
    min:0
   },
   savedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content'
  }],
}, {timestamps:true});

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return 
    this.password = await bcrypt.hash(this.password, 10);
});


const userModel = mongoose.model('User',userSchema);
export default userModel;