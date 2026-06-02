/**
 * ================================================================
 * FILE: server/services/exifService.js
 * ================================================================
 * Extracts real EXIF metadata from images using Sharp.
 * No extra packages needed.
 *
 * HOW TO USE after upload in photoController.js:
 *   const { extractExif } = require('../services/exifService');
 *   const exif = await extractExif(buffer);
 *   await Photo.findByIdAndUpdate(photo._id, { metadata: exif });
 */

const sharp = require('sharp');

const extractExif = async (imageBuffer) => {
  try {
    const meta = await sharp(imageBuffer).metadata();
    const exif = meta.exif ? parseExifBuffer(meta.exif) : {};

    return {
      camera:       exif.Make && exif.Model ? `${exif.Make} ${exif.Model}`.trim() : null,
      lens:         exif.LensModel || exif.Lens || null,
      iso:          exif.ISOSpeedRatings || null,
      aperture:     exif.FNumber ? `f/${exif.FNumber}` : null,
      shutterSpeed: formatShutter(exif.ExposureTime),
      focalLength:  exif.FocalLength ? `${exif.FocalLength}mm` : null,
      takenAt:      parseDate(exif.DateTimeOriginal || exif.DateTime),
      gpsLat:       parseGPS(exif.GPSLatitude, exif.GPSLatitudeRef),
      gpsLng:       parseGPS(exif.GPSLongitude, exif.GPSLongitudeRef),
      width:        meta.width,
      height:       meta.height,
      colorSpace:   meta.space || null,
      orientation:  meta.orientation || 1,
    };
  } catch { return {}; }
};

const parseExifBuffer = (buf) => {
  const tags = {};
  try {
    if (!buf || buf.length < 8) return tags;
    const isLE   = buf[0] === 0x49 && buf[1] === 0x49;
    const read16 = (o) => isLE ? buf.readUInt16LE(o) : buf.readUInt16BE(o);
    const read32 = (o) => isLE ? buf.readUInt32LE(o) : buf.readUInt32BE(o);
    const ifdOffset = read32(4);
    const tagCount  = read16(ifdOffset);
    const TAG_MAP = {
      0x010F:'Make', 0x0110:'Model', 0x0132:'DateTime',
      0x829A:'ExposureTime', 0x829D:'FNumber', 0x8827:'ISOSpeedRatings',
      0x9003:'DateTimeOriginal', 0x920A:'FocalLength', 0xA434:'LensModel',
    };
    for (let i = 0; i < Math.min(tagCount, 64); i++) {
      const base = ifdOffset + 2 + i * 12;
      if (base + 12 > buf.length) break;
      const tag  = read16(base), type = read16(base+2), count = read32(base+4);
      const name = TAG_MAP[tag];
      if (!name) continue;
      const valOff = base + 8;
      if (type === 2) {
        const off = count > 4 ? read32(valOff) : valOff;
        if (off + count <= buf.length)
          tags[name] = buf.slice(off, off + count - 1).toString('ascii').trim();
      } else if (type === 3 && count === 1) {
        tags[name] = isLE ? buf.readUInt16LE(valOff) : buf.readUInt16BE(valOff);
      } else if (type === 4 && count === 1) {
        tags[name] = read32(valOff);
      } else if (type === 5) {
        const off = read32(valOff);
        if (off + 8 <= buf.length) {
          const n = read32(off), d = read32(off+4);
          tags[name] = d ? Math.round((n/d)*10)/10 : null;
        }
      }
    }
  } catch (_) {}
  return tags;
};

const formatShutter = (v) => {
  if (!v) return null;
  return v >= 1 ? `${v}s` : `1/${Math.round(1/v)}s`;
};

const parseDate = (str) => {
  if (!str) return null;
  try {
    const d = new Date(str.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'));
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

const parseGPS = (coords, ref) => {
  if (!Array.isArray(coords) || coords.length < 3) return null;
  const dd = coords[0] + coords[1]/60 + coords[2]/3600;
  return (ref==='S'||ref==='W') ? -dd : dd;
};

module.exports = { extractExif };
