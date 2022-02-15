import {
  SET_CURRENCY,
  SET_LANGUAGE,
  GET_CURRENCIES,
  GET_LANGUAGES,
  RESTORE_STATE,
  LANGUAGE_CURRENCY_FEATURE_FLAG_OFF,
  SET_DATE_FORMAT,
  SHOP_CLOSED,
} from '../constants';

const initialState = {
  selectedCurrency: {
    symbol: '',
    currencyCode: '',
  },
  selectedLanguage: {
    langCode: '',
    name: '',
  },
  dateFormat: '',
  languageCurrencyFeatureFlag: true,
  languages: null,
  currencies: null,
  isShopClosed: false,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_CURRENCY:
      const newSelectedCurrency = {
        currencyCode: action.payload.currencyCode,
        symbol: action.payload.symbol,
      };
      return {
        ...state,
        selectedCurrency: newSelectedCurrency,
      };

    case GET_CURRENCIES:
      return {
        ...state,
        languageCurrencyFeatureFlag: true,
        currencies: action.payload.map((el) => {
          return {
            selected: el.currency_code === state.selectedCurrency.currencyCode,
            currencyCode: el.currency_code,
            symbol: el.symbol,
          };
        }),
      };

    case SET_LANGUAGE:
      const newSelectedLanguage = {
        langCode: action.payload.langCode,
        name: action.payload.name,
      };
      return {
        ...state,
        selectedLanguage: newSelectedLanguage,
      };

    case GET_LANGUAGES:
      return {
        ...state,
        languageCurrencyFeatureFlag: true,
        languages: action.payload.map((el) => {
          return {
            selected: el.lang_code === state.selectedLanguage.langCode,
            langCode: el.lang_code,
            name: el.name,
          };
        }),
      };

    case LANGUAGE_CURRENCY_FEATURE_FLAG_OFF:
      return {
        ...state,
        languageCurrencyFeatureFlag: false,
      };

    case SHOP_CLOSED:
      return {
        ...state,
        isShopClosed: true,
      };

    case RESTORE_STATE:
      return {
        ...state,
        ...action.payload.settings,
      };

    case SET_DATE_FORMAT:
      const dateFormat =
        action.payload === 'day_first' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
      return {
        ...state,
        dateFormat,
      };

    default:
      return state;
  }
}
