const categoryModel = require("../models/categoryModel");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");
const {
    sendBadRequest, sendCreated, sendNotFound,
    sendServerError, sendConflict, sendSuccess, sendOk
} = require("../utils/response");

const create = async (req, res) => {
    try {
        const { name, slug } = req.body;

        if (!name || !slug || !req.file) return sendBadRequest(res, "name, slug and image are required");

        const existing = await categoryModel.findOne({ name });
        if (existing) return sendConflict(res);

        const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer, "ishop/category");

        await categoryModel.create({ name, slug, image: secure_url, cloudinary_id: public_id });

        return sendCreated(res);
    } catch (error) {
        console.error("category create error:", error);
        return sendServerError(res, error.message);
    }
};

const read = async (req, res) => {
    try {
        const query = req.query;
        const filter = {};
        const limit = query.limit ? parseInt(query.limit) : 0;

        if (query.status)     filter.status     = query.status     === "true";
        if (query.is_top)     filter.is_top     = query.is_top     === "true";
        if (query.is_home)    filter.is_home    = query.is_home    === "true";
        if (query.is_popular) filter.is_popular = query.is_popular === "true";
        if (query.id)         filter._id        = query.id;

        const [category, count] = await Promise.all([
            categoryModel.find(filter).limit(limit),
            categoryModel.countDocuments(),
        ]);

        // imageBaseUrl is empty — full Cloudinary URLs are already stored in category.image
        return sendSuccess(res, "Category Find", category, { total: count, imageBaseUrl: "" });
    } catch (error) {
        console.error("category read error:", error);
        return sendServerError(res);
    }
};

const readById = async (req, res) => {
    try {
        const category = await categoryModel.findById(req.params.id);
        if (!category) return sendNotFound(res);
        return sendSuccess(res, "Category Find", category, { imageBaseUrl: "" });
    } catch (error) {
        return sendServerError(res);
    }
};

const update = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await categoryModel.findById(id);
        if (!category) return sendNotFound(res);

        const object = {};
        if (req.body.name) object.name = req.body.name;
        if (req.body.slug) object.slug = req.body.slug;

        if (req.file) {
            // Delete old Cloudinary image if it exists
            await deleteFromCloudinary(category.cloudinary_id);

            const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer, "ishop/category");
            object.image        = secure_url;
            object.cloudinary_id = public_id;
        }

        await categoryModel.updateOne({ _id: id }, { $set: object });
        return sendSuccess(res, "Category Updated Successfully!");
    } catch (error) {
        console.error("category update error:", error);
        return sendServerError(res);
    }
};

const getById = async (req, res) => {
    try {
        const category = await categoryModel.findById(req.params.id);
        if (!category) return sendNotFound(res);
        return sendSuccess(res, "Category Find", category);
    } catch (error) {
        return sendServerError(res);
    }
};

const status = async (req, res) => {
    try {
        const { field } = req.body;
        const allowed = new Set(["status", "is_top", "is_home", "is_popular"]);
        if (!allowed.has(field)) return sendBadRequest(res, "Invalid status field");
        const id = req.params.id;
        const category = await categoryModel.findById(id);
        if (!category) return sendNotFound(res);

        await categoryModel.findByIdAndUpdate(id, { $set: { [field]: !category[field] } });
        return sendSuccess(res, `${field} Updated successfully`);
    } catch (error) {
        return sendServerError(res);
    }
};

const deleteById = async (req, res) => {
    try {
        const id = req.params.id;
        const category = await categoryModel.findById(id);
        if (!category) return sendNotFound(res);

        // Delete from Cloudinary
        await deleteFromCloudinary(category.cloudinary_id);

        await categoryModel.findByIdAndDelete(id);
        return sendOk(res, "Category Deleted");
    } catch (error) {
        return sendServerError(res);
    }
};

module.exports = { create, read, getById, status, deleteById, readById, update };
