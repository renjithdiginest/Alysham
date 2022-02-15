import {
  FETCH_ONE_PRODUCT_REQUEST,
  FETCH_ONE_PRODUCT_FAIL,
  FETCH_ONE_PRODUCT_SUCCESS,
  RECALCULATE_PRODUCT_PRICE_SUCCESS,
} from '../constants';

const productInstance = {
  fetching: true,
  amount: 1,
  options: [],
  convertedOptions: [],
  convertedVariants: [],
  price_formatted: {
    price: '',
  },
  list_price_formatted: {
    price: '',
  },
  taxed_price_formatted: {
    price: '',
  },
  master_product_offers_count: 0,
};

const initialState = {
  byId: {},
};

export default function (state = initialState, action) {
  switch (action.type) {
    case FETCH_ONE_PRODUCT_REQUEST:
      return {
        ...state,
        byId: {
          ...state.byId,
          [action.payload.pid]: {
            ...productInstance,
            fetching: true,
            options: [],
            list_discount_prc: 0,
            amount: 1,
            qty_step: 1,
            selectedAmount: 1,
            discount_prc: 0,
            discount: null,
            product_features: {},
          },
        },
      };

    case FETCH_ONE_PRODUCT_SUCCESS:
    case RECALCULATE_PRODUCT_PRICE_SUCCESS:
      return {
        ...state,
        byId: {
          ...state.byId,
          [action.payload.pid]: {
            ...state.byId[action.payload.pid],
            ...action.payload.product,
            options: Object.keys(action.payload.product.product_options).map(
              (k) => action.payload.product.product_options[k],
            ),
            fetching: false,
            qty_step: parseInt(action.payload.product.qty_step, 10) || 1,
            amount: parseInt(action.payload.product.amount, 10) || 0,
            selectedAmount: parseInt(action.payload.product.qty_step, 10) || 1,
          },
        },
      };

    case FETCH_ONE_PRODUCT_FAIL:
      return {
        ...state,
        byId: {
          ...state.byId,
          [action.payload.pid]: {
            ...state.byId[action.payload.pid],
            fetching: false,
          },
        },
      };

    default:
      return state;
  }
}
