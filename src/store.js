import { applyMiddleware, createStore, compose } from 'redux';
import AsyncStorage from '@react-native-community/async-storage';
import thunk from 'redux-thunk';
import logger from 'redux-logger';
import { STORE_KEY } from './constants';

import { rootReducer } from './reducers';
import Reactotron from './ReactotronConfig';

const middlewares = [thunk];

// Apply logger if we are in debug mode.
if (__DEV__) {
  middlewares.push(logger);
}

const store = createStore(
  rootReducer,
  compose(applyMiddleware(...middlewares), Reactotron.createEnhancer()));

//const store = createStore(reducer, compose(applyMiddleware(...middleware), Reactotron.createEnhancer()));


store.subscribe(() => {
  AsyncStorage.setItem(
    STORE_KEY,
    JSON.stringify({
      auth: store.getState().auth,
      cart: store.getState().cart,
      profile: store.getState().profile,
      settings: {
        ...store.getState().settings,
        languageCurrencyFeatureFlag: true,
        isShopClosed: false,
      },
    }),
  );
});

export default store;
