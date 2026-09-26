import fs from 'fs';
import zlib from 'zlib';

function addTextChunkToPng(inputPath, key, text) {
  const fileBuffer = fs.readFileSync(inputPath);
  
  // PNG signature is 8 bytes: 89 50 4E 47 0D 0A 1A 0A
  const sig = fileBuffer.subarray(0, 8);
  if (sig.toString('hex') !== '89504e470d0a1a0a') {
    console.error("Not a valid PNG file");
    return;
  }

  // Create tEXt chunk
  const keyBuf = Buffer.from(key, 'latin1');
  const nullBuf = Buffer.from([0]);
  const textBuf = Buffer.from(text, 'latin1');
  const dataBuf = Buffer.concat([keyBuf, nullBuf, textBuf]);
  
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(dataBuf.length, 0);
  
  const typeBuf = Buffer.from('tEXt', 'latin1');
  
  // CRC-32 of (type + data)
  const crcData = Buffer.concat([typeBuf, dataBuf]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  const newChunk = Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);

  // Insert chunk right after IHDR chunk (which is 8 bytes sig + 25 bytes IHDR = 33 bytes)
  const newPngBuffer = Buffer.concat([
    fileBuffer.subarray(0, 33),
    newChunk,
    fileBuffer.subarray(33)
  ]);

  fs.writeFileSync(inputPath, newPngBuffer);
  console.log(`Successfully embedded tEXt chunk [${key}: "${text}"] into ${inputPath}`);
}

// CRC32 implementation
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

addTextChunkToPng('./public/rain_shot.png', 'mercedes', 'speed > everything (what could someone\'s everything be)');
