/**
 * Seed categories, brands, colors, and products with images.
 *
 * Usage: node scripts/seedProducts.js
 *
 * Uses Cloudinary when configured; otherwise saves images locally under public/uploads.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const https = require("https");
const http = require("http");

const categoryModel = require("../models/categoryModel");
const brandModel = require("../models/brandModel");
const colorModel = require("../models/colorModel");
const productModel = require("../models/productModel");
const { uploadToCloudinary, CLOUDINARY_CONFIGURED } = require("../utils/cloudinary");

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

    console.log(`  ↑ Cloudinary category: ${item.name}`);
    const { secure_url, public_id } = await uploadFromUrl(item.imageUrl, "ishop/category");
    doc = await categoryModel.create({
        name: item.name,
        slug: item.slug,
        image: secure_url,
        cloudinary_id: public_id,
        status: true,
        is_home: true,
        is_top: true,
        is_popular: true,
    });
    return doc;
}

async function upsertBrand(item, categoryId) {
    let doc = await brandModel.findOne({ slug: item.slug });
    if (doc) return doc;

    console.log(`  ↑ Cloudinary brand: ${item.name}`);
    const { secure_url, public_id } = await uploadFromUrl(item.imageUrl, "ishop/brand");
    doc = await brandModel.create({
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
    return doc;
}

async function upsertColor(item) {
    let doc = await colorModel.findOne({ slug: item.slug });
    if (doc) return doc;
    try {
        doc = await colorModel.create(item);
    } catch (err) {
        doc = await colorModel.findOne({
            $or: [{ slug: item.slug }, { color_code: item.color_code }, { name: item.name }],
        });
        if (!doc) throw err;
    }
    return doc;
}

async function upsertProduct(item, categoryId, brandId, colorIds) {
    let doc = await productModel.findOne({ slug: item.slug });
    if (doc) {
        console.log(`  · skip existing product: ${item.name}`);
        return doc;
    }

    console.log(`  ↑ Cloudinary product: ${item.name}`);
    const { secure_url, public_id } = await uploadFromUrl(item.imageUrl, "ishop/product");
    const discount = item.discount_percentage;
    const final_price = Math.round(item.orginal_price * (1 - discount / 100));

    doc = await productModel.create({
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
        top_selling: item.top_selling !== false,
        status: true,
    });
    return doc;
}

async function main() {
    if (!CLOUDINARY_CONFIGURED) {
        console.log("ℹ️  Cloudinary not set — images will be saved locally under public/uploads\n");
    } else {
        console.log("ℹ️  Using Cloudinary for image uploads\n");
    }

    if (!process.env.MONGODB_URL) {
        console.error("❌ MONGODB_URL missing");
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("✅ Connected to MongoDB\n");

    const categories = [
        {
            name: "Laptops",
            slug: "laptops",
            imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80",
        },
        {
            name: "Smartphones",
            slug: "smartphones",
            imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80",
        },
        {
            name: "Headphones",
            slug: "headphones",
            imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
        },
        {
            name: "Monitors",
            slug: "monitors",
            imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&q=80",
        },
    ];

    const brands = [
        {
            name: "Apple",
            slug: "apple",
            imageUrl: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&q=80",
        },
        {
            name: "Samsung",
            slug: "samsung",
            imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&q=80",
        },
        {
            name: "Sony",
            slug: "sony",
            imageUrl: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600&q=80",
        },
    ];

    const colors = [
        { name: "Black", slug: "black", color_code: "#000000", status: true },
        { name: "Silver", slug: "silver", color_code: "#C0C0C0", status: true },
        { name: "Blue", slug: "blue", color_code: "#2563EB", status: true },
        { name: "White", slug: "white", color_code: "#FFFFFF", status: true },
    ];

    console.log("Seeding colors...");
    const colorDocs = [];
    for (const c of colors) colorDocs.push(await upsertColor(c));

    console.log("Seeding categories...");
    const categoryDocs = [];
    for (const c of categories) categoryDocs.push(await upsertCategory(c));

    console.log("Seeding brands...");
    const brandDocs = [];
    for (const b of brands) brandDocs.push(await upsertBrand(b, categoryDocs[0]._id));

    const bySlug = (arr, slug) => arr.find((x) => x.slug === slug);

    const products = [
        {
            name: "MacBook Air M2",
            slug: "macbook-air-m2",
            category: "laptops",
            brand: "apple",
            orginal_price: 114900,
            discount_percentage: 8,
            short_description: "Lightweight laptop with Apple M2 chip.",
            long_description: "13.6-inch Liquid Retina display, all-day battery, fanless design.",
            imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
            top_selling: true,
        },
        {
            name: "Galaxy Book4 Pro",
            slug: "galaxy-book4-pro",
            category: "laptops",
            brand: "samsung",
            orginal_price: 129999,
            discount_percentage: 10,
            short_description: "Premium AMOLED Windows laptop.",
            long_description: "Dynamic AMOLED 2X touchscreen with Intel Core Ultra performance.",
            imageUrl: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800&q=80",
            top_selling: true,
        },
        {
            name: "iPhone 15 Pro",
            slug: "iphone-15-pro",
            category: "smartphones",
            brand: "apple",
            orginal_price: 134900,
            discount_percentage: 5,
            short_description: "Titanium iPhone with A17 Pro.",
            long_description: "48MP camera system, USB-C, Action Button, ProMotion display.",
            imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80",
            top_selling: true,
        },
        {
            name: "Galaxy S24 Ultra",
            slug: "galaxy-s24-ultra",
            category: "smartphones",
            brand: "samsung",
            orginal_price: 129999,
            discount_percentage: 12,
            short_description: "Flagship Android with S Pen.",
            long_description: "200MP camera, AI features, bright Dynamic AMOLED display.",
            imageUrl: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
            top_selling: true,
        },
        {
            name: "Sony WH-1000XM5",
            slug: "sony-wh-1000xm5",
            category: "headphones",
            brand: "sony",
            orginal_price: 29990,
            discount_percentage: 15,
            short_description: "Industry-leading noise cancelling headphones.",
            long_description: "30-hour battery, multipoint Bluetooth, crystal clear calls.",
            imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=800&q=80",
            top_selling: true,
        },
        {
            name: "Sony Inzone M9",
            slug: "sony-inzone-m9",
            category: "monitors",
            brand: "sony",
            orginal_price: 89990,
            discount_percentage: 9,
            short_description: "4K 144Hz HDR gaming monitor.",
            long_description: "Full Array Local Dimming, HDMI 2.1, perfect for consoles and PCs.",
            imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80",
            top_selling: false,
        },
        {
            name: "AirPods Max",
            slug: "airpods-max",
            category: "headphones",
            brand: "apple",
            orginal_price: 59900,
            discount_percentage: 7,
            short_description: "Premium over-ear Apple headphones.",
            long_description: "Spatial Audio, Adaptive EQ, high-fidelity audio with ANC.",
            imageUrl: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&q=80",
            top_selling: true,
        },
        {
            name: "Samsung Odyssey G7",
            slug: "samsung-odyssey-g7",
            category: "monitors",
            brand: "samsung",
            orginal_price: 54990,
            discount_percentage: 11,
            short_description: "Curved QHD 240Hz gaming monitor.",
            long_description: "1000R curve, HDR600, ultra-fast response for competitive play.",
            imageUrl: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80",
            top_selling: true,
        },
    ];

    console.log("Seeding products...");
    for (const p of products) {
        const category = bySlug(categoryDocs, p.category);
        const brand = bySlug(brandDocs, p.brand);
        await upsertProduct(
            p,
            category._id,
            brand._id,
            colorDocs.slice(0, 2).map((c) => c._id)
        );
    }

    const counts = {
        products: await productModel.countDocuments(),
        categories: await categoryModel.countDocuments(),
        brands: await brandModel.countDocuments(),
        colors: await colorModel.countDocuments(),
    };

    console.log("\n✅ Seed complete:", counts);
    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error("\n❌ Seed failed:", err.message);
    try {
        await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
});
