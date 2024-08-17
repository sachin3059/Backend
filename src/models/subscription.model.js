import mongoose, {Schema} from "mongoose";


const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,  // one who is subscribing
        ref: "User"
    },

    channel: {
        type: Schema.Types.ObjectId, // chanel is also a user
        ref: "User"
    },

    
});



export const Subscription = mongoose.model('Subscription', subscriptionSchema);