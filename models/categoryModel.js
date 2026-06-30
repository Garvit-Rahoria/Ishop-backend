const mongoose = require("mongoose")
const categorySchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        minlength:4,
        trim:true
    },
    slug:{
        type:String,
        required:true,
        unique:true,
        minlength:4,
        trim:true
    },
    image:{
        type:String,
        default:null
    },
    status:{
        type:Boolean,
        default:true
    },
    is_home:{
        type:Boolean,
        default:false
    },
    is_top:{
        type:Boolean,
        default:false
    },
    is_popular:{
        type:Boolean,
        default:false
    }
},
    {
        timestamps:true
    }
)

const categoryModel = mongoose.model("categories",categorySchema)
module.exports = categoryModel;