const categoryModel = require("../models/categoryModel");
const { createUniqueName } = require("../utils/helper");
const { sendBadRequest, sendCreated, sendNotFound, sendServerError, sendConflict, sendSuccess, sendOk } = require("../utils/response")

const create = async (req, res) => {
    try {
        const { name, slug } = req.body;
        const image = req.files.image;
        console.log(image)
        if (!name || !slug || !image) return sendBadRequest(res)

        const category = await categoryModel.findOne({ name })
        if (category) return sendConflict(res)
        const img_name = createUniqueName(image.name)

        const destination = "./public/category/" + img_name
        image.mv(destination, async (err) => {
            // console.log(err)
            if (err) return sendServerError(res, "Unable to upload file")
            await categoryModel.create({ name, slug , image:img_name})
            return sendCreated(res)
        })



    } catch (error) {
        const message = error?.message || "Internal Server Error"
        sendServerError(res, message)
    }
}

const read = async (req, res) => {
    try {
        const query = req.query;
        const filter = {}
        const limit = query.limit ? parseInt(query.limit) : 0
        if(query.status) filter.status = query.status === "true";
        if(query.is_top) filter.is_top = query.is_top === "true";        
        if(query.is_home) filter.is_home = query.is_home === "true";        
        if(query.is_popular) filter.is_popular = query.is_popular === "true";     
        if(query.id) filter._id = query.id; 

        console.log(filter)
        const category = await categoryModel.find(filter).limit(limit)
        const count = await categoryModel.countDocuments();
        if (category) {
            return sendSuccess(res, "Category Find", category, {
                total: count,
                imageBaseUrl : "http://localhost:5000/category"
            })
        }
    } catch (error) {
        console.log(error)
        sendServerError(res)
    }
}

const readById = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await categoryModel.findById(id);
        // const count = await categoryModel.countDocuments();
        if (category) {
            return sendSuccess(res, "Category Find", category, {
                imageBaseUrl : "http://localhost:5000/category"
            })
        }
    } catch (error) {
        sendServerError(res)
    }
}

const update = async (req, res) => {
    try {
        const image = req.files && req.files.image ? req.files.image : null;
        const id = req.params.id;

        const category = await categoryModel.findById(id);
        if (!category) return sendNotFound(res);

        const object = {};

        if (req.body.name) object.name = req.body.name;
        if (req.body.slug) object.slug = req.body.slug;

        if (image) {
            const img = createUniqueName(image.name);
            const destination = "./public/category/" + img;

            await image.mv(destination);
            object.image = img;
        }

        await categoryModel.updateOne(
            { _id: id },
            { $set: object }
        );

        return sendSuccess(res, "Category Updated Successfully!");
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
};

const getById = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await categoryModel.findById(id);
        if (category) {
            return sendSuccess(res, "Category Find", category)
        }
    } catch (error) {
        sendServerError(res)
    }
}

const status = async (req, res) => {
    try {
         const { field } = req.body;
        const id = req.params.id;
        const category = await categoryModel.findById(id);
        if (!category) return sendNotFound(res);
        const msg = `${field} Updated successfully`
        await categoryModel.findByIdAndUpdate(id, {
            $set: {
                [field]: !category[field]
            }
        });

        return sendSuccess(res, msg);
    } catch (error) {
        sendServerError(res)
    }
}

const deleteById = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await categoryModel.findById(id);
        if (!category) return sendNotFound(res);
        await categoryModel.findByIdAndDelete(id)
        return sendOk(res, "Category Delete")

    } catch (error) {
        sendServerError(res)
    }
}

module.exports = {
    create, read, getById, status, deleteById,readById,update
}