import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Button,
} from 'react-native';
import EStyleSheet from 'react-native-extended-stylesheet';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Import actions.
import * as ordersActions from '../actions/ordersActions';
import * as cartActions from '../actions/cartActions';
import * as paymentsActions from '../actions/paymentsActions';

// Components
import StepByStepSwitcher from '../components/StepByStepSwitcher';
import CartFooter from '../components/CartFooter';
import FormBlock from '../components/FormBlock';
import PaymentPhoneForm from '../components/PaymentPhoneForm';
import PaymentCreditCardForm from '../components/PaymentCreditCardForm';
import PaymentEmpty from '../components/PaymentEmpty';
import PaymentCheckForm from '../components/PaymentCheckForm';
import PaymentPaypalForm from '../components/PaymentPaypalForm';
import PaymentYandexKassaForm from '../components/PaymentYandexKassaForm';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import { stripTags, formatPrice } from '../utils';
import i18n from '../utils/i18n';
import * as nav from '../services/navigation';
import reactotron from 'reactotron-react-native';
import Axios from 'axios';
global.PaymentRequest = require('react-native-payments').PaymentRequest;
import { ApplePayButton } from 'react-native-payments';
import qs from 'qs';

const styles = EStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  paymentItemWrapper: {
    paddingLeft: 14,
    paddingRight: 14,
    marginTop: 10,
  },
  paymentItem: {
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#F1F1F1',
    backgroundColor: '#fff',
    flexDirection: 'row',
  },
  paymentItemText: {
    fontSize: '0.9rem',
  },
  paymentItemDesc: {
    fontSize: '0.8rem',
    paddingBottom: 6,
    color: 'gray',
    marginTop: 10,
  },
  uncheckIcon: {
    fontSize: '1rem',
    marginRight: 6,
  },
  checkIcon: {
    fontSize: '1rem',
    marginRight: 6,
  },
  stepsWrapper: {
    padding: 14,
  },
});

const TPL_CREDIT_CARD = 'views/orders/components/payments/cc.tpl';
const TPL_EMPTY = 'views/orders/components/payments/empty.tpl';
const TPL_CHECK = 'views/orders/components/payments/check.tpl';
const TPL_PHONE = 'views/orders/components/payments/phone.tpl';
const SUPPORTED_PAYMENT_TPLS = [
  TPL_CREDIT_CARD,
  TPL_EMPTY,
  TPL_CHECK,
  TPL_PHONE,
];

const SCRIPT_YOOKASSA = 'yandex_checkout.php';
const SCRIPT_YOOKASSA_FOR_MARKETPLACES = 'yandex_checkout_for_marketplaces.php';
const SCRIPT_YOOKASSA_LEGACY = 'yandex_money.php';
const SCRIPT_PAYPAL_EXPRESS = 'paypal_express.php';
const SCRIPT_TELR_HOSTED_PAYMENT = 'telr_hosted_payment.php';
const SUPPORTED_PAYMENT_SCRIPTS = [
  SCRIPT_YOOKASSA,
  SCRIPT_YOOKASSA_FOR_MARKETPLACES,
  SCRIPT_YOOKASSA_LEGACY,
  SCRIPT_PAYPAL_EXPRESS,
  SCRIPT_TELR_HOSTED_PAYMENT
];







/**
 * Checkout. Payment screen.
 *
 * @reactProps {object} cart - Cart information.
 * @reactProps {object} cartActions - Cart actions.
 * @reactProps {object} paymentsActions - Payments actions.
 * @reactProps {object} ordersActions - Orders actions.
 * @reactProps {string} shipping_id - Shipping id.
 */
export class CheckoutPayment extends Component {
  static propTypes = {
    cart: PropTypes.shape({
      items: PropTypes.arrayOf(PropTypes.object),
      fetching: PropTypes.bool,
    }),
    paymentsActions: PropTypes.shape({
      settlements: PropTypes.func,
      applePayComplete: PropTypes.func
    }),
    ordersActions: PropTypes.shape({
      create: PropTypes.func,
    }),
    shipping_id: PropTypes.string,
    cartActions: PropTypes.shape({}),
  };

  constructor(props) {
    super(props);

    this.state = {
      fetching: false,
      selectedItem: null,
      items: [],
    };
  }

