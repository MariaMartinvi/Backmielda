import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.micuentacuentos.app',
  appName: 'AudioGretel',
  webDir: 'Cuentos_Front_Clean/build',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: 'android/app/keystore.jks',
      keystorePassword: 'your_keystore_password',
      keystoreAlias: 'your_keystore_alias',
      keystoreAliasPassword: 'your_alias_password'
    }
  }
};

export default config; 