const categoryModel = require("../models/categoryModel");
const brandModel    = require("../models/brandModel");
const productModel  = require("../models/productModel");
const colorModel    = require("../models/colorModel");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");
const {
    sendBadRequest, sendCreated, sendNotFound,
    sendServerError, sendConflict, sendSuccess, sendOk
} = require("../utils/response");

// ─── Create Product ──────────────────────────────────────────────────────────
const create = async (req, res) => {
    try {
        const {
            name, slug, orginal_price, discount_percent, discount_percentage,
            final_price, short_description, long_description, categoryId, brandId, colorId
        } = req.body;

        const discount = Number(discount_percentage ?? discount_percent);

        if (
            !name || !slug || !req.file || !orginal_price || Number.isNaN(discount) ||
            !final_price || !short_description || !long_description ||
            !categoryId || !brandId || !colorId
        ) {
            return sendBadRequest(res, "All fields including thumbnail are required");
        }

        const existing = await productModel.findOne({ slug });
        if (existing) return sendConflict(res);

        const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer, "ishop/product");

        await productModel.create({
            name, slug, orginal_price,
            discount_percentage: discount,
            final_price,
            short_description, long_description,
            categoryId, brandId,
            colorId:      JSON.parse(colorId),
            thumbnail:    secure_url,
            cloudinary_id: public_id,
        });

        return sendCreated(res);
    } catch (error) {
        console.error("product create error:", error);
        return sendServerError(res, error.message);
    }
};

// ─── Read Products (list) ─────────────────────────────────────────────────────
const read = async (req, res) => {
    try {
        const query = req.query;
        const filter = {};
        const sortFilter = {};
        const limit = parseInt(query.limit) || 20;
        const page  = parseInt(query.page)  || 1;
        const skip  = (page - 1) * limit;

        if (query.status) filter.status = query.status === "true";
        if (query.is_top || query.top_selling) {
            filter.top_selling = (query.is_top || query.top_selling) === "true";
        }
        if (query.stock)  filter.stock  = query.stock  === "true";
        if (query.id)     filter._id    = query.id;

        if (query.category_slug) {
            const category = await categoryModel.findOne({ slug: query.category_slug });
            if (!category) return sendNotFound(res, "Category not found");
            filter.categoryId = category._id;
        }

        if (query.brand_slug) {
            const brand = await brandModel.findOne({ slug: query.brand_slug });
            if (brand) filter.brandId = brand._id;
        }

        if (query.color_slug) {
            const slugs   = query.color_slug.split(",");
            const colorIds = [];
            for (const s of slugs) {
                const color = await colorModel.findOne({ slug: s.trim() });
                if (color) colorIds.push(color._id);
            }
            filter.colorId = { $in: colorIds };
        }

        if (query.min_price || query.max_price) {
            filter.final_price = {};
            if (query.min_price) filter.final_price.$gte = parseInt(query.min_price, 10) || 0;
            if (query.max_price) filter.final_price.$lte = parseInt(query.max_price, 10) || Number.MAX_SAFE_INTEGER;
        }

        const searchTerm = (query.q || query.search || "").trim();
        if (searchTerm) {
            const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            filter.$or = [
                { name: { $regex: escaped, $options: "i" } },
                { slug: { $regex: escaped, $options: "i" } },
                { short_description: { $regex: escaped, $options: "i" } },
            ];
        }

        if (query.slug) {
            filter.slug = query.slug;
        }

        if (query.sort === "asc")  sortFilter.final_price =  1;
        else if (query.sort === "desc") sortFilter.final_price = -1;
        else sortFilter.createdAt = -1;

        const [total, product] = await Promise.all([
            productModel.countDocuments(filter),
            productModel.find(filter).skip(skip).limit(limit).sort(sortFilter).populate([
                { path: "categoryId", select: "name _id slug" },
                { path: "brandId",    select: "name _id slug" },
                { path: "colorId",    select: "name _id color_code slug" },
            ]),
        ]);

        return sendSuccess(res, "Product Find", product, {
            total, limit, page,
            pages: Math.ceil(total / limit) || 0,
            imageBaseUrl: "",
        });
    } catch (error) {
        console.error("product read error:", error);
        return sendServerError(res);
    }
};

