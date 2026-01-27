#!/usr/bin/env node
/**
 * Extract LTK Authentication Tokens
 * 
 * Run this in the browser console on creator.shopltk.com or www.shopltk.com
 * 
 * Copy-paste the entire script, then check the output for tokens.
 */

(function() {
  console.log('🔍 LTK Auth Token Extractor\n');
  console.log('='.repeat(50));
  
  // 1. Check cookies
  console.log('\n📋 Cookies:');
  const cookies = document.cookie.split(';').map(c => c.trim());
  const authCookies = cookies.filter(c => 
    c.toLowerCase().includes('auth') || 
    c.toLowerCase().includes('token') ||
    c.toLowerCase().includes('ltk') ||
    c.toLowerCase().includes('id_token')
  );
  
  if (authCookies.length > 0) {
    authCookies.forEach(c => {
      const [name, ...valueParts] = c.split('=');
      const value = valueParts.join('=');
      console.log(`  ✅ ${name}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
    });
  } else {
    console.log('  ⚠️  No auth-related cookies found in document.cookie');
    console.log('  (They might be httpOnly - check Application tab → Cookies)');
  }
  
  // 2. Check localStorage
  console.log('\n💾 localStorage:');
  const localStorageKeys = Object.keys(localStorage).filter(k => 
    k.toLowerCase().includes('auth') || 
    k.toLowerCase().includes('token') ||
    k.toLowerCase().includes('ltk')
  );
  
  if (localStorageKeys.length > 0) {
    localStorageKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`  ✅ ${key}: ${value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : '(empty)'}`);
    });
  } else {
    console.log('  ⚠️  No auth-related localStorage keys found');
  }
  
  // 3. Check sessionStorage
  console.log('\n🗂️  sessionStorage:');
  const sessionStorageKeys = Object.keys(sessionStorage).filter(k => 
    k.toLowerCase().includes('auth') || 
    k.toLowerCase().includes('token') ||
    k.toLowerCase().includes('ltk')
  );
  
  if (sessionStorageKeys.length > 0) {
    sessionStorageKeys.forEach(key => {
      const value = sessionStorage.getItem(key);
      console.log(`  ✅ ${key}: ${value ? value.substring(0, 50) + (value.length > 50 ? '...' : '') : '(empty)'}`);
    });
  } else {
    console.log('  ⚠️  No auth-related sessionStorage keys found');
  }
  
  // 4. Check for Auth0 in window
  console.log('\n🌐 Window objects:');
  if (window.auth0) {
    console.log('  ✅ window.auth0 found');
  }
  if (window.__AUTH0_CLIENT__) {
    console.log('  ✅ window.__AUTH0_CLIENT__ found');
  }
  
  // 5. Instructions
  console.log('\n📝 Next steps:');
  console.log('  1. Open DevTools → Application tab → Cookies');
  console.log('  2. Look for cookies on creator.shopltk.com or .shopltk.com');
  console.log('  3. Check for: auth0, _id_token, access_token, etc.');
  console.log('  4. Open Network tab → Filter by "api" or "gateway"');
  console.log('  5. Click a request → Headers → Look for Authorization header');
  console.log('  6. Copy the Bearer token value');
  
  console.log('\n' + '='.repeat(50));
  
  // Return object with found values (for easy copy)
  return {
    cookies: authCookies,
    localStorage: localStorageKeys.reduce((acc, k) => {
      acc[k] = localStorage.getItem(k);
      return acc;
    }, {}),
    sessionStorage: sessionStorageKeys.reduce((acc, k) => {
      acc[k] = sessionStorage.getItem(k);
      return acc;
    }, {}),
  };
})();
