/** Strip non-digits from a dial code (e.g. "+91" → "91"). */
export function normalizePhoneCode(code?: string | number | null): string {
  return String(code ?? "")
    .replace(/\D/g, "")
    .trim();
}

/** Local mobile digits only (no country prefix). */
export function normalizeLocalMobile(mobile?: string | number | null): string {
  return String(mobile ?? "")
    .replace(/\D/g, "")
    .trim();
}

const DIAL_TO_ISO: Record<string, string> = {
  "1": "US",
  "7": "RU",
  "20": "EG",
  "27": "ZA",
  "30": "GR",
  "31": "NL",
  "32": "BE",
  "33": "FR",
  "34": "ES",
  "36": "HU",
  "39": "IT",
  "40": "RO",
  "41": "CH",
  "43": "AT",
  "44": "GB",
  "45": "DK",
  "46": "SE",
  "47": "NO",
  "48": "PL",
  "49": "DE",
  "51": "PE",
  "52": "MX",
  "54": "AR",
  "55": "BR",
  "60": "MY",
  "61": "AU",
  "62": "ID",
  "63": "PH",
  "64": "NZ",
  "65": "SG",
  "66": "TH",
  "81": "JP",
  "82": "KR",
  "86": "CN",
  "90": "TR",
  "91": "IN",
  "92": "PK",
  "93": "AF",
  "94": "LK",
  "95": "MM",
  "98": "IR",
  "211": "SS",
  "212": "MA",
  "213": "DZ",
  "234": "NG",
  "254": "KE",
  "351": "PT",
  "352": "LU",
  "353": "IE",
  "354": "IS",
  "355": "AL",
  "356": "MT",
  "358": "FI",
  "359": "BG",
  "370": "LT",
  "371": "LV",
  "372": "EE",
  "380": "UA",
  "381": "RS",
  "420": "CZ",
  "421": "SK",
  "852": "HK",
  "853": "MO",
  "855": "KH",
  "856": "LA",
  "880": "BD",
  "886": "TW",
  "960": "MV",
  "961": "LB",
  "962": "JO",
  "963": "SY",
  "964": "IQ",
  "965": "KW",
  "966": "SA",
  "967": "YE",
  "968": "OM",
  "971": "AE",
  "972": "IL",
  "973": "BH",
  "974": "QA",
  "975": "BT",
  "976": "MN",
  "977": "NP",
  "992": "TJ",
  "993": "TM",
  "994": "AZ",
  "995": "GE",
  "996": "KG",
  "998": "UZ",
};

const DIAL_CODES_LONGEST_FIRST = Object.keys(DIAL_TO_ISO).sort(
  (a, b) => b.length - a.length,
);

function inferPhoneParts(
  fullPhone: string,
  localHint?: string,
  codeHint?: string,
): { phone_code: string; mobile: string } | null {
  const digits = normalizeLocalMobile(fullPhone);
  const local = normalizeLocalMobile(localHint);
  const hint = normalizePhoneCode(codeHint);

  if (!digits) return null;

  if (hint && digits.startsWith(hint) && digits.length > hint.length) {
    return { phone_code: hint, mobile: digits.slice(hint.length) };
  }

  if (local && digits.endsWith(local) && digits.length > local.length) {
    const code = digits.slice(0, digits.length - local.length);
    if (code.length >= 1 && code.length <= 4) {
      return { phone_code: code, mobile: local };
    }
  }

  for (const code of DIAL_CODES_LONGEST_FIRST) {
    if (digits.startsWith(code) && digits.length > code.length + 5) {
      return { phone_code: code, mobile: digits.slice(code.length) };
    }
  }

  return null;
}

/** Full phone with country code prefix, digits only (e.g. "3549997297754"). */
export function buildFullPhone(
  phoneCode?: string | number | null,
  localMobile?: string | number | null,
): string {
  const code = normalizePhoneCode(phoneCode) || "91";
  const local = normalizeLocalMobile(localMobile);
  return `${code}${local}`;
}

/** Split stored full phone into dial code + local number. */
export function splitPhoneForInput(
  fullPhone?: string | number | null,
  phoneCode?: string | number | null,
  localMobile?: string | number | null,
): { phone_code: string; mobile: string } {
  const resolved = resolvePhoneFields(fullPhone, phoneCode, localMobile);
  return { phone_code: resolved.phone_code, mobile: resolved.mobile };
}

/**
 * Resolve phone + phone_code for API payloads and display.
 * Infers country code from full `phone` when API omits phone_code.
 */
