/**
 * Test for post-generation validation (fixLocatorMismatches + fixTestMismatches)
 */

// We'll test the validation logic by simulating the fix functions

function fixLocatorMismatches(locContent: string, pageContent: string, locConstName: string): string {
  const locatorRegex = /^\s+([A-Z][A-Z_0-9]+)\s*:/gm;
  const definedLocators = new Set<string>();
  let match;
  while ((match = locatorRegex.exec(locContent)) !== null) {
    definedLocators.add(match[1]);
  }

  if (definedLocators.size === 0) return pageContent;

  const refRegex = new RegExp(`${locConstName}\\.([A-Z][A-Z_0-9]+)`, "g");
  const fixedPage = pageContent.replace(refRegex, (fullMatch, locatorName) => {
    if (definedLocators.has(locatorName)) {
      return fullMatch;
    }

    const normalizedLocator = locatorName.toLowerCase();
    let bestMatch = "";
    let bestScore = 0;

    for (const definedLocator of definedLocators) {
      const normalizedDefined = definedLocator.toLowerCase();
      if (normalizedLocator === normalizedDefined) {
        return `${locConstName}.${definedLocator}`;
      }
      if (normalizedDefined.includes(normalizedLocator) || normalizedLocator.includes(normalizedDefined)) {
        const score = Math.min(normalizedLocator.length, normalizedDefined.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = definedLocator;
        }
      }
    }

    if (bestMatch) {
      return `${locConstName}.${bestMatch}`;
    }

    return fullMatch;
  });

  return fixedPage;
}

