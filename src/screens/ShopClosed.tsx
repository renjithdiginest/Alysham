import React from 'react';
import { View, Text } from 'react-native';
import i18n from '../utils/i18n';
import EStyleSheet from 'react-native-extended-stylesheet';

// Styles
const styles = EStyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  signWrapper: {
    height: 150,
    width: 220,
    backgroundColor: '#fe5652',
    borderRadius: '$borderRadius',
    padding: 10,
    marginVertical: 20,
  },
  signTextWrapper: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    borderWidth: 3,
    borderRadius: '$borderRadius',
    borderColor: '#fff',
  },
  signText: {
    fontSize: 30,
    fontWeight: 'normal',
    textAlign: 'center',
    color: '#fff',
  },
  message: {
    fontSize: '1rem',
    textAlign: 'center',
  },
});

export const ShopClosed = () => {
  return (
    <View style={styles.container}>
      <View style={styles.signWrapper}>
        <View style={styles.signTextWrapper}>
          <Text style={styles.signText}>{i18n.t('STORE CLOSED')}</Text>
        </View>
      </View>
      <Text style={styles.message}>
        {i18n.t('Sorry, the store is temporarily closed for maintenance.')}
      </Text>
    </View>
  );
};