// ─── Read Product By Slug ─────────────────────────────────────────────────────
const readBySlug = async (req, res) => {
    try {
        const product = await productModel.findOne({ slug: req.params.slug }).populate([
            { path: "categoryId", select: "name _id slug" },
            { path: "brandId",    select: "name _id slug" },
            { path: "colorId",    select: "name _id color_code slug" },
        ]);
        if (!product) return sendNotFound(res, "Product not found");
        return sendSuccess(res, "Product Find", product, { imageBaseUrl: "" });
    } catch (error) {
        return sendServerError(res);
    }
};

// ─── Read Product By ID ───────────────────────────────────────────────────────
const readById = async (req, res) => {
    try {
        const product = await productModel.findById(req.params.id).populate([
            { path: "categoryId", select: "name _id slug" },
            { path: "brandId",    select: "name _id slug" },
            { path: "colorId",    select: "name _id color_code slug" },
        ]);
        if (!product) return sendNotFound(res);
        return sendSuccess(res, "Product Find", product, { imageBaseUrl: "" });
    } catch (error) {
        return sendServerError(res);
    }
};

// ─── Add Extra Images (gallery) ──────────────────────────────────────────────
const add_images = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);

        if (!req.files || req.files.length === 0) {
            return sendBadRequest(res, "No files were uploaded.");
        }

        const uploadedUrls = [];
        for (const file of req.files) {
            const { secure_url } = await uploadToCloudinary(file.buffer, "ishop/product");
            uploadedUrls.push(secure_url);
        }

        product.image.push(...uploadedUrls);
        await product.save();

        return sendSuccess(res, "Images added successfully!", product);
    } catch (error) {
        console.error("add_images error:", error);
        return sendServerError(res);
    }
};

// ─── Delete Gallery Image ─────────────────────────────────────────────────────
const delete_image = async (req, res) => {
    try {
        const { id } = req.params;
        const { image_url } = req.body; // now a full Cloudinary URL or public_id

        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);

        // Remove from array
        product.image = product.image.filter((img) => img !== image_url);
        await product.save();

        return sendSuccess(res, "Image deleted successfully!");
    } catch (error) {
        return sendServerError(res);
    }
};

// ─── Update Product ───────────────────────────────────────────────────────────
const update = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);

        const discount = req.body.discount_percentage ?? req.body.discount_percent;
        const object = {
            name:              req.body.name,
            slug:              req.body.slug,
            orginal_price:     req.body.orginal_price,
            discount_percentage: discount,
            final_price:       req.body.final_price,
            categoryId:        req.body.categoryId,
            brandId:           req.body.brandId,
            short_description: req.body.short_description,
            long_description:  req.body.long_description,
        };

        if (req.body.colorId) {
            object.colorId = JSON.parse(req.body.colorId);
        }

        if (req.file) {
            // Delete old thumbnail from Cloudinary
            await deleteFromCloudinary(product.cloudinary_id);

            const { secure_url, public_id } = await uploadToCloudinary(req.file.buffer, "ishop/product");
            object.thumbnail    = secure_url;
            object.cloudinary_id = public_id;
        }

        await productModel.updateOne({ _id: id }, { $set: object });
        return sendSuccess(res, "Product Updated");
    } catch (error) {
        console.error("product update error:", error);
        return sendServerError(res);
    }
};

// ─── Status Toggle ────────────────────────────────────────────────────────────
const ALLOWED_STATUS_FIELDS = new Set(["status", "stock", "top_selling"]);

const status = async (req, res) => {
    try {
        const { field } = req.body;
        if (!ALLOWED_STATUS_FIELDS.has(field)) {
            return sendBadRequest(res, "Invalid status field");
        }
        const id = req.params.id;
        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);

        await productModel.findByIdAndUpdate(id, { $set: { [field]: !product[field] } });
        return sendSuccess(res, `${field} Updated successfully`);
    } catch (error) {
        console.error("product status error:", error);
        return sendServerError(res);
    }
};

// ─── Delete Product ───────────────────────────────────────────────────────────
const deleteById = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);

        // Delete thumbnail from Cloudinary
        await deleteFromCloudinary(product.cloudinary_id);

        await productModel.findByIdAndDelete(id);
        return sendOk(res, "Product Deleted");
    } catch (error) {
        console.error("product delete error:", error);
        return sendServerError(res);
    }
};

module.exports = { create, read, add_images, delete_image, update, readById, readBySlug, status, deleteById };
