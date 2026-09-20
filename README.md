# Devproo Convert – Backend

## How to run

1. Open terminal in this folder (`backend`)
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Backend will run at: `http://localhost:3000`

## API

**POST** `/api/process`

- Form Data:
  - `file` → the uploaded file
  - `operation` → one of the supported operations (jpg, png, webp, compress, resize, rotate-img, etc.)

## Supported Image Operations
- jpg, png, webp, gif, bmp
- compress, resize, rotate-img, flip
- grayscale, blur, sharpen, invert
- pdf (image to PDF)

## PDF Operations (basic)
- rotate, compress, split

## Notes
- Max file size: 50 MB
- Uploaded files are auto-deleted after processing
- Old temp files cleaned every hour
- In production, change CORS origin to your domain only
