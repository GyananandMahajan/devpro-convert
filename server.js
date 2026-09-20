const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: '*' })); // In production, restrict to your domain
app.use(express.json());

// Temp upload folder
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = uuidv4() + path.extname(file.originalname);
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB limit
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Devproo Convert Backend is running', version: '1.0.0' });
});

// Main process endpoint
app.post('/api/process', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const operation = req.body.operation;
  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();

  try {
    let resultBuffer;
    let outputFilename;
    let contentType;

    // ========== IMAGE OPERATIONS ==========
    if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.svg', '.ico'].includes(ext) ||
        req.file.mimetype.startsWith('image/')) {

      const image = sharp(filePath);

      switch (operation) {
        case 'jpg':
          resultBuffer = await image.jpeg({ quality: 90 }).toBuffer();
          outputFilename = originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'png':
          resultBuffer = await image.png().toBuffer();
          outputFilename = originalName.replace(ext, '.png');
          contentType = 'image/png';
          break;

        case 'webp':
          resultBuffer = await image.webp({ quality: 85 }).toBuffer();
          outputFilename = originalName.replace(ext, '.webp');
          contentType = 'image/webp';
          break;

        case 'gif':
          resultBuffer = await image.gif().toBuffer();
          outputFilename = originalName.replace(ext, '.gif');
          contentType = 'image/gif';
          break;

        case 'bmp':
          // Sharp doesn't support BMP output well, convert to PNG instead
          resultBuffer = await image.png().toBuffer();
          outputFilename = originalName.replace(ext, '.png');
          contentType = 'image/png';
          break;

        case 'compress':
          resultBuffer = await image.jpeg({ quality: 60, mozjpeg: true }).toBuffer();
          outputFilename = 'compressed_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'resize':
          // Default resize to max 1200px width (you can make this dynamic later)
          resultBuffer = await image.resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
          outputFilename = 'resized_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'rotate-img':
          resultBuffer = await image.rotate(90).jpeg({ quality: 90 }).toBuffer();
          outputFilename = 'rotated_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'flip':
          resultBuffer = await image.flip().jpeg({ quality: 90 }).toBuffer();
          outputFilename = 'flipped_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'grayscale':
          resultBuffer = await image.grayscale().jpeg({ quality: 90 }).toBuffer();
          outputFilename = 'grayscale_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'blur':
          resultBuffer = await image.blur(5).jpeg({ quality: 90 }).toBuffer();
          outputFilename = 'blurred_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'sharpen':
          resultBuffer = await image.sharpen().jpeg({ quality: 90 }).toBuffer();
          outputFilename = 'sharpened_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'invert':
          resultBuffer = await image.negate().jpeg({ quality: 90 }).toBuffer();
          outputFilename = 'inverted_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
          break;

        case 'pdf':
          // Convert image to single-page PDF
          const imgBuffer = await image.png().toBuffer();
          const pdfDoc = await PDFDocument.create();
          const pngImage = await pdfDoc.embedPng(imgBuffer);
          const page = pdfDoc.addPage([pngImage.width, pngImage.height]);
          page.drawImage(pngImage, { x: 0, y: 0, width: pngImage.width, height: pngImage.height });
          resultBuffer = Buffer.from(await pdfDoc.save());
          outputFilename = originalName.replace(ext, '.pdf');
          contentType = 'application/pdf';
          break;

        default:
          // Fallback: just return optimized jpeg
          resultBuffer = await image.jpeg({ quality: 85 }).toBuffer();
          outputFilename = 'processed_' + originalName.replace(ext, '.jpg');
          contentType = 'image/jpeg';
      }
    }

    // ========== PDF OPERATIONS (basic) ==========
    else if (ext === '.pdf' || req.file.mimetype === 'application/pdf') {
      const pdfBytes = fs.readFileSync(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      switch (operation) {
        case 'rotate':
          const pages = pdfDoc.getPages();
          pages.forEach(page => page.setRotation(page.getRotation().angle + 90));
          resultBuffer = Buffer.from(await pdfDoc.save());
          outputFilename = 'rotated_' + originalName;
          contentType = 'application/pdf';
          break;

        case 'compress':
          // Basic re-save (real compression needs more advanced tools)
          resultBuffer = Buffer.from(await pdfDoc.save({ useObjectStreams: true }));
          outputFilename = 'compressed_' + originalName;
          contentType = 'application/pdf';
          break;

        case 'split':
          // Return first page only as example
          const newPdf = await PDFDocument.create();
          const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
          newPdf.addPage(firstPage);
          resultBuffer = Buffer.from(await newPdf.save());
          outputFilename = 'split_page1_' + originalName;
          contentType = 'application/pdf';
          break;

        default:
          resultBuffer = Buffer.from(await pdfDoc.save());
          outputFilename = 'processed_' + originalName;
          contentType = 'application/pdf';
      }
    }

    // ========== DOCUMENT (basic passthrough for now) ==========
    else {
      resultBuffer = fs.readFileSync(filePath);
      outputFilename = 'processed_' + originalName;
      contentType = req.file.mimetype || 'application/octet-stream';
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Send result
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${outputFilename}"`,
      'Content-Length': resultBuffer.length
    });
    res.send(resultBuffer);

  } catch (error) {
    console.error('Processing error:', error);
    // Clean up
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
});

// Auto clean old files every hour
setInterval(() => {
  const files = fs.readdirSync(uploadDir);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(uploadDir, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 60 * 60 * 1000) { // older than 1 hour
      fs.unlinkSync(filePath);
    }
  });
}, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Devproo Convert Backend running on http://localhost:${PORT}`);
});