export function resolvePhoneFields(
  phone?: string | number | null,
  phoneCode?: string | number | null,
  localMobile?: string | number | null,
): { phone: string; phone_code: string; mobile: string } {
  const hint = normalizePhoneCode(phoneCode);
  const rawPhone = String(phone ?? "").trim();
  const rawMobile = String(localMobile ?? "").trim();
  const phoneDigits = normalizeLocalMobile(rawPhone);
  const mobileDigits = normalizeLocalMobile(rawMobile);

  const result = (code: string, mobile: string) => ({
    phone: mobile ? `${code}${mobile}` : "",
    phone_code: code,
    mobile,
  });

  const resolveInternational = (digits: string) => {
    const inferred = inferPhoneParts(digits, undefined, hint);
    return inferred
      ? result(inferred.phone_code, inferred.mobile)
      : result(hint || "91", digits);
  };

  if (mobileDigits) {
    if (rawMobile.startsWith("+")) {
      return resolveInternational(mobileDigits);
    }

    if (!hint || hint === "91") {
      if (mobileDigits.length === 10) {
        return result("91", mobileDigits);
      }

      if (
        mobileDigits.length === 12 &&
        mobileDigits.startsWith("91")
      ) {
        return result("91", mobileDigits.slice(2));
      }
    }

    // A separate mobile field is national unless explicitly international.
    return result(hint || "91", mobileDigits);
  }

  if (!phoneDigits) {
    return result(hint || "91", "");
  }

  if (rawPhone.startsWith("+")) {
    return resolveInternational(phoneDigits);
  }

  if (!hint || hint === "91") {
    if (phoneDigits.length === 10) {
      return result("91", phoneDigits);
    }

    if (
      phoneDigits.length === 12 &&
      phoneDigits.startsWith("91")
    ) {
      return result("91", phoneDigits.slice(2));
    }

    if (hint === "91") {
      return result("91", phoneDigits);
    }
  }

  if (hint) {
    return result(
      hint,
      phoneDigits.startsWith(hint)
        ? phoneDigits.slice(hint.length)
        : phoneDigits,
    );
  }

  return resolveInternational(phoneDigits);
}

/** ISO country code for PhoneInput flag from saved dial code. */
export function countryIsoFromDialCode(dialCode?: string | number | null): string {
  const target = normalizePhoneCode(dialCode);
  if (!target) return "IN";
  if (DIAL_TO_ISO[target]) return DIAL_TO_ISO[target];
  for (let len = 3; len >= 1; len -= 1) {
    const prefix = target.slice(0, len);
    if (DIAL_TO_ISO[prefix]) return DIAL_TO_ISO[prefix];
  }
  return "IN";
}

/** Normalize address object from API (handles alternate field names). */
export function normalizeAddressFromApi(raw: Record<string, unknown>): Record<string, unknown> {
  const phone =
    raw.phone ??
    raw.phone_number ??
    raw.phoneNumber ??
    null;
  const mobile =
    raw.mobile ??
    raw.mobile_number ??
    raw.mobileNumber ??
    null;
  const phoneCode =
    raw.phone_code ??
    raw.phoneCode ??
    raw.dial_code ??
    raw.dialCode ??
    null;
  const resolved = resolvePhoneFields(
    phone as string | number | null,
    phoneCode as string | number | null,
    mobile as string | number | null,
  );

  const countryCode =
    (raw.country_code as string | undefined)?.toUpperCase() ||
    (raw.countryCode as string | undefined)?.toUpperCase() ||
    countryIsoFromDialCode(resolved.phone_code);

  return {
    ...raw,
    mobile: resolved.mobile,
    phone: resolved.phone,
    phone_code: resolved.phone_code,
    country_code: countryCode,
  };
}

/** Display phone with country code: +354 9997297754 */
export function formatAddressPhone(
  phone?: string | number | null,
  phoneCode?: string | number | null,
  mobile?: string | number | null,
): string {
  const resolved = resolvePhoneFields(phone, phoneCode, mobile);
  if (!resolved.mobile && !resolved.phone) return "";
  if (resolved.mobile) {
    return `+${resolved.phone_code} ${resolved.mobile}`;
  }
  return `+${resolved.phone}`;
}

/** @deprecated Prefer formatAddressPhone with phone, phone_code, mobile */
export function formatPhoneWithCode(
  phoneCode?: string | number | null,
  mobileOrFull?: string | number | null,
): string {
  return formatAddressPhone(mobileOrFull, phoneCode, undefined);
}
