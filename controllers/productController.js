const categoryModel = require("../models/categoryModel");
const brandModel = require("../models/brandModel");
const productModel = require("../models/productModel");
const { createUniqueName } = require("../utils/helper");
const { sendBadRequest, sendCreated, sendNotFound, sendServerError, sendConflict, sendSuccess, sendOk } = require("../utils/response")
const fs = require("fs");
const colorModel = require("../models/colorModel");

const create = async (req, res) => {
    try {
        console.log(req.body)
        const { name, slug, orginal_price, discount_percent, final_price, short_description, long_description, categoryId, brandId, colorId } = req.body;
        const thumbnail = req.files.thumbnail;
        // console.log(image)
        if (!name || !slug || !thumbnail || !orginal_price || !discount_percent || !final_price || !short_description || !long_description || !categoryId || !brandId || !colorId) return sendBadRequest(res)

        const product = await productModel.findOne({ slug })
        if (product) return sendConflict(res)
        const img_name = createUniqueName(thumbnail.name)

        const destination = "./public/product/" + img_name
        thumbnail.mv(destination, async (err) => {
            // console.log(err)
            if (err) return sendServerError(res, "Unable to upload file")
            await productModel.create({ name, slug, orginal_price, discount_percent, final_price, short_description, long_description, categoryId, brandId, colorId: JSON.parse(colorId), thumbnail: img_name })
            return sendCreated(res)
        })

    } catch (error) {
        const message = error?.message || "Internal Server Error"
        return sendServerError(res, message)
    }
}

const read = async (req, res) => {

    const query = req.query;
    const filter = {}
    const sortFilter = {}
    const limit = parseInt(query.limit) || 20
    const page = query.page || 1
    const skip = ((page - 1) * limit)
    if (query.status) filter.status = query.status === "true";
    if (query.is_top) filter.is_top = query.is_top === "true";
    if (query.stock) filter.stock = query.stock === "true";
    if (query.id) filter._id = query.id;

    // category filter
    if (query.category_slug) {
        const category = await categoryModel.findOne({ slug: query.category_slug })
        if (!category) return sendNotFound(res, "Category not found")
        filter.categoryId = category._id
    }

    // brand filter
    if (query.brand_slug) {
        const brand = await brandModel.findOne({ slug: query.brand_slug })
        filter.brandId = brand._id
    }

    // color filter
    if (query.color_slug) {
        const color_slugs = query.color_slug.split(",")

        const colorId = [];
        for (let slug of color_slugs) {
            const color = await colorModel.findOne({ slug: slug.trim() });
            if(color){
                colorId.push(color._id);
            }
        }
        filter.colorId = {$in: colorId}
    }

    //price filter
    if(query.min_price && query.max_price){
        console.log("Query received:", query.min_price, query.max_price)
        filter.final_price = {
            $gte: parseInt(query.min_price),
            $lte: parseInt(query.max_price)
        }
        // console.log("Filter object:", filter)
    }

    // Sort Filter
    if(query.sort){
        if(query.sort === "asc"){
            sortFilter.final_price =1;
        }else if(query.sort === "desc"){
            sortFilter.final_price = -1
        }else{
            sortFilter.createdAt = -1
        }
    }

    const [total, product] = await Promise.all([
        productModel.find().countDocuments(),
        await productModel.find(filter).skip(skip).limit(limit).sort(sortFilter).populate([
            {
                select: "name _id slug",
                path: "categoryId"
            },
            {
                select: "name _id slug",
                path: "brandId"
            },
            {
                select: "name _id color_code slug",
                path: "colorId"
            }
        ])
    ])


    try {
        if (product) {
            return sendSuccess(res, "Product Find", product, {
                total,
                limit,
                pages: Math.ceil(total / limit),
                imageBaseUrl: "http://localhost:5000/product"
            })
        }
    } catch (error) {
        console.log(error)
        sendServerError(res)
    }
}

const add_images = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);

        if (!req.files || !req.files.images) return sendBadRequest(res, "No files were uploaded.");

        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
        let image_names = []

        for (let image of images) {
            const image_name = createUniqueName(image.name);
            const destination = `./public/product/${image_name}`;
            await image.mv(destination);
            image_names.push(image_name)
        }
        product.image.push(...image_names);
        await product.save();
        return sendSuccess(res, "Images added Successfully!", product)

    } catch (error) {
        return sendServerError(res)
    }
}

