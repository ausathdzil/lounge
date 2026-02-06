/* runner.js
 *
 * Lightweight GJS test runner.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GLib from 'gi://GLib';

let _totalPassed = 0;
let _totalFailed = 0;
let _totalSkipped = 0;
const _failures = [];

let _currentSuite = '';
let _beforeEachFn = null;
let _afterEachFn = null;
let _pendingTests = [];

/**
 * Define a test suite. Collects tests, then runs them sequentially.
 */
export async function describe(name, fn) {
    _currentSuite = name;
    _beforeEachFn = null;
    _afterEachFn = null;
    _pendingTests = [];
    print(`\n  ${name}`);

    // fn() registers tests into _pendingTests via it()/xit()
    fn();

    // Now run all collected tests sequentially
    for (const test of _pendingTests) {
        await test();
    }

    _currentSuite = '';
    _beforeEachFn = null;
    _afterEachFn = null;
    _pendingTests = [];
}

/**
 * Register a function to run before each test in the current suite.
 */
export function beforeEach(fn) {
    _beforeEachFn = fn;
}

/**
 * Register a function to run after each test in the current suite.
 */
export function afterEach(fn) {
    _afterEachFn = fn;
}

/**
 * Define a single test case. Registers the test to be run by describe().
 */
export function it(name, fn) {
    // Capture current hooks at registration time
    const before = _beforeEachFn;
    const after = _afterEachFn;
    const suite = _currentSuite;

    _pendingTests.push(async () => {
        try {
            if (before) await before();
            await fn();
            if (after) await after();
            _totalPassed++;
            print(`    ✓ ${name}`);
        } catch (e) {
            _totalFailed++;
            const label = suite ? `${suite} > ${name}` : name;
            _failures.push({ label, error: e });
            print(`    ✗ ${name}`);
            print(`      ${e.message}`);
        }
    });
}

/**
 * Skip a test.
 */
export function xit(name, _fn) {
    _pendingTests.push(async () => {
        _totalSkipped++;
        print(`    - ${name} (skipped)`);
    });
}

/**
 * Assertion helpers.
 */
export const assert = {
    equal(actual, expected, msg) {
        if (actual !== expected) {
            throw new Error(
                msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
            );
        }
    },

    deepEqual(actual, expected, msg) {
        const a = JSON.stringify(actual);
        const e = JSON.stringify(expected);
        if (a !== e) {
            throw new Error(msg || `Expected ${e}, got ${a}`);
        }
    },

    ok(value, msg) {
        if (!value) {
            throw new Error(msg || `Expected truthy value, got ${JSON.stringify(value)}`);
        }
    },

    notOk(value, msg) {
        if (value) {
            throw new Error(msg || `Expected falsy value, got ${JSON.stringify(value)}`);
        }
    },

    isNull(value, msg) {
        if (value !== null) {
            throw new Error(msg || `Expected null, got ${JSON.stringify(value)}`);
        }
    },

    isNotNull(value, msg) {
        if (value === null) {
            throw new Error(msg || `Expected non-null value`);
        }
    },

    throws(fn, msg) {
        let threw = false;
        try {
            fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(msg || 'Expected function to throw');
        }
    },

    async rejects(fn, msg) {
        let threw = false;
        try {
            await fn();
        } catch (e) {
            threw = true;
        }
        if (!threw) {
            throw new Error(msg || 'Expected async function to reject');
        }
    },

    greaterThan(actual, expected, msg) {
        if (!(actual > expected)) {
            throw new Error(msg || `Expected ${actual} > ${expected}`);
        }
    },

    includes(haystack, needle, msg) {
        if (typeof haystack === 'string') {
            if (!haystack.includes(needle)) {
                throw new Error(msg || `Expected "${haystack}" to include "${needle}"`);
            }
        } else if (Array.isArray(haystack)) {
            if (!haystack.includes(needle)) {
                throw new Error(msg || `Expected array to include ${JSON.stringify(needle)}`);
            }
        }
    },
};

/**
 * Print final results and exit with appropriate code.
 */
export function printResults() {
    print('\n  ─────────────────────────────');
    print(`  ${_totalPassed} passing`);
    if (_totalFailed > 0) print(`  ${_totalFailed} failing`);
    if (_totalSkipped > 0) print(`  ${_totalSkipped} skipped`);

    if (_failures.length > 0) {
        print('\n  Failures:\n');
        _failures.forEach((f, i) => {
            print(`  ${i + 1}) ${f.label}`);
            print(`     ${f.error.message}`);
            if (f.error.stack) {
                const frames = f.error.stack.split('\n').slice(0, 3).join('\n     ');
                print(`     ${frames}`);
            }
            print('');
        });
    }

    return _totalFailed;
}

/**
 * Create a temporary directory for test isolation.
 * Returns the path; caller is responsible for cleanup.
 */
export function makeTempDir(prefix = 'lounge-test-') {
    return GLib.Dir.make_tmp(`${prefix}XXXXXX`);
}
