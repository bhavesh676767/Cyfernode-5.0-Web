#!/usr/bin/env python3
"""
stego.py — LSB steganography with an XOR key layer.

Hides a text message inside the least-significant bits of an image's
pixel data. The message is XOR'd with a key BEFORE embedding, so
someone who blindly extracts the LSBs gets gibberish unless they
also XOR-decrypt with the correct key.

Usage:
    python3 stego.py encode <input.png> <output.png> "<message>" "<key>"
    python3 stego.py decode <image.png> "<key>"

Notes:
- Input/output should be PNG (lossless). JPEG will destroy the hidden
  bits because of compression — never save the encoded image as JPEG.
- Works on RGB or RGBA images.
"""

import sys
from PIL import Image

DELIMITER = "1111111111111110"  # 16-bit marker meaning "end of message"


def xor_bytes(data: bytes, key: str) -> bytes:
    key_bytes = key.encode("utf-8")
    return bytes(b ^ key_bytes[i % len(key_bytes)] for i, b in enumerate(data))


def text_to_bits(text: str) -> str:
    return "".join(format(byte, "08b") for byte in text)


def bits_to_text(bits: str) -> bytes:
    chars = [bits[i:i + 8] for i in range(0, len(bits), 8)]
    return bytes(int(c, 2) for c in chars if len(c) == 8)


def encode(input_path: str, output_path: str, message: str, key: str):
    img = Image.open(input_path)
    img = img.convert("RGB")  # normalize mode
    pixels = list(img.getdata())

    # XOR the message with the key, then convert to a bitstream
    encrypted = xor_bytes(message.encode("utf-8"), key)
    bitstream = "".join(format(b, "08b") for b in encrypted) + DELIMITER

    capacity_bits = len(pixels) * 3  # 1 bit per color channel
    if len(bitstream) > capacity_bits:
        raise ValueError(
            f"Message too long: needs {len(bitstream)} bits, "
            f"image only has capacity for {capacity_bits} bits."
        )

    new_pixels = []
    bit_idx = 0
    for pixel in pixels:
        r, g, b = pixel
        channels = [r, g, b]
        for c in range(3):
            if bit_idx < len(bitstream):
                bit = int(bitstream[bit_idx])
                channels[c] = (channels[c] & ~1) | bit  # clear LSB, set to our bit
                bit_idx += 1
        new_pixels.append(tuple(channels))

    img.putdata(new_pixels)
    img.save(output_path, "PNG")
    print(f"Encoded {len(message)} chars ({len(bitstream)} bits) into {output_path}")


def decode(image_path: str, key: str) -> str:
    img = Image.open(image_path)
    img = img.convert("RGB")
    pixels = list(img.getdata())

    bitstream = ""
    for pixel in pixels:
        for c in range(3):
            bitstream += str(pixel[c] & 1)
            if bitstream.endswith(DELIMITER):
                payload_bits = bitstream[: -len(DELIMITER)]
                encrypted = bits_to_text(payload_bits)
                decrypted = xor_bytes(encrypted, key)
                return decrypted.decode("utf-8", errors="replace")

    raise ValueError("No end-of-message delimiter found — image may not contain a hidden message, "
                      "or the file was re-compressed/re-saved as something lossy.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    mode = sys.argv[1]
    if mode == "encode":
        _, _, in_path, out_path, msg, key = sys.argv
        encode(in_path, out_path, msg, key)
    elif mode == "decode":
        _, _, img_path, key = sys.argv
        result = decode(img_path, key)
        print("Decoded message:")
        print(result)
    else:
        print(__doc__)
        sys.exit(1)
