const firebaseRulesPlugin = require('@firebase/eslint-plugin-security-rules');

module.exports = [
  {
    ignores: ['dist/**/*']
  },
  {
    files: ['firestore.rules'],
    plugins: {
      'firebase-rules': firebaseRulesPlugin
    }
  }
];