function fixTestMismatches(pageContent: string, testContent: string, singletonName: string): string {
  const methodRegex = /^\s+(?:click|type|select|check|uncheck|assert|visit|submit)\w*\s*\(/gm;
  const pageMethods = new Set<string>();
  let match;
  while ((match = methodRegex.exec(pageContent)) !== null) {
    const methodName = match[0].trim().split("(")[0].trim();
    pageMethods.add(methodName);
  }

  if (pageMethods.size === 0) return testContent;

  // Common abbreviations to expand for matching
  const abbreviations: Record<string, string> = {
    "btn": "button",
    "txt": "text",
    "inp": "input",
    "sel": "select",
    "chk": "check",
    "rm": "remove",
  };

  function expandAbbreviations(str: string): string {
    let result = str.toLowerCase();
    for (const [abbr, full] of Object.entries(abbreviations)) {
      result = result.replace(new RegExp(abbr, "g"), full);
    }
    return result;
  }

  const callRegex = new RegExp(`${singletonName}\\.([a-zA-Z]+)\\(`, "g");
  const fixedTest = testContent.replace(callRegex, (fullMatch, methodName) => {
    if (pageMethods.has(methodName)) {
      return fullMatch;
    }

    const normalizedMethod = expandAbbreviations(methodName);
    let bestMatch = "";
    let bestScore = 0;

    for (const pageMethod of pageMethods) {
      const normalizedPage = expandAbbreviations(pageMethod);
      if (normalizedMethod === normalizedPage) {
        return `${singletonName}.${pageMethod}(`;
      }
      if (normalizedPage.includes(normalizedMethod) || normalizedMethod.includes(normalizedPage)) {
        const score = Math.min(normalizedMethod.length, normalizedPage.length);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = pageMethod;
        }
      }
    }

    if (bestMatch) {
      return `${singletonName}.${bestMatch}(`;
    }

    return fullMatch;
  });

  return fixedTest;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

console.log("\n=== Testing fixLocatorMismatches ===\n");

// Test 1: Locator name mismatch should be fixed
{
  const locators = `export const TEST_LOCATORS = {
  DOWNLOAD_CENTER_BUTTON: 'button',
  DISPLAY_SETTINGS_BUTTON: 'button',
} as const;`;

  const page = `export class TestPage {
  clickDownloadCenter() {
    return cy.get(TEST_LOCATORS.DOWNLOAD_CENTER).click();
  }
  clickDisplaySettings() {
    return cy.get(TEST_LOCATORS.DISPLAY_SETTINGS).click();
  }
}`;

  const fixed = fixLocatorMismatches(locators, page, "TEST_LOCATORS");
  assert(fixed.includes("TEST_LOCATORS.DOWNLOAD_CENTER_BUTTON"), "Fixes DOWNLOAD_CENTER -> DOWNLOAD_CENTER_BUTTON");
  assert(fixed.includes("TEST_LOCATORS.DISPLAY_SETTINGS_BUTTON"), "Fixes DISPLAY_SETTINGS -> DISPLAY_SETTINGS_BUTTON");
  assert(!fixed.includes("TEST_LOCATORS.DOWNLOAD_CENTER)"), "Doesn't keep broken reference");
}

// Test 2: Already correct locators should pass through
{
  const locators = `export const TEST_LOCATORS = {
  USERNAME_INPUT: '#user',
} as const;`;

  const page = `export class TestPage {
  typeUsername() {
    return cy.get(TEST_LOCATORS.USERNAME_INPUT).type('test');
  }
}`;

  const fixed = fixLocatorMismatches(locators, page, "TEST_LOCATORS");
  assert(fixed === page, "Already correct locators pass through unchanged");
}

// Test 3: Partial match should find closest
{
  const locators = `export const TEST_LOCATORS = {
  SUBMIT_BUTTON: 'button[type="submit"]',
} as const;`;

  const page = `export class TestPage {
  clickSubmit() {
    return cy.get(TEST_LOCATORS.SUBMIT).click();
  }
}`;

  const fixed = fixLocatorMismatches(locators, page, "TEST_LOCATORS");
  assert(fixed.includes("TEST_LOCATORS.SUBMIT_BUTTON"), "Partial match finds SUBMIT_BUTTON for SUBMIT");
}

console.log("\n=== Testing fixTestMismatches ===\n");

// Test 4: Method name mismatch should be fixed
{
  const page = `export class TestPage {
  clickLoginButton() {
    return cy.get(TEST_LOCATORS.LOGIN_BUTTON).click();
  }
  clickDownloadCenter() {
    return cy.get(TEST_LOCATORS.DOWNLOAD_CENTER_BUTTON).click();
  }
}`;

  const test = `it("test", () => {
  testPage.clickLogin();
  testPage.clickDownloadCenterButton();
});`;

  const fixed = fixTestMismatches(page, test, "testPage");
  assert(fixed.includes("testPage.clickLoginButton()"), "Fixes clickLogin -> clickLoginButton");
  assert(fixed.includes("testPage.clickDownloadCenter()"), "Fixes clickDownloadCenterButton -> clickDownloadCenter");
}

// Test 5: Already correct methods should pass through
{
  const page = `export class TestPage {
  typeUsername(value) {
    return cy.get(LOCATORS.USERNAME).type(value);
  }
}`;

  const test = `it("test", () => {
  testPage.typeUsername("testuser");
});`;

  const fixed = fixTestMismatches(page, test, "testPage");
  assert(fixed === test, "Already correct methods pass through unchanged");
}

// Test 6: Type methods should be fixed
{
  const page = `export class TestPage {
  typeEmail(value) {
    return cy.get(LOCATORS.EMAIL).type(value);
  }
  typePassword(value) {
    return cy.get(LOCATORS.PASSWORD).type(value);
  }
}`;

  const test = `it("test", () => {
  testPage.typeEmailAddress("test@example.com");
  testPage.typePass("secret");
});`;

  const fixed = fixTestMismatches(page, test, "testPage");
  assert(fixed.includes("testPage.typeEmail("), "Fixes typeEmailAddress -> typeEmail");
  assert(fixed.includes("testPage.typePassword("), "Fixes typePass -> typePassword");
}

// Test 7: Mixed fixes (locator + method)
{
  const locators = `export const PAGE_LOCATORS = {
  LOGIN_BUTTON: 'button[type="submit"]',
  SUBMIT_FORM: 'button.btn',
} as const;`;

  const page = `export class Page {
  clickLoginButton() {
    return cy.get(PAGE_LOCATORS.LOGIN).click();
  }
  clickSubmitFormButton() {
    return cy.get(PAGE_LOCATORS.SUBMIT_FORM).click();
  }
}`;

  const test = `it("test", () => {
  page.clickLoginBtn();
  page.clickSubmitFormBtn();
});`;

  const fixedLocators = fixLocatorMismatches(locators, page, "PAGE_LOCATORS");
  const fixedTest = fixTestMismatches(fixedLocators, test, "page");

  assert(fixedLocators.includes("PAGE_LOCATORS.LOGIN_BUTTON"), "Locator fix: LOGIN -> LOGIN_BUTTON");
  assert(fixedTest.includes("page.clickLoginButton()"), "Method fix: clickLoginBtn -> clickLoginButton");
  assert(fixedTest.includes("page.clickSubmitFormButton()"), "Method fix: clickSubmitFormBtn -> clickSubmitFormButton");
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
