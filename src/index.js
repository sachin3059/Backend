//require('dotenv').config({path: './env'});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";


dotenv.config({
    path: './.env'
})


connectDB()
.then( () => {
    app.on("error", (error) => {
        console.log("ERROR: ", error)
        throw error
    })
    app.listen(process.env.PORT || 8000, ()=> {
        console.log(`Server is running at port ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("MONGO DB CONNECTION FAILED!!", err)
})














/*

=> first approch to connect database using IIFE

import express from "express";
const app = express();


( async () => {
    try {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("ERROR: ", error);
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listing on port ${process.env.PORT}`);
        })

        
    } catch (error) {
        console.error("ERROR", error)
        throw error 
    }
})()


*/