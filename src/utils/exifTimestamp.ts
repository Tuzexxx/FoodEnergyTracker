/**
 * Extract the DateTimeOriginal timestamp from a JPEG file's EXIF data.
 * Pure client-side � no npm dependencies. Parses raw EXIF IFD from ArrayBuffer.
 * Falls back to file.lastModified -> Date.now().
 */
export async function extractPhotoTimestamp(file: File): Promise<number> {
    try {
        // Only JPEG files contain EXIF in the standard location
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
            const buffer = await file.arrayBuffer();
            const exifDate = parseExifDate(buffer);
            if (exifDate) return exifDate.getTime();
        }
    } catch (e) {
        console.warn('[EXIF] Failed to parse EXIF data, using fallback', e);
    }

    // Fallback: file.lastModified (usually the time the photo was saved/transferred)
    if (file.lastModified) {
        return file.lastModified;
    }

    return Date.now();
}

function parseExifDate(buffer: ArrayBuffer): Date | null {
    const view = new DataView(buffer);

    // Verify JPEG SOI marker
    if (view.getUint16(0) !== 0xFFD8) return null;

    let offset = 2;
    const length = view.byteLength;

    while (offset < length - 4) {
        const marker = view.getUint16(offset);

        // APP1 marker (EXIF)
        if (marker === 0xFFE1) {
            const exifOffset = offset + 4;

            // Check for "Exif\0\0" header
            if (
                view.getUint8(exifOffset) === 0x45 && // E
                view.getUint8(exifOffset + 1) === 0x78 && // x
                view.getUint8(exifOffset + 2) === 0x69 && // i
                view.getUint8(exifOffset + 3) === 0x66 && // f
                view.getUint8(exifOffset + 4) === 0x00 &&
                view.getUint8(exifOffset + 5) === 0x00
            ) {
                return parseIFD(view, exifOffset + 6);
            }
        } else if ((marker & 0xFF00) === 0xFF00) {
            // Skip other markers
            const segLen = view.getUint16(offset + 2);
            offset += 2 + segLen;
        } else {
            break;
        }
    }

    return null;
}

function parseIFD(view: DataView, tiffStart: number): Date | null {
    const byteOrder = view.getUint16(tiffStart);
    const littleEndian = byteOrder === 0x4949; // "II" = Intel = little-endian

    const read16 = (o: number) => view.getUint16(o, littleEndian);
    const read32 = (o: number) => view.getUint32(o, littleEndian);

    // Verify TIFF magic number
    if (read16(tiffStart + 2) !== 0x002A) return null;

    const ifd0Offset = read32(tiffStart + 4);
    const dateStr = findDateInIFD(view, tiffStart, tiffStart + ifd0Offset, read16, read32);
    if (dateStr) return parseExifDateString(dateStr);

    // Also check the EXIF Sub-IFD (tag 0x8769)
    const exifIFDPointer = findTagValue(view, tiffStart, tiffStart + ifd0Offset, 0x8769, read16, read32);
    if (exifIFDPointer) {
        const dateStr2 = findDateInIFD(view, tiffStart, tiffStart + exifIFDPointer, read16, read32);
        if (dateStr2) return parseExifDateString(dateStr2);
    }

    return null;
}

function findDateInIFD(
    view: DataView, tiffStart: number, ifdOffset: number,
    read16: (o: number) => number, read32: (o: number) => number
): string | null {
    // DateTimeOriginal = 0x9003, DateTimeDigitized = 0x9004, DateTime = 0x0132
    const dateTags = [0x9003, 0x9004, 0x0132];

    for (const tag of dateTags) {
        const value = findTagString(view, tiffStart, ifdOffset, tag, read16, read32);
        if (value) return value;
    }
    return null;
}

function findTagValue(
    _view: DataView, _tiffStart: number, ifdOffset: number, targetTag: number,
    read16: (o: number) => number, read32: (o: number) => number
): number | null {
    try {
        const entryCount = read16(ifdOffset);
        for (let i = 0; i < entryCount; i++) {
            const entryOffset = ifdOffset + 2 + i * 12;
            const tag = read16(entryOffset);
            if (tag === targetTag) {
                return read32(entryOffset + 8);
            }
        }
    } catch { /* out of bounds */ }
    return null;
}

function findTagString(
    view: DataView, tiffStart: number, ifdOffset: number, targetTag: number,
    read16: (o: number) => number, read32: (o: number) => number
): string | null {
    try {
        const entryCount = read16(ifdOffset);
        for (let i = 0; i < entryCount; i++) {
            const entryOffset = ifdOffset + 2 + i * 12;
            const tag = read16(entryOffset);
            if (tag === targetTag) {
                const type = read16(entryOffset + 2);
                const count = read32(entryOffset + 4);
                if (type === 2 && count >= 19) { // ASCII type, at least "YYYY:MM:DD HH:MM:SS"
                    const valueOffset = read32(entryOffset + 8);
                    const strBytes = new Uint8Array(view.buffer, tiffStart + valueOffset, 19);
                    return String.fromCharCode(...strBytes);
                }
            }
        }
    } catch { /* out of bounds */ }
    return null;
}

function parseExifDateString(dateStr: string): Date | null {
    // EXIF format: "YYYY:MM:DD HH:MM:SS"
    const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return null;

    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(
        parseInt(year), parseInt(month) - 1, parseInt(day),
        parseInt(hour), parseInt(minute), parseInt(second)
    );

    // Sanity check: date should be reasonable (after 2000, not in the future)
    if (date.getFullYear() < 2000 || date.getTime() > Date.now() + 86400000) {
        return null;
    }

    return date;
}
