const brandModel = require("../models/brandModel");
const { createUniqueName } = require("../utils/helper");
const { sendBadRequest, sendCreated, sendNotFound, sendServerError, sendConflict, sendSuccess, sendOk } = require("../utils/response")

const create = async (req, res) => {
    try {
        const { name, slug, categoryId } = req.body;
        // console.log(name,slug,categoryId)
        const image = req.files.image;
        // console.log(image)
        if (!name || !slug || !image || !categoryId) return sendBadRequest(res)

        const brand = await brandModel.findOne({ name })
        if (brand) return sendConflict(res)
        const img_name = createUniqueName(image.name)

        const destination = "./public/brand/" + img_name
        image.mv(destination, async (err) => {
            // console.log(err)
            if (err) return sendServerError(res, "Unable to upload file")
            await brandModel.create({ name, slug, image: img_name, categoryId: JSON.parse(categoryId) })
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
        if (query.status) filter.status = query.status === "true";
        if (query.is_top) filter.is_top = query.is_top === "true";
        if (query.is_home) filter.is_home = query.is_home === "true";
        if (query.is_popular) filter.is_popular = query.is_popular === "true";
        if (query.id) filter._id = query.id;

        const brand = await brandModel.find(filter).limit(limit).populate("categoryId");
        const count = await brandModel.countDocuments();
        if (brand) {
            return sendSuccess(res, "Brand Find", brand, {
                total: count,
                imageBaseUrl: "http://localhost:5000/brand"
            })
        }
    } catch (error) {
        console.log(error)
        sendServerError(res)
    }
}

//     const read = async (req, res) => {
//     try {
//         const query = req.query;
//         const filter = {}

//         if (query.status) filter.status = query.status === "true";
//         if (query.is_top) filter.is_top = query.is_top === "true";
//         if (query.is_home) filter.is_home = query.is_home === "true";
//         if (query.is_popular) filter.is_popular = query.is_popular === "true";
//         if (query.id) filter._id = query.id;

//         let queryBuilder = brandModel.find(filter).populate("categoryId");

//         if (query.limit) {
//             queryBuilder = queryBuilder.limit(parseInt(query.limit));
//         }

//         const brand = await queryBuilder;
//         const count = await brandModel.countDocuments(filter);

//         return sendSuccess(res, "Brand Find", brand, {
//             total: count,
//             imageBaseUrl: "http://localhost:5000/brand"
//         })

//     } catch (error) {
//         console.log(error)
//         sendServerError(res)
//     }
// }

const readById = async (req, res) => {
    try {
        const id = req.params.id;
        const brand = await brandModel.findById(id);
        // const count = await categoryModel.countDocuments();
        if (brand) {
            return sendSuccess(res, "Brand Find", brand, {
                imageBaseUrl: "http://localhost:5000/brand"
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

        const brand = await brandModel.findById(id);
        if (!brand) return sendNotFound(res);

        const object = {};

        if (req.body.name) object.name = req.body.name;
        if (req.body.slug) object.slug = req.body.slug;

        if (req.body.categoryId) {
            // agar array aa raha hai
            object.categoryId = Array.isArray(req.body.categoryId)
                ? req.body.categoryId
                : [req.body.categoryId];
        }

        if (image) {
            const img = createUniqueName(image.name);
            const destination = "./public/brand/" + img;

            await image.mv(destination);
            object.image = img;
        }

        await brandModel.updateOne(
            { _id: id },
            { $set: object }
        );

        return sendSuccess(res, "Brand Updated Successfully!");
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
};

const getById = async (req, res) => {
    try {
        const id = req.params.id;
        const brand = await brandModel.findById(id);
        if (brand) {
            return sendSuccess(res, "Brand Find", brand)
        }
    } catch (error) {
        sendServerError(res)
    }
}

const status = async (req, res) => {
    try {
        const { field } = req.body;
        const id = req.params.id;
        const brand = await brandModel.findById(id);
        if (!brand) return sendNotFound(res);
        const msg = `${field} Updated successfully`
        await brandModel.findByIdAndUpdate(id, {
            $set: {
                [field]: !brand[field]
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
        const brand = await brandModel.findById(id);
        if (!brand) return sendNotFound(res);
        await brandModel.findByIdAndDelete(id)
        return sendOk(res, "Brand Delete")

    } catch (error) {
        sendServerError(res)
    }
}

module.exports = {
    create, read, getById, status, deleteById, update
    , readById
}