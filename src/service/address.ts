import { END_POINTS } from "@/constants/url";
import emptySplitApi from "@/lib/rtk";
import { CommonResponseType, Address, AddressFormData } from "@/types/General";
import { mergeAddressPhoneMeta } from "@/utils/addressPhoneCache";
import { normalizeAddressFromApi } from "@/utils/phoneNumber";

function normalizeAddressRecord(raw: unknown): Address {
  const merged = mergeAddressPhoneMeta(
    (raw ?? {}) as Record<string, unknown>,
  );
  return normalizeAddressFromApi(merged) as unknown as Address;
}

function normalizeAddressListResponse(
  response: CommonResponseType & { data?: unknown },
): CommonResponseType & { data: Address[] } {
  const list = Array.isArray(response?.data) ? response.data : [];
  return {
    ...response,
    data: list.map((item) => normalizeAddressRecord(item)),
  };
}

function normalizeAddressItemResponse(
  response: CommonResponseType & { data?: unknown },
): CommonResponseType & { data: Address } {
  const item = response?.data;
  if (!item || typeof item !== "object") {
    return response as CommonResponseType & { data: Address };
  }
  return {
    ...response,
    data: normalizeAddressRecord(item),
  };
}

export const AddressService = emptySplitApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    // Get address list
    getAddressList: builder.query<
      CommonResponseType & { data: Address[] },
      void
    >({
      query: () => ({
        url: `${END_POINTS.addressList}`,
        method: "GET",
      }),
      transformResponse: normalizeAddressListResponse,
      providesTags: ["ADDRESS"],
    }),

    // Create new address
    createAddress: builder.mutation<
      CommonResponseType & { data: Address },
      { body: AddressFormData }
    >({
      query: ({ body }) => ({
        url: `${END_POINTS.addressCreate}`,
        method: "POST",
        body,
      }),
      transformResponse: normalizeAddressItemResponse,
      invalidatesTags: ["ADDRESS"],
    }),

    // Edit existing address
    editAddress: builder.mutation<
      CommonResponseType & { data: Address },
      { id: number; body: AddressFormData }
    >({
      query: ({ id, body }) => ({
        url: `${END_POINTS.addressEdit}/${id}`,
        method: "POST",
        body,
      }),
      transformResponse: normalizeAddressItemResponse,
      invalidatesTags: ["ADDRESS"],
    }),

    // Delete address
    deleteAddress: builder.mutation<
      CommonResponseType,
      { id: number }
    >({
      query: ({ id }) => ({
        url: `${END_POINTS.addressDelete}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ADDRESS"],
    }),
  }),
});

export const {
  useGetAddressListQuery,
  useLazyGetAddressListQuery,
  useCreateAddressMutation,
  useEditAddressMutation,
  useDeleteAddressMutation,
} = AddressService;