const delete_image = async (req, res) => {
    try {
        const { id } = req.params;
        const { image_name } = req.body;
        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);
        await productModel.findByIdAndDelete(id,
            {
                $pull: {
                    images: image_name
                }
            }
        );
        fs.unlink(`./public/product/${image_name}`, (err) => {
            if (err) console.log("Unable to delete file", err);
            return sendSuccess(res, "Image deleted Successfully!")
        })
    } catch (error) {
        return sendServerError(res)
    }
}

// const delete_image = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { image_name } = req.body;

//         const product = await productModel.findById(id);
//         if (!product) return sendNotFound(res);

//         // ✅ Only remove image from array
//         product.images = product.images.filter(img => img !== image_name);
//         await product.save();

//         // ✅ Delete file from folder
//         fs.unlink(`./public/product/${image_name}`, (err) => {
//             if (err) console.log("Unable to delete file", err);
//         });

//         return sendSuccess(res, "Image deleted Successfully!");
//     } catch (error) {
//         return sendServerError(res);
//     }
// };

const readById = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await productModel.findById(id)
            .populate([
                {
                    select: "name _id",
                    path: "categoryId"
                },
                {
                    select: "name _id",
                    path: "brandId"
                },
                {
                    select: "name _id color_code",
                    path: "colorId"
                }
            ])
        // const count = await categoryModel.countDocuments();
        if (product) {
            return sendSuccess(res, "Product Find", product, {
                imageBaseUrl: "http://localhost:5000/product"
            })
        }
    } catch (error) {
        sendServerError(res)
    }
}

// const update = async (req, res) => {
//     try {
//         const image = req.files && req.files.thumbnail ? req.files.thumbnail : null;
//         const id = req.params.id;

//         const product = await productModel.findById(id);
//         if (!product) return sendNotFound(res);

//         const object = {};

//         if (req.body.name) object.name = req.body.name;
//         if (req.body.slug) object.slug = req.body.slug;

//         if (image) {
//             const img = createUniqueName(image.name);
//             const destination = "./public/product/" + img;

//             await image.mv(destination);
//             object.image = img;
//         }

//         await productModel.updateOne(
//             { _id: id },
//             { $set: object }
//         );

//         return sendSuccess(res, "Product Updated Successfully!");
//     } catch (error) {
//         console.log(error);
//         return sendServerError(res);
//     }
// };

const update = async (req, res) => {
    try {
        const id = req.params.id;

        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);

        const thumbnail = req.files?.thumbnail;

        let object = {
            name: req.body.name,
            slug: req.body.slug,
            orginal_price: req.body.orginal_price,
            discount_percent: req.body.discount_percent,
            final_price: req.body.final_price,
            categoryId: req.body.categoryId,
            brandId: req.body.brandId,
            short_description: req.body.short_description,
            long_description: req.body.long_description,
        };

        if (req.body.colorId) {
            object.colorId = JSON.parse(req.body.colorId);
        }

        if (thumbnail) {
            const img = createUniqueName(thumbnail.name);
            await thumbnail.mv("./public/product/" + img);
            object.thumbnail = img;
        }

        await productModel.updateOne({ _id: id }, { $set: object });

        return sendSuccess(res, "Product Updated");
    } catch (err) {
        console.log(err)
        return sendServerError(res);
    }
};

const status = async (req, res) => {
    try {
        const { field } = req.body;
        const id = req.params.id;
        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);
        const msg = `${field} Updated successfully`
        await productModel.findByIdAndUpdate(id, {
            $set: {
                [field]: !product[field]
            }
        });

        return sendSuccess(res, msg);
    } catch (error) {
        console.log(error)
        sendServerError(res)
    }
}

const deleteById = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await productModel.findById(id);
        if (!product) return sendNotFound(res);
        await productModel.findByIdAndDelete(id)
        return sendOk(res, "Product Delete")

    } catch (error) {
        console.log(error)
        sendServerError(res)
    }
}

module.exports = {
    create, read, add_images, delete_image, update, readById, status, deleteById
}