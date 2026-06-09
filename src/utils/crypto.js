// Web Crypto API Wrapper for AES-GCM 256-bit

export async function generateKey() {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return key;
}

export async function exportKeyToBase64(key) {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const exportedKeyBuffer = new Uint8Array(exported);
  return btoa(String.fromCharCode(...exportedKeyBuffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function importKeyFromBase64(base64Key) {
  let base64 = base64Key.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binaryDerString = atob(base64);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return await window.crypto.subtle.importKey(
    'raw',
    binaryDer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(text, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  };
}

export async function decryptText(ivBase64, ciphertextBase64, key) {
  if (!key) return "[Encrypted Message]";
  const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
  const ciphertext = new Uint8Array(atob(ciphertextBase64).split('').map(c => c.charCodeAt(0)));
  
  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    console.error("Decryption failed", e);
    return "[Encrypted Message - Key Missing or Invalid]";
  }
}

export async function encryptFile(arrayBuffer, key) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    arrayBuffer
  );
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertextBuffer: ciphertext
  };
}

export async function decryptFile(ivBase64, encryptedArrayBuffer, key) {
  const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
  try {
    return await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedArrayBuffer
    );
  } catch (e) {
    console.error("File decryption failed", e);
    throw new Error("File Decryption Failed");
  }
}
