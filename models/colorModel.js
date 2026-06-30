const mongoose = require("mongoose")
const colorSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        minlength:3,
        trim:true
    },
    slug:{
        type:String,
        required:true,
        unique:true,
        minlength:3,
        trim:true
    },
    color_code:{
        type:String,
        unique:true,
        required:true
    },
    status:{
        type:Boolean,
        default:true 
    },
    
},
    {
        timestamps:true
    }
)

const colorModel = mongoose.model("color",colorSchema)
module.exports = colorModel;