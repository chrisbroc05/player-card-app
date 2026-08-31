export const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
export const BIOMETRIC_DISMISSED_KEY = "biometric_dismissed";
export const BIOMETRIC_CREDENTIAL_ID_KEY = "webauthn_credential_id";

export function base64ToBuffer(base64) {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function registrationCredentialToJSON(credential) {
  return {
    id: credential.id,
    rawId: bufferToBase64(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
      attestationObject: bufferToBase64(credential.response.attestationObject),
    },
  };
}

export function authenticationCredentialToJSON(credential) {
  const json = {
    id: credential.id,
    rawId: bufferToBase64(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64(credential.response.clientDataJSON),
      authenticatorData: bufferToBase64(credential.response.authenticatorData),
      signature: bufferToBase64(credential.response.signature),
    },
  };
  if (credential.response.userHandle) {
    json.response.userHandle = bufferToBase64(credential.response.userHandle);
  }
  return json;
}

export async function parseOptionsResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function parseRegistrationOptions(options) {
  return {
    ...options,
    challenge: base64ToBuffer(options.challenge),
    user: {
      ...options.user,
      id: base64ToBuffer(options.user.id),
    },
    excludeCredentials: (options.excludeCredentials || []).map((cred) => ({
      ...cred,
      id: base64ToBuffer(cred.id),
    })),
  };
}

export function parseAuthenticationOptions(options, credentialId) {
  const parsed = {
    ...options,
    challenge: base64ToBuffer(options.challenge),
    allowCredentials: (options.allowCredentials || []).map((cred) => ({
      ...cred,
      id: base64ToBuffer(cred.id),
    })),
  };
  if (!parsed.allowCredentials.length && credentialId) {
    parsed.allowCredentials = [{ type: "public-key", id: base64ToBuffer(credentialId) }];
  }
  return parsed;
}

export async function isBiometricAvailable() {
  try {
    if (!window.PublicKeyCredential) return false;
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