  /**
   * Defines the available payment methods.
   */
  componentDidMount() {
    const { cart } = this.props;
    console.log(cart.payments);
    const items = Object.keys(cart.payments)
      .map((k) => cart.payments[k])
      .filter(
        (p) =>
          SUPPORTED_PAYMENT_TPLS.includes(p.template) ||
          SUPPORTED_PAYMENT_SCRIPTS.includes(p.script),
      );

      console.log(items);
    // FIXME: Default selected payment method.
    const selectedItem = items[0];

    this.setState({
      items,
      selectedItem,
    });
  }

  /**
   * Place order button.
   */
  handlePlaceOrder() {
    const { selectedItem } = this.state;
    if (!selectedItem) {
      return null;
    }

    if (SUPPORTED_PAYMENT_SCRIPTS.includes(selectedItem.script)) {
      return this.placeSettlements();
    }

    return this.placeOrderAndComplete();
  }

  /**
   * Redirects to CheckoutComplete.
   */
  placeOrderAndComplete() {
    const { cart, ordersActions, cartActions, storeCart } = this.props;
    let { shipping_id } = this.props;
    const values = this.paymentFormRef.getValue();

    if (!values) {
      return null;
    }

    this.setState({
      fetching: true,
    });

    if (!cart?.isShippingRequired) {
      shipping_id = 0;
    }

    const orderInfo = {
      products: {},
      coupon_codes: Object.keys(cart.coupons),
      shipping_id,
      payment_id: this.state.selectedItem.payment_id,
      user_data: cart.user_data,
      ...values,
    };
    Object.keys(cart.products).map((key) => {
      const p = cart.products[key];
      orderInfo.products[p.product_id] = {
        product_id: p.product_id,
        amount: p.amount,
        product_options: p.product_options,
      };
      return orderInfo;
    });

    if (values.phone) {
      orderInfo.payment_info = {
        ...orderInfo.payment_info,
        customer_phone: values.phone,
      };
    } else if (values.cardNumber) {
      orderInfo.payment_info = {
        ...orderInfo.payment_info,
        card_number: values.cardNumber,
        expiry_month: values.expiryMonth,
        expiry_year: values.expiryYear,
        cardholder_name: values.cardholderName,
        cvv2: values.ccv,
      };
    }

    ordersActions
      .create(orderInfo)
      .then(({ data }) => {
        this.setState({
          fetching: false,
        });
        if (!data) {
          return;
        }
        cartActions.clear(cart, storeCart.coupons);
        nav.pushCheckoutComplete(this.props.componentId, {
          orderId: data.order_id,
        });
      })
      .catch(() => {
        this.setState({
          fetching: false,
        });
      });
    return null;
  }

  /**
   * Redirects to SettlementsCompleteWebView.
   */
  placeSettlements() {
    const { cart, shipping_id, ordersActions, paymentsActions } = this.props;

    const orderInfo = {
      products: {},
      coupon_codes: cart.coupons,
      shipping_id,
      payment_id: this.state.selectedItem.payment_id,
      user_data: cart.user_data,
    };
    Object.keys(cart.products).map((key) => {
      const p = cart.products[key];
      orderInfo.products[p.product_id] = {
        product_id: p.product_id,
        amount: p.amount,
      };
      return orderInfo;
    });

    this.setState({
      fetching: true,
    });

    ordersActions
      .create(orderInfo)
      .then(({ data }) => {
        this.setState({
          fetching: false,
        });

        if (!data) {
          return;
        }

        let productNames = [];

        let productIds= Object.keys(data.order_data.products);

        productIds.map(prod => {
          productNames.push(data.order_data.products[prod].product)
        })
        


        var description = productNames.join()

        const settlementData = {
          order_id: data.order_id,
          ivp_amount: data.order_data.total,
          ivp_currency : data.order_data.secondary_currency,
          bill_fname: data.order_data.b_firstname,
          bill_sname: data.order_data.b_lastname,
          bill_addr1: data.order_data.b_address,
          bill_addr2: data.order_data.b_address_2,
          bill_city: data.order_data.b_city,
          bill_region: data.order_data.b_state,
          bill_zip: data.order_data.b_zipcode,
          bill_country: data.order_data.b_country,
          bill_email: data.order_data.email,
          ivp_lang: data.order_data.lang_code,
          goods_desc : description
        }

        reactotron.log(settlementData)

        /*const settlementData = {
          order_id: data.order_id,
          replay: false,
        };*/
        paymentsActions.settlements(settlementData).then((response) => {
          //reactotron.log({settlementData, data, cart, order: response.data.order })
          nav.pushSettlementsCompleteWebView(this.props.componentId, {
            title: this.state.selectedItem.payment,
            orderId: data.order_id,
            cart,
            ...response.data.order,
          });
        });
      })
      .catch(() => {
        this.setState({
          fetching: false,
        });
      });
    return null;
  }

