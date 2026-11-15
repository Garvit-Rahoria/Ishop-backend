require('dotenv').config();
const https = require('https');
const http = require('http');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const items = [
  {
    id: 'hp_15s_official',
    url: 'https://hp.widen.net/content/y0gfywlgdd/png/y0gfywlgdd.png?dpi=72&w=800'
  },
  {
    id: 'dell_inspiron_official',
    url: 'https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/page/franchise/inspiron/inpsiron-franchise-migration/png/in5630t-in7430t-fnb-sl-nonfpr-1920x1440.png?qlt=90&fit=constrain,1&hei=800&wid=1000&fmt=png-alpha'
  },
  {
    id: 'oneplus_nord_ce4_official',
    url: 'https://oasis.opstatics.com/content/dam/oasis/page/2024/camry/specs/1080-1080blue.png'
  },
  {
    id: 'samsung_galaxy_a55_official',
    url: 'https://images.samsung.com/is/image/samsung/p6pim/in/sm-a556elbhins/gallery/in-galaxy-a55-5g-sm-a556-sm-a556elbhins-540254042?$720_576_JPG$'
  },
  {
    id: 'oneplus_bullets_z2_official',
    url: 'https://www.oneplus.in/content/dam/oasis/page/2022/operation/mar/3-28/in-bullets/1920/new-KV_L.jpg'
  },
  {
    id: 'sony_wh_ch720n_official',
    url: 'https://sony.scene7.com/is/image/sonyglobalsolutions/wh-ch720_Primary_image?fmt=png-alpha&wid=800'
  },
  {
    id: 'dell_24_monitor_official',
    url: 'https://i.dell.com/is/image/DellContent//content/dam/ss2/product-images/dell-client-products/peripherals/monitors/s-series/se2422h/pdp/se2422h_monitor_pdp_slices_gallery_hero.jpg'
  },
  {
    id: 'samsung_odyssey_g5_official',
    url: 'https://images.samsung.com/is/image/samsung/p6pim/in/ls27cg550ewxxl/gallery/in-odyssey-g5-g55c-ls27cg550ewxxl-541041256?$1164_776_PNG$'
  },
  {
    id: 'xiaomi_360_camera_official',
    url: 'https://i02.appmifile.com/mi-com-product/fly-birds/m/xiaomi-smart-camera-c300/46a2c7b1ff8dfbe43f33e89eae8ed760.jpg'
  },
  {
    id: 'sony_zve10_camera_official',
    url: 'https://www.sony.co.in/image/2790448bfb2a44a12c6ed9022f5a3fbb?fmt=png-alpha&wid=1000'
  },
  {
    id: 'lenovo_tab_m11_official',
    url: 'https://psrefstuff.lenovo.com/syspool/Sys/Image/Lenovo_Tablets/Tab_M11/Compressedimage/Tab_M11_CT4_05.png'
  },
  {
    id: 'apple_ipad_10th_official',
    url: 'https://store.storeimages.cdn-apple.com/1/as-images.apple.com/is/ipad-model-unselect-gallery-1-202503_GEO_EMEA_FMT_WHH?wid=1000&fmt=jpeg&qlt=85'
  },
  {
    id: 'xiaomi_redmi_watch4_official',
    url: 'https://i02.appmifile.com/mi-com-product/fly-birds/redmi-watch-4/M/c9d428970d691d3c9bc1514178143aca.jpg'
  },
  {
    id: 'apple_watch_se_official',
    url: 'https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/MXP42_VW_PF+watch-40-alum-gold-nc-5s_VW_PF_WF_CO?wid=700&hei=700&fmt=jpeg&qlt=95'
  },
  {
    id: 'xiaomi_sound_pocket_official',
    url: 'https://i02.appmifile.com/mi-com-product/fly-birds/xiaomi-sound-pocket/M/xiaomiyxnb_mm.jpg'
  },
  {
    id: 'sony_srs_xe200_official',
    url: 'https://www.sony.com/image/0922dfcdf5a0f9ebbda721f3a10b9aec?fmt=png-alpha&wid=800'
  },
  {
    id: 'lenovo_wireless_combo_official',
    url: 'https://download.lenovo.com/km/media/images/ACC500323/Lenovo%20Essential%20Wireless%20Combo%20Keyboard%20Mouse%20Gen2%20Black_20240103060525188.png'
  },
  {
    id: 'hp_omen_encoder_official',
    url: 'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6421/6421508_sd.jpg'
  }
];

function download(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Status ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error(`Timeout for ${url}`));
    });
  });
}

function uploadStream(buffer, public_id) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'ishop/product',
        public_id,
        overwrite: true,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function run() {
  const results = {};
  for (const item of items) {
    try {
      console.log(`Downloading ${item.id} from ${item.url.slice(0, 60)}...`);
      const buf = await download(item.url);
      console.log(`  Downloaded ${buf.length} bytes, uploading to Cloudinary...`);
      const res = await uploadStream(buf, item.id);
      results[item.id] = res.secure_url;
      console.log(`  SUCCESS: ${item.id} -> ${res.secure_url}`);
    } catch (err) {
      console.error(`  FAILED: ${item.id} - ${err.message}`);
    }
  }
  console.log('\nFINAL MAPPING:');
  console.log(JSON.stringify(results, null, 2));
}

run();

