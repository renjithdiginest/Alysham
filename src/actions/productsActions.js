import {
  FETCH_PRODUCTS_REQUEST,
  FETCH_PRODUCTS_FAIL,
  FETCH_PRODUCTS_SUCCESS,
  SEARCH_PRODUCTS_REQUEST,
  SEARCH_PRODUCTS_FAIL,
  SEARCH_PRODUCTS_SUCCESS,
  FETCH_ONE_PRODUCT_REQUEST,
  FETCH_ONE_PRODUCT_FAIL,
  FETCH_ONE_PRODUCT_SUCCESS,
  RECALCULATE_PRODUCT_PRICE_REQUEST,
  RECALCULATE_PRODUCT_PRICE_FAIL,
  RECALCULATE_PRODUCT_PRICE_SUCCESS,
  FETCH_DISCUSSION_REQUEST,
  FETCH_DISCUSSION_SUCCESS,
  FETCH_DISCUSSION_FAIL,
  POST_DISCUSSION_REQUEST,
  POST_DISCUSSION_SUCCESS,
  POST_DISCUSSION_FAIL,
  NOTIFICATION_SHOW,
  DISCUSSION_DISABLED,
  CHANGE_PRODUCTS_SORT,
  FETCH_COMMON_PRODUCTS_REQUEST,
  FETCH_COMMON_PRODUCTS_FAIL,
  FETCH_COMMON_PRODUCTS_SUCCESS,
} from '../constants';
import Api from '../services/api';
import i18n from '../utils/i18n';
import { filterObject } from '../utils/index';

export function fetchDiscussion(id, params = { page: 1 }, type = 'P') {
  return (dispatch) => {
    dispatch({
      type: FETCH_DISCUSSION_REQUEST,
    });

    return Api.get(
      `/sra_discussion/?object_type=${type}&object_id=${id}&params[page]=${params.page}`,
    )
      .then((response) => {
        dispatch({
          type: FETCH_DISCUSSION_SUCCESS,
          payload: {
            id: `${type.toLowerCase()}_${id}`,
            page: params.page,
            discussion: response.data,
          },
        });
        return response;
      })
      .catch((error) => {
        dispatch({
          type: FETCH_DISCUSSION_FAIL,
          error,
        });
      });
  };
}

export function postDiscussion(data) {
  return (dispatch) => {
    dispatch({
      type: POST_DISCUSSION_REQUEST,
    });

    return Api.post('/sra_discussion', data)
      .then(() => {
        dispatch({
          type: POST_DISCUSSION_SUCCESS,
        });

        dispatch({
          type: NOTIFICATION_SHOW,
          payload: {
            type: 'success',
            title: i18n.t('Thank you for your post.'),
            text: i18n.t('Your post will be checked before it gets published.'),
          },
        });
        // Reload discussion.
        fetchDiscussion(
          data.discussionId,
          { page: 1 },
          data.discussionType,
        )(dispatch);
      })
      .catch((error) => {
        dispatch({
          type: POST_DISCUSSION_FAIL,
          error,
        });
      });
  };
}

export function recalculatePrice(pid, options) {
  function formatOptionsToUrl(selectedOptions) {
    const options = [];
    Object.keys(selectedOptions).forEach((optionId) => {
      options.push(
        `${encodeURIComponent(`selected_options[${optionId}]`)}=${
          selectedOptions[optionId].variant_id
        }`,
      );
    });
    return options.join('&');
  }

  return (dispatch) => {
    dispatch({ type: RECALCULATE_PRODUCT_PRICE_REQUEST });

    return Api.get(`sra_products/${pid}/?${formatOptionsToUrl(options)}`)
      .then((response) => {
        response.data = filterFeaturesAndVariations(response.data);
        dispatch({
          type: RECALCULATE_PRODUCT_PRICE_SUCCESS,
          payload: {
            product: response.data,
            pid,
          },
        });
      })
      .catch((error) => {
        dispatch({
          type: RECALCULATE_PRODUCT_PRICE_FAIL,
          error,
        });
      });
  };
}

const filterFeaturesAndVariations = (oldProductData) => {
  const newProductData = { ...oldProductData };

  if (!newProductData.variation_features_variants) {
    return oldProductData;
  }

  // Filters variants field of variation_features_variants elements.
  // If the variant doesn`t have product_id, we just delete this variant from the list.
  Object.keys(newProductData.variation_features_variants).forEach(
    (featureVariant) => {
      newProductData.variation_features_variants[
        featureVariant
      ].variants = filterObject(
        newProductData.variation_features_variants[featureVariant].variants,
        (variant) => {
          return variant.product_id;
        },
      );
    },
  );

  // Checking if the variation has options. If not, we make it a feature.
  newProductData.variation_features_variants = filterObject(
    newProductData.variation_features_variants,
    (featuresVariant) => {
      return Object.keys(featuresVariant.variants).length > 1;
    },
  );

  // We remove features, if they are in variations.
  newProductData.product_features = filterObject(
    newProductData.product_features,
    (feature) => {
      return !Object.keys(newProductData.variation_features_variants).includes(
        feature.feature_id,
      );
    },
  );

  return newProductData;
};

