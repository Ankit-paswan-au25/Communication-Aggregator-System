import { mongoose } from "mongoose";



const communicationSchema = mongoose.Schema(
    {
        from: {
            type: String,
            required: [true, "sender is not define"],
        },
        to: {
            type: String,
            required: [true, 'whom to send the message ?'],
            unique: true,
            lowerCase: true,
        },
        msg: {
            type: String,
            required: [true, 'Please Provide password'],

        },
        status: {
            type: String,
            required: [true, 'Please Provide password']
        }
    }

);

export const communication = mongoose.model("communication", communicationSchema);
//module.exports = communication;