const mongoose = require("mongoose")
const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true,
        minlength:4,
        maxlength:50,
        trim:true
    },
    slug:{
        type:String,
        required:true,
        unique:true,
        minlength:4,
        maxlength:60,
        trim:true
    },
    short_description:{
        type:String,
        maxlength:200,
    },
     long_description:{
        type:String,
    },
     orginal_price:{
        type:Number,
        required:true,
    },
     discount_percentage:{
        type:Number,
        default:5,
    },
     final_price:{
        type:Number,
    },
     categoryId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"categories",
    },
     brandId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"brand",
    },
    colorId:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"color"
        }
    ],
    thumbnail:{
        type:String,
        default:null
    },
    image:[
        {
        type:String,
    }
    ],
    stock:{
        type:Boolean,
        default:true
    },
    top_selling:{
        type:Boolean,
        default:false
    },
    status:{
        type:Boolean,
        default:true
    },
    // is_home:{
    //     type:Boolean,
    //     default:false
    // },
    // is_top:{
    //     type:Boolean,
    //     default:false
    // },
    // is_popular:{
    //     type:Boolean,
    //     default:false
    // }
},
    {
        timestamps:true
    }
)

const productModel = mongoose.model("Product",productSchema)
module.exports = productModel;