import { normalizePhoneCode, normalizeLocalMobile, buildFullPhone } from "@/utils/phoneNumber";

const STORAGE_KEY = "WC_ADDRESS_PHONE_META";

export type AddressPhoneMeta = {
  phone_code: string;
  country_code: string;
  phone: string;
};

function readAll(): Record<string, AddressPhoneMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AddressPhoneMeta>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, AddressPhoneMeta>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export function cacheAddressPhoneMeta(
  addressId: number | string,
  meta: AddressPhoneMeta & { mobile?: string },
): void {
  const id = String(addressId);
  if (!id || id === "-1") return;
  const phone_code = normalizePhoneCode(meta.phone_code) || "91";
  const mobile = normalizeLocalMobile(meta.mobile);
  const phone =
    meta.phone ||
    (mobile ? buildFullPhone(phone_code, mobile) : buildFullPhone(phone_code, ""));
  const all = readAll();
  all[id] = {
    phone_code,
    country_code: (meta.country_code || "IN").toUpperCase(),
    phone,
  };
  writeAll(all);
}

export function getAddressPhoneMeta(
  addressId?: number | string | null,
): AddressPhoneMeta | null {
  if (addressId == null) return null;
  const id = String(addressId);
  return readAll()[id] ?? null;
}

export function mergeAddressPhoneMeta<T extends Record<string, unknown>>(
  address: T,
): T {
  const id = address.id as number | string | undefined;
  const cached = getAddressPhoneMeta(id);
  if (!cached) return address;

  const apiMobile = normalizeLocalMobile(address.mobile as string | number);
  let mobile = apiMobile;
  if (cached.phone.startsWith(cached.phone_code)) {
    const fromPhone = cached.phone.slice(cached.phone_code.length);
    if (fromPhone) mobile = fromPhone;
  }

  return {
    ...address,
    phone_code: cached.phone_code,
    country_code: cached.country_code,
    phone: cached.phone,
    mobile,
  };
}
