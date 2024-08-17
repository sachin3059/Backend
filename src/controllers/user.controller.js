import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler( async(req, res) => {
    // get user detail from frontend or postman
    // validation lagana padega  -> not empty
    // check if user already exist : username
    // check for images, check for avatar
    // upload them cloudinary, avatar check
    // create user object - create entry in db
    // remove password and refresh token from response
    // check for user creation
    // return res if user created



    const {username, email, fullName, password} =  req.body;
    //console.log("email: ", email);

    if(
        [fullName, email, username, password].some( (field) => field?.trim() === "")){
            throw new ApiError(400, "All fields are mandetory");
    }


    const existedUser = await User.findOne({ email })
    if(existedUser){
        throw new ApiError(409, "user with this email is already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files[0]?.path
    }


    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }


    // now upload on cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }


    // entry in database

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
        email,
        username
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registring a user");
    }


    return res.status(201).json(
        new ApiResponse(200, createdUser, "user registered successfully!!")
    )
})

export {registerUser};