const convertProductOptions = (oldProductOptions) => {
  const newProductOptions = Object.keys(oldProductOptions).map((option) => {
    const newProductOption = { ...oldProductOptions[option] };
    const OPTION_TYPE_IMAGES = 'I';

    // If option has images, we change option type to 'I'
    if (
      Object.keys(
        newProductOption?.variants[Object.keys(newProductOption.variants)[0]]
          .image_pair,
      ).length
    ) {
      newProductOption.option_type = OPTION_TYPE_IMAGES;
    }

    newProductOption.selectTitle = oldProductOptions[option].option_name;
    newProductOption.selectDefaultId = oldProductOptions[option].option_id;

    newProductOption.selectVariants = Object.keys(
      oldProductOptions[option].variants,
    ).map((variantId) => {
      const selectVariant = {
        ...oldProductOptions[option].variants[variantId],
      };
      selectVariant.selectVariantName = selectVariant.variant_name;
      if (Object.keys(selectVariant.image_pair).length) {
        selectVariant.selectImgPath = selectVariant.image_pair.icon.image_path;
      }
      selectVariant.selectValue = selectVariant.variant_name;
      selectVariant.selectId = selectVariant.option_id;

      return selectVariant;
    });

    return newProductOption;
  });

  return newProductOptions;
};

const convertProductVariants = (oldProductVariants) => {
  const featureStyleValues = {
    dropdown_images: 'I',
    dropdown_labels: 'S',
    dropdown: 'S',
  };

  if (oldProductVariants) {
    const newProductVariants = Object.keys(oldProductVariants).map(
      (variant) => {
        const newProductVariant = { ...oldProductVariants[variant] };
        newProductVariant.selectTitle =
          oldProductVariants[variant].internal_name;
        newProductVariant.selectDefaultId =
          oldProductVariants[variant].variant_id;
        newProductVariant.option_type =
          featureStyleValues[oldProductVariants[variant].feature_style];

        newProductVariant.selectVariants = Object.keys(
          oldProductVariants[variant].variants,
        ).map((variantId) => {
          const selectVariant = {
            ...oldProductVariants[variant].variants[variantId],
          };
          selectVariant.selectVariantName = selectVariant.variant;
          if (selectVariant.product?.main_pair?.detailed?.image_path) {
            selectVariant.selectImgPath =
              selectVariant.product.main_pair.detailed.image_path;
          }
          selectVariant.selectValue = selectVariant.variant;
          selectVariant.selectId = selectVariant.variant_id;
          return selectVariant;
        });

        return newProductVariant;
      },
    );

    return newProductVariants;
  }

  return [];
};

export function fetch(pid) {
  return (dispatch) => {
    dispatch({
      type: FETCH_ONE_PRODUCT_REQUEST,
      payload: {
        pid,
      },
    });

    return Api.get(`/sra_products/${pid}`)
      .then((response) => {
        response.data = filterFeaturesAndVariations(response.data);

        response.data.convertedOptions = convertProductOptions(
          response.data.product_options,
        );

        response.data.convertedVariants = convertProductVariants(
          response.data.variation_features_variants,
        );

        dispatch({
          type: FETCH_ONE_PRODUCT_SUCCESS,
          payload: {
            product: response.data,
            pid,
          },
        });
        // Load discussion if it is not disabled.
        if (response.data.discussion_type !== DISCUSSION_DISABLED) {
          setTimeout(() => fetchDiscussion(pid)(dispatch), 100);
        }
        return response;
      })
      .catch((error) => {
        dispatch({
          type: FETCH_ONE_PRODUCT_FAIL,
          payload: {
            pid,
          },
          error,
        });
      });
  };
}

export function fetchProductOffers(pid) {
  return (dispatch) => {
    dispatch({ type: FETCH_COMMON_PRODUCTS_REQUEST });

    return Api.get(
      `/sra_products/?vendor_products_by_product_id=${pid}&sort_by=price`,
    )
      .then((response) => {
        dispatch({
          type: FETCH_COMMON_PRODUCTS_SUCCESS,
        });
        return response;
      })
      .catch((error) => {
        dispatch({
          type: FETCH_COMMON_PRODUCTS_FAIL,
          error,
        });
      });
  };
}

export function search(params = {}) {
  return (dispatch) => {
    dispatch({ type: SEARCH_PRODUCTS_REQUEST });

    return Api.get('/sra_products', {
      params: {
        items_per_page: 50,
        ...params,
      },
    })
      .then((response) => {
        dispatch({
          type: SEARCH_PRODUCTS_SUCCESS,
          payload: response.data,
        });
      })
      .catch((error) => {
        dispatch({
          type: SEARCH_PRODUCTS_FAIL,
          error,
        });
      });
  };
}

export function fetchByCategory(
  categoryId,
  page = 1,
  companyId = false,
  advParams = {},
) {
  const params = {
    page,
    subcats: 'Y',
    items_per_page: 10,
    company_id: companyId || '',
    get_filters: true,
    ...advParams,
  };

  return (dispatch) => {
    dispatch({ type: FETCH_PRODUCTS_REQUEST });
    return Api.get(`/categories/${categoryId}/sra_products`, { params })
      .then((response) => {
        dispatch({
          type: FETCH_PRODUCTS_SUCCESS,
          payload: response.data,
        });
      })
      .catch((error) => {
        dispatch({
          type: FETCH_PRODUCTS_FAIL,
          error,
        });
      });
  };
}

export function changeSort(params) {
  return (dispatch) => {
    dispatch({
      type: CHANGE_PRODUCTS_SORT,
      payload: params,
    });
  };
}
