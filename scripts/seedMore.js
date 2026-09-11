/**
 * Add 5 more categories, brands, colors, and products.
 * Usage: node scripts/seedMore.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const https = require("https");
const http = require("http");

const categoryModel = require("../models/categoryModel");
const brandModel = require("../models/brandModel");
const colorModel = require("../models/colorModel");
const productModel = require("../models/productModel");
const { uploadToCloudinary } = require("../utils/cloudinary");

function downloadBuffer(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        client
            .get(url, { headers: { "User-Agent": "ishop-seed/1.0" } }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    downloadBuffer(res.headers.location).then(resolve).catch(reject);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`Download failed ${res.statusCode} for ${url}`));
                    return;
                }
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => resolve(Buffer.concat(chunks)));
            })
            .on("error", reject);
    });
}

async function uploadFromUrl(url, folder) {
    const buffer = await downloadBuffer(url);
    return uploadToCloudinary(buffer, folder);
}

async function upsertCategory(item) {
    let doc = await categoryModel.findOne({ slug: item.slug });
    if (doc) return doc;
    console.log("  + category", item.name);
    const { secure_url, public_id } = await uploadFromUrl(item.imageUrl, "ishop/category");
    return categoryModel.create({
        name: item.name,
        slug: item.slug,
        image: secure_url,
        cloudinary_id: public_id,
        status: true,
        is_home: true,
        is_top: true,
        is_popular: true,
    });
}

async function upsertBrand(item, categoryId) {
    let doc = await brandModel.findOne({ slug: item.slug });
    if (doc) return doc;
    console.log("  + brand", item.name);
    const { secure_url, public_id } = await uploadFromUrl(item.imageUrl, "ishop/brand");
    return brandModel.create({
        name: item.name,
        slug: item.slug,
        image: secure_url,
        cloudinary_id: public_id,
        status: true,
        is_home: true,
        is_top: true,
        is_popular: true,
        categoryId: [categoryId],
    });
}

async function upsertColor(item) {
    let doc = await colorModel.findOne({ slug: item.slug });
    if (doc) return doc;
    try {
        console.log("  + color", item.name);
        return await colorModel.create(item);
    } catch (err) {
        doc = await colorModel.findOne({
            $or: [{ slug: item.slug }, { color_code: item.color_code }, { name: item.name }],
        });
        if (!doc) throw err;
        return doc;
    }
}

async function upsertProduct(item, categoryId, brandId, colorIds) {
    let doc = await productModel.findOne({ slug: item.slug });
    if (doc) {
        console.log("  · skip product", item.name);
        return doc;
    }
    console.log("  + product", item.name);
    const { secure_url, public_id } = await uploadFromUrl(item.imageUrl, "ishop/product");
    const discount = item.discount_percentage;
    const final_price = Math.round(item.orginal_price * (1 - discount / 100));
    return productModel.create({
        name: item.name,
        slug: item.slug,
        short_description: item.short_description,
        long_description: item.long_description,
        orginal_price: item.orginal_price,
        discount_percentage: discount,
        final_price,
        categoryId,
        brandId,
        colorId: colorIds,
        thumbnail: secure_url,
        cloudinary_id: public_id,
        stock: true,
        top_selling: true,
        status: true,
    });
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected\n");

    const colors = [
        { name: "Red", slug: "red", color_code: "#EF4444", status: true },
        { name: "Green", slug: "green", color_code: "#22C55E", status: true },
        { name: "Gold", slug: "gold", color_code: "#F59E0B", status: true },
        { name: "Purple", slug: "purple", color_code: "#A855F7", status: true },
        { name: "Gray", slug: "gray", color_code: "#6B7280", status: true },
    ];

    const categories = [
        { name: "Cameras", slug: "cameras", imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80" },
        { name: "Tablets", slug: "tablets", imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&q=80" },
        { name: "Smartwatches", slug: "smartwatches", imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80" },
        { name: "Speakers", slug: "speakers", imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80" },
        { name: "Keyboards", slug: "keyboards", imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80" },
    ];

    const brands = [
        { name: "Dell", slug: "dell", imageUrl: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=600&q=80" },
        { name: "HP", slug: "hp-brand", imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80" },
        { name: "Lenovo", slug: "lenovo", imageUrl: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&q=80" },
        { name: "OnePlus", slug: "oneplus", imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80" },
        { name: "Xiaomi", slug: "xiaomi", imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80" },
    ];

    console.log("Colors...");
    for (const c of colors) await upsertColor(c);

    console.log("Categories...");
    const categoryDocs = [];
    for (const c of categories) categoryDocs.push(await upsertCategory(c));

    console.log("Brands...");
    for (const b of brands) await upsertBrand(b, categoryDocs[0]._id);

    const allCats = await categoryModel.find({});
    const allBrands = await brandModel.find({});
    const allColors = await colorModel.find({}).limit(4);
    const bySlug = (arr, slug) => arr.find((x) => x.slug === slug);

    const products = [
        {
            name: "Canon EOS R50",
            slug: "canon-eos-r50",
            category: "cameras",
            brand: "sony",
            orginal_price: 78990,
            discount_percentage: 10,
            short_description: "Compact mirrorless camera for creators.",
            long_description: "24.2MP APS-C sensor with 4K video and RF mount lenses.",
            imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
        },
        {
            name: "iPad Air M2",
            slug: "ipad-air-m2",
            category: "tablets",
            brand: "apple",
            orginal_price: 59900,
            discount_percentage: 6,
            short_description: "Thin powerful tablet with M2 chip.",
            long_description: "11-inch Liquid Retina display, Apple Pencil Pro support.",
            imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80",
        },
        {
            name: "Galaxy Watch 6",
            slug: "galaxy-watch-6",
            category: "smartwatches",
            brand: "samsung",
            orginal_price: 32999,
            discount_percentage: 14,
            short_description: "Advanced health tracking smartwatch.",
            long_description: "Sleep coaching, body composition, and Wear OS features.",
            imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
        },
        {
            name: "Sony SRS-XB43",
            slug: "sony-srs-xb43",
            category: "speakers",
            brand: "sony",
            orginal_price: 18990,
            discount_percentage: 15,
            short_description: "Extra bass portable Bluetooth speaker.",
            long_description: "Waterproof design with long battery life and party lights.",
            imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80",
        },
        {
            name: "Logitech MX Keys",
            slug: "logitech-mx-keys",
            category: "keyboards",
            brand: "dell",
            orginal_price: 12995,
            discount_percentage: 12,
            short_description: "Premium wireless illuminated keyboard.",
            long_description: "Perfect stroke keys, multi-device pairing, quiet typing.",
            imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80",
        },
    ];

    console.log("Products...");
    for (const p of products) {
        const cat = bySlug(allCats, p.category) || allCats[0];
        const br = bySlug(allBrands, p.brand) || allBrands[0];
        await upsertProduct(
            p,
            cat._id,
            br._id,
            allColors.map((c) => c._id).slice(0, 2)
        );
    }

    const counts = {
        products: await productModel.countDocuments(),
        categories: await categoryModel.countDocuments(),
        brands: await brandModel.countDocuments(),
        colors: await colorModel.countDocuments(),
    };
    console.log("\n✅ Done:", counts);
    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error("❌", err.message);
    try {
        await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
});
