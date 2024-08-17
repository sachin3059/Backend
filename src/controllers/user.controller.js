import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";



const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return {accessToken, refreshToken};
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generation refresh and access token")
    }
};

// register user::::

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
});



// login user:::::

const loginUser = asyncHandler( async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // check password
    // access and refresh token
    // send cookie

    // i am going to login through email:
    const {email, password} = req.body;
    console.log(email);
    if(!email){
        throw new ApiError(400, "email is required?")
    }

    const user = await User.findOne({email});

    if(!user){
        throw new ApiError(404, "user doesn't exist")
    }

    // now check password:

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401, "password invalid");
    }

    const {accessToken , refreshToken} = await generateAccessAndRefreshToken(user._id);


    // now send to cookie:

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    const options = {
        httpOnly: true,
        secure: true
    }


    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },

            "user logged in successfully"
        )
    )





    


});




// logout user::::::

const logoutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged successfully"))
});


// refersh token::::

const refreshAccessToken =  asyncHandler( async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!incomingRefreshToken){
            throw new ApiError(401, "Invalid refresh token")
        }
    
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken: newrefreshToken},
                "Access token refreshed successfully"
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
        
    }



});


// change currentPassword::::

const changeCurrentPassword = asyncHandler( async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await  User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect

    if(!isPasswordCorrect){
        throw new ApiError(400, "invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200, {} , "Password changed successfully"))
});



// get current password

const getCurrentUser = asyncHandler( async(req, res) => {
    return res.status(200)
    .json(200, req.user, "current user fetched successfully")
});



const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Account details updated successfully")
    )
});



export const updateUserAvatar = asyncHandler( async(req, res) => {

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading on avatar")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new: true}
    ).select("-password")


    return res.status(200)
    .json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )

});



export const updateUserCoverImage = asyncHandler( async(req, res) => {

    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading on coverImage")
    }


    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new: true}
    ).select("-password")


    return res.status(200)
    .json(
        new ApiResponse(200, user, "CoverImage updated successfully")
    )

});





export {
    registerUser, 
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};