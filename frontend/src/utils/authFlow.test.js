import test from 'node:test';
import assert from 'node:assert/strict';

import { submitAuthModal } from './authFlow.js';

test('submitAuthModal logs in by calling giris with email and password positional arguments', async () => {
    const calls = [];
    const giris = async (...args) => {
        calls.push(args);
        return { basarili: true };
    };

    const result = await submitAuthModal({
        mode: 'login',
        email: 'avukat@example.com',
        password: 'Sifre123',
        confirm: '',
        giris,
        kayit: async () => ({ basarili: true }),
    });

    assert.deepEqual(calls, [['avukat@example.com', 'Sifre123']]);
    assert.deepEqual(result, { shouldClose: true, error: '', success: '', nextMode: 'login' });
});

test('submitAuthModal keeps the modal open and switches back to login after successful registration', async () => {
    const calls = [];
    const kayit = async (...args) => {
        calls.push(args);
        return { basarili: true };
    };

    const result = await submitAuthModal({
        mode: 'register',
        email: 'yeni@example.com',
        password: 'Sifre123',
        confirm: 'Sifre123',
        giris: async () => ({ basarili: true }),
        kayit,
    });

    assert.deepEqual(calls, [['yeni@example.com', 'Sifre123']]);
    assert.equal(result.shouldClose, false);
    assert.equal(result.nextMode, 'login');
    assert.match(result.success, /giriş/i);
    assert.equal(result.error, '');
});

test('submitAuthModal surfaces failed login messages without closing the modal', async () => {
    const result = await submitAuthModal({
        mode: 'login',
        email: 'avukat@example.com',
        password: 'yanlis123',
        confirm: '',
        giris: async () => ({ basarili: false, mesaj: 'E-posta veya şifre hatalı.' }),
        kayit: async () => ({ basarili: true }),
    });

    assert.deepEqual(result, {
        shouldClose: false,
        error: 'E-posta veya şifre hatalı.',
        success: '',
        nextMode: 'login',
    });
});
