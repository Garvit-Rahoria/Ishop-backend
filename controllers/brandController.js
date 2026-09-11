const brandModel = require("../models/brandModel");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");
const {
    sendBadRequest, sendCreated, sendNotFound,
    sendServerError, sendConflict, sendSuccess, sendOk
} = require("../utils/response");

const create = async (req, res) => {
    try {
        const { name, slug, categoryId } = req.body;

        if (!name || !slug || !req.file || !categoryId) {
            return sendBadRequest(res, "name, slug, categoryId and image are required");
        }

        const existing = await brandModel.findOne({ name });
        if (existing) return sendConflict(res);

        const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer, "ishop/brand");

        await brandModel.create({
            name,
            slug,
            image:        secure_url,
            cloudinary_id: public_id,
            categoryId:   JSON.parse(categoryId),
        });

        return sendCreated(res);
    } catch (error) {
        console.error("brand create error:", error);
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

        const [brand, count] = await Promise.all([
            brandModel.find(filter).limit(limit).populate("categoryId"),
            brandModel.countDocuments(),
        ]);

        return sendSuccess(res, "Brand Find", brand, { total: count, imageBaseUrl: "" });
    } catch (error) {
        console.error("brand read error:", error);
        return sendServerError(res);
    }
};

const readById = async (req, res) => {
    try {
        const brand = await brandModel.findById(req.params.id);
        if (!brand) return sendNotFound(res);
        return sendSuccess(res, "Brand Find", brand, { imageBaseUrl: "" });
    } catch (error) {
        return sendServerError(res);
    }
};

const update = async (req, res) => {
    try {
        const id = req.params.id;
        const brand = await brandModel.findById(id);
        if (!brand) return sendNotFound(res);

        const object = {};
        if (req.body.name) object.name = req.body.name;
        if (req.body.slug) object.slug = req.body.slug;

        if (req.body.categoryId) {
            object.categoryId = Array.isArray(req.body.categoryId)
                ? req.body.categoryId
                : [req.body.categoryId];
        }

        if (req.file) {
            await deleteFromCloudinary(brand.cloudinary_id);

            const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer, "ishop/brand");
            object.image        = secure_url;
            object.cloudinary_id = public_id;
        }

        await brandModel.updateOne({ _id: id }, { $set: object });
        return sendSuccess(res, "Brand Updated Successfully!");
    } catch (error) {
        console.error("brand update error:", error);
        return sendServerError(res);
    }
};

const getById = async (req, res) => {
    try {
        const brand = await brandModel.findById(req.params.id);
        if (!brand) return sendNotFound(res);
        return sendSuccess(res, "Brand Find", brand);
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
        const brand = await brandModel.findById(id);
        if (!brand) return sendNotFound(res);

        await brandModel.findByIdAndUpdate(id, { $set: { [field]: !brand[field] } });
        return sendSuccess(res, `${field} Updated successfully`);
    } catch (error) {
        return sendServerError(res);
    }
};

const deleteById = async (req, res) => {
    try {
        const id = req.params.id;
        const brand = await brandModel.findById(id);
        if (!brand) return sendNotFound(res);

        await deleteFromCloudinary(brand.cloudinary_id);

        await brandModel.findByIdAndDelete(id);
        return sendOk(res, "Brand Deleted");
    } catch (error) {
        return sendServerError(res);
    }
};

module.exports = { create, read, getById, status, deleteById, update, readById };