  /**
   * Renders payment methods.
   *
   * @param {object} item - Payment method information.
   *
   * @return {JSX.Element}
   */
  renderItem = (item) => {
    const { payment } = this.state.selectedItem;
    // FIXME compare by name.
    const isSelected = item.payment === payment;
    return (
      <TouchableOpacity
        style={styles.paymentItem}
        onPress={() => {
          this.setState(
            {
              selectedItem: item,
            },
            () => {
              this.listView.scrollToOffset({ x: 0, y: 0, animated: true });
            },
          );
        }}>
        {isSelected ? (
          <Icon name="radio-button-checked" style={styles.checkIcon} />
        ) : (
          <Icon name="radio-button-unchecked" style={styles.uncheckIcon} />
        )}
        <Text style={styles.paymentItemText}>{stripTags(item.payment)}</Text>
      </TouchableOpacity>
    );
  };

  /**
   * Renders header.
   *
   * @return {JSX.Element}
   */
  renderHeader = () => {
    const { currentStep } = this.props;
    return (
      <View style={styles.stepsWrapper}>
        <StepByStepSwitcher currentStep={currentStep} />
      </View>
    );
  };

  /**
   * Renders form fields.
   *
   * @return {JSX.Element}
   */
  renderFooter() {
    const { cart } = this.props;
    const { selectedItem } = this.state;
    if (!selectedItem) {
      return null;
    }
    let form = null;
    // FIXME: HARDCODE
    switch (selectedItem.template) {
      case TPL_EMPTY:
        form = (
          <PaymentEmpty
            onInit={(ref) => {
              this.paymentFormRef = ref;
            }}
          />
        );
        break;
      case TPL_CREDIT_CARD:
        form = (
          <PaymentCreditCardForm
            onInit={(ref) => {
              this.paymentFormRef = ref;
            }}
          />
        );
        break;
      case TPL_CHECK:
        form = (
          <PaymentCheckForm
            onInit={(ref) => {
              this.paymentFormRef = ref;
            }}
          />
        );
        break;
      case TPL_PHONE:
        form = (
          <PaymentPhoneForm
            onInit={(ref) => {
              this.paymentFormRef = ref;
            }}
            value={{ phone: cart.user_data.b_phone }}
          />
        );
        break;

      default:
        break;
    }

    switch (selectedItem.script) {
      case SCRIPT_PAYPAL_EXPRESS:
        form = (
          <PaymentPaypalForm
            onInit={(ref) => {
              this.paymentFormRef = ref;
            }}
          />
        );
        break;
      case SCRIPT_YOOKASSA:
      case SCRIPT_YOOKASSA_FOR_MARKETPLACES:
      case SCRIPT_YOOKASSA_LEGACY:
        form = (
          <PaymentYandexKassaForm
            onInit={(ref) => {
              this.paymentFormRef = ref;
            }}
          />
        );
        break;

      default:
        break;
    }

    return (
      <View style={styles.paymentItemWrapper}>
        <FormBlock title={selectedItem.payment}>
          {form}
          <Text style={styles.paymentItemDesc}>
            {stripTags(selectedItem.instructions)}
          </Text>
        </FormBlock>
      </View>
    );
  }

  /**
   * Renders spinner.
   *
   * @return {JSX.Element}
   */
  renderSpinner = () => {
    const { fetching } = this.state;
    return <Spinner visible={fetching} mode="modal" />;
  };


