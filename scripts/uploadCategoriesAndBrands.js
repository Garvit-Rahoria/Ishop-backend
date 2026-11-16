require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const categoryModel = require('./models/categoryModel');
const brandModel = require('./models/brandModel');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function uploadFileToCloudinary(filePath, folder) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Categories
    const categories = await categoryModel.find({});
    console.log(`Found ${categories.length} categories.`);
    for (const cat of categories) {
      if (cat.image && cat.image.includes('localhost:5000')) {
        const filename = path.basename(cat.image);
        const localPath = path.join(__dirname, 'public/uploads/ishop/category', filename);
        if (fs.existsSync(localPath)) {
          console.log(`Uploading Category "${cat.name}" from ${filename}...`);
          const res = await uploadFileToCloudinary(localPath, 'ishop/category');
          cat.image = res.secure_url;
          cat.cloudinary_id = res.public_id;
          await cat.save();
          console.log(`  -> Saved: ${res.secure_url}`);
        } else {
          console.warn(`  File not found locally for category ${cat.name}: ${localPath}`);
        }
      } else {
        console.log(`Category "${cat.name}" already has remote URL: ${cat.image}`);
      }
    }

    // 2. Brands
    const brands = await brandModel.find({});
    console.log(`\nFound ${brands.length} brands.`);
    for (const brd of brands) {
      if (brd.image && brd.image.includes('localhost:5000')) {
        const filename = path.basename(brd.image);
        const localPath = path.join(__dirname, 'public/uploads/ishop/brand', filename);
        if (fs.existsSync(localPath)) {
          console.log(`Uploading Brand "${brd.name}" from ${filename}...`);
          const res = await uploadFileToCloudinary(localPath, 'ishop/brand');
          brd.image = res.secure_url;
          brd.cloudinary_id = res.public_id;
          await brd.save();
          console.log(`  -> Saved: ${res.secure_url}`);
        } else {
          console.warn(`  File not found locally for brand ${brd.name}: ${localPath}`);
        }
      } else {
        console.log(`Brand "${brd.name}" already has remote URL: ${brd.image}`);
      }
    }

    console.log('\n🎉 ALL CATEGORIES AND BRANDS UPDATED WITH CLOUDINARY HTTPS URLS!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
