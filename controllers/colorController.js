const colorModel = require("../models/colorModel");
const colorRouter = require("../routers/colorRouter");
const { sendBadRequest, sendCreated, sendNotFound, sendServerError, sendConflict, sendSuccess, sendOk } = require("../utils/response")

const create = async (req, res) => {
    try {
        const { name, slug, color_code } = req.body;
        if (!name || !slug || !color_code) return sendBadRequest(res)

        const color = await colorModel.findOne({ name })
        if (color) return sendConflict(res)

        await colorModel.create({ name, slug, color_code })
        return sendCreated(res)

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
        if (query.id) filter._id = query.id;

        const color = await colorModel.find(filter).limit(limit);
        const count = await colorModel.countDocuments();
        if (color) {
            return sendSuccess(res, "Color Find", color, {
                total: count
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
        const color = await colorModel.findById(id);
        if (color) {
            return sendSuccess(res, "Color Find", color, {
                imageBaseUrl: "http://localhost:5000/color"
            })
        }
    } catch (error) {
        sendServerError(res)
    }
}

const update = async (req, res) => {
    try {
        const id = req.params.id;

        const color = await colorModel.findById(id);
        if (!color) return sendNotFound(res);

        const object = {};

        if (req.body.name) object.name = req.body.name;
        if (req.body.slug) object.slug = req.body.slug;
        if (req.body.color_code) object.color_code = req.body.color_code;


        await colorModel.updateOne(
            { _id: id },
            { $set: object }
        );

        return sendSuccess(res, "Color Updated Successfully!");
    } catch (error) {
        console.log(error);
        return sendServerError(res);
    }
};

const getById = async (req, res) => {
    try {
        const id = req.params.id;
        const color = await colorModel.findById(id);
        if (color) {
            return sendSuccess(res, "Color Find", color)
        }
    } catch (error) {
        sendServerError(res)
    }
}

const status = async (req, res) => {
    try {
        const { field } = req.body;
        const id = req.params.id;
        const color = await colorModel.findById(id);
        if (!color) return sendNotFound(res);
        const msg = `${field} Updated successfully`
        await colorModel.findByIdAndUpdate(id, {
            $set: {
                [field]: !color[field]
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
        const color = await colorModel.findById(id);
        if (!color) return sendNotFound(res);
        await colorModel.findByIdAndDelete(id)
        return sendOk(res, "Color Delete")

    } catch (error) {
        sendServerError(res)
    }
}

module.exports = {
    create, read, getById, status, deleteById, update
    , readById
}