  settlementApplePay = () => {
    const { cart, shipping_id, ordersActions, paymentsActions } = this.props;

    const orderInfo = {
      products: {},
      coupon_codes: cart.coupons,
      shipping_id,
      payment_id: this.state.selectedItem.payment_id,
      user_data: cart.user_data,
    };

    let appleProducts = [];
    Object.keys(cart.products).map((key) => {
      const p = cart.products[key];
      appleProducts.push({
        label: p.product,
        amount: { currency: 'SAR', value: p.display_price }
      })
      orderInfo.products[p.product_id] = {
        product_id: p.product_id,
        amount: p.amount,
      };
      return orderInfo;
    });

    appleProducts.push({
      label: 'Shipping Cost',
      amount: { currency: 'SAR', value: cart.shipping_cost }
    })

    this.setState({
      fetching: true,
    });

    ordersActions
      .create(orderInfo)
      .then(({ data }) => {
        

        if (!data) {
          return;
        }

        let productNames = [];

        let productIds= Object.keys(data.order_data.products);

        productIds.map(prod => {
          productNames.push(data.order_data.products[prod].product)
        })
        


        var description = productNames.join()

        const settlementData = {
          order_id: data.order_id,
          ivp_amount: data.order_data.total,
          ivp_currency : data.order_data.secondary_currency,
          bill_fname: data.order_data.b_firstname,
          bill_sname: data.order_data.b_lastname,
          bill_addr1: data.order_data.b_address,
          bill_addr2: data.order_data.b_address_2,
          bill_city: data.order_data.b_city,
          bill_region: data.order_data.b_state,
          bill_zip: data.order_data.b_zipcode,
          bill_country: data.order_data.b_country,
          bill_email: data.order_data.email,
          ivp_lang: data.order_data.lang_code,
          goods_desc : description
        }

        this.setState({
          fetching: false,
        });

        /*const settlementData = {
          order_id: data.order_id,
          replay: false,
        };*/
          
          /*nav.pushSettlementsCompleteWebView(this.props.componentId, {
            title: this.state.selectedItem.payment,
            orderId: data.order_id,
            cart,
            ...response.data.order,
          });*/
          reactotron.log({settlementData, data, cart, appleProducts })

          const METHOD_DATA = [{
            supportedMethods: ['apple-pay'],
            data: {
              merchantIdentifier: 'merchant.diginests.alysham',
              supportedNetworks: ['visa', 'mastercard', 'amex'],
              countryCode: settlementData?.bill_country,
              currencyCode: settlementData.ivp_currency
            }
          }];

          /*const DETAILS = {
            id: 'Payment_details',
            displayItems: appleProducts,
            total: {
              label: 'Alysham',
              amount: { currency: 'SAR', value: 1 }
              //amount: { currency: settlementData.ivp_currency, value: settlementData.ivp_amount }
            }
          };*/

          const DETAILS = {
            id: 'basic-example',
            displayItems: [
              {
                label: 'Movie Ticket',
                amount: { currency: 'SAR', value: '1.00' }
              }
            ],
            total: {
              label: 'Merchant Name',
              amount: { currency: 'SAR', value: '1.00' }
            }
          };

          //console.log({METHOD_DATA, DETAILS})

          const paymentRequest = new PaymentRequest(METHOD_DATA, DETAILS);

          reactotron.log({paymentRequest})

          paymentRequest.show()
          .then(paymentResponse => {
            reactotron.log({paymentResponse})
            this.saveResponseToServer(paymentResponse)
            const { paymentData, paymentMethod, transactionIdentifier } = paymentResponse._details
            if(paymentData){

            

            let data = {
              ivp_method: 'applepay',
              ivp_store : 23446,
              ivp_authkey: 'b3Gm#7rMdC-G3JDc',
              //ivp_amount: settlementData?.ivp_amount,
              //ivp_currency: settlementData?.ivp_currency,
              ivp_amount : "1.00",
              ivp_currency : 'SAR',
              ivp_test: 0, //1-test, 0-live
              ivp_desc: settlementData?.goods_desc,
              return_auth: "",
              return_decl: "",
              return_can: "",
              bill_fname: settlementData?.bill_fname,
              bill_sname: settlementData?.bill_sname,
              bill_addr1: settlementData?.bill_addr1,
              bill_city: settlementData?.bill_city,
              bill_region: settlementData?.bill_region,
              bill_country: settlementData?.bill_country,
              bill_zip: settlementData?.bill_zip,
              bill_email: settlementData?.bill_email,
              ivp_lang: settlementData?.ivp_lang,
              ivp_cart: settlementData?.order_id,
              ivp_trantype: "Sale",
              ivp_tranclass: "ecom",
              delv_addr1: data?.order_data?.b_address,
              delv_addr2: data?.order_data?.b_address_2,
              delv_addr3: "delv_addr3",
              delv_city: data?.order_data?.b_city,
              delv_region: data?.order_data?.b_state,
              delv_country: data?.order_data?.b_country,
              applepay_enc_version: paymentData.version,
              applepay_enc_paydata: paymentData.data,
              applepay_enc_paysig: paymentData.signature,
              applepay_enc_pubkey: paymentData.header.ephemeralPublicKey,
              applepay_enc_keyhash: paymentData.header.publicKeyHash,
              applepay_tran_id: paymentData.header.transactionId,
              applepay_card_desc: paymentMethod.type,
              applepay_card_scheme: paymentMethod.displayName,
              applepay_card_type: paymentMethod.network,
              applepay_tran_id2: transactionIdentifier,

            }
        
          
            //this.saveResponseToServer(data)

            const config = {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }

            Axios.post("https://secure.telr.com/gateway/remote.json", qs.stringify(data), config)
              .then((result) => {
                // Do somthing
                let appledata = {
                  order_id: settlementData?.order_id,
                  paymentResponse: result.data
                }
                
                //this.saveResponseToServer(result.data)
                //console.log({result})
                if(result?.data?.transaction?.status === 'A'){
                  paymentResponse.complete('success');
                  cartActions.clear(cart);
                  nav.pushCheckoutComplete(this.props.componentId, { orderId: settlementData?.order_id });
                }
                else{
                  
                  paymentResponse.complete('fail');
                }

                paymentsActions.applePayComplete(appledata).then((response) => {
                  //reactotron.log({settlementData, data, cart, order: response.data.order })
                });
                
              })
              .catch((err) => {
                // Do somthing
                console.log({err})
                //this.saveResponseToServer(err)
              })
            }
            else{
              paymentResponse.complete('fail');
            }
          })
          .catch(err => {
            paymentResponse.complete('fail');
            reactotron.log({err});
          })
      })
      .catch(() => {
        this.setState({
          fetching: false,
        });
      });
  }


