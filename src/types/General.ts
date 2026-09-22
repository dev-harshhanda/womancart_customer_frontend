import { persistedReducer } from "@/lib/store";

export type RootState = ReturnType<typeof persistedReducer>;
export type CommonResponseType = {
  statusCode: number;
  message: string;
  success?: boolean;
};

export interface User {
  referenceId: string;
  isVatRegistered: boolean;
  vatPhoto: string;
  vatTrnNumber: string;
  isFresher: boolean;
  aiMatchScore: string;
  isPasswordSet: boolean;
  workMode: string[];
  role: string;
  profilePercentage: number;
  licensePhoto: string;
  profileStatus: string;
  isProfileCompleted: boolean;
  haveFamilyBook: boolean;
  // mySubscriptionId: string;
  licenseNumber: string;
  licenseExpiry: string;
  businessName: {
    name: string;
    slug: string;
    type: string;
    isDeleted: boolean;
    _id: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
  coverPhoto: string;
  email: string;
  isEmailVerified: boolean;
  landlinePhoneNumber: string;
  slug: string;
  freelancer: string;
  profileVideo: string;
  profileVideoThumbnail: string;
  gender: string;
  maritalStatus: string;
  religion: string;
  nationality: string;
  linkedin: string;
  availability: string;
  profileImage: string;
  address: string;
  state: string;
  country: string;
  bio: string;
  visaStatus: string;
  resume: string;
  dob: string;
  countryCode: string;
  phoneNumber: string;
  isPhoneVerified: boolean;
  notification: boolean;
  isBlocked: boolean;
  status: boolean;
  location: Location;
  firstName: string;
  belongsToCategory: string;
  lastName: string;
  languages: any[];
  isSubscriptionActive: boolean;
  // workExperience: WorkExperience;
  workLevel: any[];
  isAnywhere: boolean;
  preferredJobLocations: {
    name: string;
    slug: string;
    type: string;
    isDeleted: boolean;
    _id: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
  }[];
  preferredJobType: any[];
  skills: {
    name: string;
    slug: string;
    type: string;
    isDeleted: boolean;
    _id: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
  }[];
  socialMediaAccount: any[];
  accountStatus: string;
  _id: string;
  createdAt: string;
  isUserReported: boolean;
  updatedAt: string;
  __v: number;
  id: string;
  experiences: any[];
  educations: any[];
  projects: any[];
  certificates: any[];
  resumes: any[];
  token: string;
  legalBusinessName?: string;
  businessLogo?: string;
  brandName?: string;
  salary?: {
    amount: string;
    currency: string;
  };
  isFreelancer: string;
  workExperience: {
    industries: {
      name: string;
      slug: string;
      type: string;
      isDeleted: boolean;
      _id: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
    }[];
    months: number;
    years: number;
  };
  profilePrivacy: {
    profileVisibility: boolean;
    contactVisibility: boolean;
  };
  jobNotifications: {
    careerAdviceTip: boolean;
    recommended: boolean;
    updateOnApplication: boolean;
    whatsapp: boolean;
  };
  leadershipLevelEmployees: {
    maleCount: number;
    femaleCount: number;
    nonBinaryCount: number;
    podCount: number;
  };
  totalEmployees: {
    maleCount: number;
    femaleCount: number;
    nonBinaryCount: number;
    podCount: number;
  };
  ethnicGroupEmployeesCount: number;
  freeTextAboutDEI: string;
  mySubscriptionId: any;
}

export interface Product {
  // store_id removed/commented as it is no longer required in the application
  // store_id: number;
  product_id: number;
  variation_id: number | null;
  product_name: string;
  slug: string;
  short_description: string;
  featured: boolean;
  is_new: boolean;
  best_seller: boolean;
  average_rating: string | null;
  rating?: number | string; // Fallback
  reviews?: number; // Fallback
  review_count: number;
  qty_available: number;
  delivery_time: string | null;
  easy_return: boolean | null;
  delivery_policy: string | null;
  delivery_return: string | null;
  price: Price;
  brand: Brand;
  category: Category;
  image: string;
  is_wishlist: boolean;
  barcode_image_url: string | null;
  size_chart: string | null;
}

export interface Price {
  store_price: string;
  mrp: string;
  percentage_off: number;
}

export interface Brand {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
}

// Address types
export interface Address {
  id: number;
  name: string;
  mobile: string;
  email: string;
  address: string;
  address1: string;
  landmark: string;
  latitude: string;
  longitude: string;
  address_type: string;
  state: string;
  city: string;
  pincode: string;
  country_code?: string;
  phone_code?: string;
  /** Full phone with country code, digits only (e.g. 919729522517). */
  phone?: string;
  /** 1 = default address, 0 or undefined = not default */
  is_default?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AddressFormData {
  name: string;
  mobile: string;
  email: string;
  address: string;
  address1: string;
  landmark: string;
  latitude: string;
  longitude: string;
  address_type: string;
  state: string;
  city: string;
  pincode: string;
  country_code?: string;
  phone_code?: string;
  /** Full phone with country code, digits only (e.g. 919729522517). */
  phone?: string;
  // is_default flag as 0/1 for backend
  is_default?: number;
}

export interface CategoryItem {
  id: number;
  name: string;
  image_url: string | null;
  parent_id: number | null;
  icon_url: string | null;
}

export interface BannerLink {
  id: number;
  linkable_type: string | null;
  linkable_id: number;
  banner_management_id: number;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeaturedBrand {
  id: number;
  title: string;
  description: string;
  image: string;
  web_image?: string | null;
  title_image?: string | null;
  background_image?: string | null;
  module: string | null;
  position: "top" | "bottom" | string;
  type: "brand" | string;
  label_key: string;
  start_date: string | null;
  end_date: string | null;
  url: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: number;
  layout_for: string | null;
  category_id: number | null;
  createdAt: string;
  updatedAt: string;
  banner_links: BannerLink[];
}

