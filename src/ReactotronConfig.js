import Reactotron, { trackGlobalErrors, networking, asyncStorage } from 'reactotron-react-native'
import { reactotronRedux } from 'reactotron-redux'
import {NativeModules} from 'react-native';

let scriptHostname;
if (__DEV__) {
    const scriptURL = NativeModules.SourceCode.scriptURL;
    scriptHostname = scriptURL.split('://')[1].split(':')[0];
}

/*Reactotron
    .configure({host: scriptHostname })
    .useReactNative({
        asyncStorage: false, // there are more options to the async storage.
        networking: { // optionally, you can turn it off with false.
          ignoreUrls: /symbolicate/
        },
        editor: false, // there are more options to editor
        errors: { veto: (stackFrame) => false }, // or turn it off with false
        overlay: false, // just turning off overlay
    })
    .connect();*/

const reactotron = Reactotron
    .configure(__DEV__ && { name: 'React Native Demo', host: scriptHostname })
    .use(trackGlobalErrors())
    .use(asyncStorage())
    .use(networking())
    .use(reactotronRedux()) //  <- here i am!
    .connect() //Don't forget about me!

export default reactotron