  saveResponseToServer = (data) => {
    console.log({data})
    Axios.post('https://caitlin.diginestsolutions.in/public/api/customer/apple-pay', {
        paymentResponse: data
      })
      .then(function (response) {
        //console.log(response);
      })
      .catch(function (error) {
        //console.log(error);
      });
  }

  /**
   * Renders component
   *
   * @return {JSX.Element}
   */
  render() {
    const { cart } = this.props;

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAwareScrollView>
          <FlatList
            ref={(ref) => {
              this.listView = ref;
            }}
            contentContainerStyle={styles.contentContainer}
            ListHeaderComponent={() => this.renderHeader()}
            ListFooterComponent={() => this.renderFooter()}
            data={this.state.items}
            keyExtractor={(item, index) => `${index}`}
            numColumns={1}
            renderItem={({ item, index }) => this.renderItem(item, index)}
          />
          </KeyboardAwareScrollView>
        <View style={{ padding: 10 }}>
          <ApplePayButton
            key="first"
            onPress={this.settlementApplePay}
        />
          </View>
        <CartFooter
          totalPrice={formatPrice(cart.total_formatted.price)}
          btnText={i18n.t('Place order').toUpperCase()}
          isBtnDisabled={false}
          onBtnPress={() => this.handlePlaceOrder()}
        />
        {this.renderSpinner()}
      </SafeAreaView>
    );
  }
}

export default connect(
  (state) => ({
    auth: state.auth,
    storeCart: state.cart,
  }),
  (dispatch) => ({
    ordersActions: bindActionCreators(ordersActions, dispatch),
    cartActions: bindActionCreators(cartActions, dispatch),
    paymentsActions: bindActionCreators(paymentsActions, dispatch),
  }),
)(CheckoutPayment);
