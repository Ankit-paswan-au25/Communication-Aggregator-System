import { mongoose } from "mongoose";
export const dbConnection = async () => {
    try {
        const connectionUrl = process.env.MONGODB_URL;
        if (!connectionUrl) throw new Error('MONGODB_URL is missing or undefined.');
        await mongoose.connect(connectionUrl);
        console.log("DB connected successfully");
    } catch (err) {
        console.log("db connection failure");
        process.exit(1)
    }
}

