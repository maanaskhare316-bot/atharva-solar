/**
 * System Verification Runner - Delegates to comprehensive upgrade test suite
 */
process.chdir(__dirname);
require('./test-upgrade.js');
