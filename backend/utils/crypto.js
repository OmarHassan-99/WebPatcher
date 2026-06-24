import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16, IV -> Initialization Vector

export function encryptToken(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc", // CBC (Cipher Block Chaining)
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Return the IV and the encrypted data joined by a colon
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptToken(text) {
  if (!text) return null;
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex"); // shift deh bt3ml remove lel first part ely howa el iv
  const encryptedText = Buffer.from(textParts.join(":"), "hex"); // textParts.join(":") deh bt3ml return lel second part ely howa el encrypted text nfsha
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc", // CBC (Cipher Block Chaining)
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}
