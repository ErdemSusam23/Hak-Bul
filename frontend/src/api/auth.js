import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authClient = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// POST /auth/register
export async function kayitOl({ email, sifre }) {
    const { data } = await authClient.post('/auth/register', {
        email,
        password: sifre,
    });
    return data; // { id, email, role }
}

// POST /auth/login
export async function girisYap({ email, sifre }) {
    const { data } = await authClient.post('/auth/login', {
        email,
        password: sifre,
    });
    return data; // { access_token, refresh_token, token_type }
}

// POST /auth/refresh
export async function tokenYenile(refreshToken) {
    const { data } = await authClient.post('/auth/refresh', {
        refresh_token: refreshToken,
    });
    return data; // { access_token, refresh_token, token_type }
}

// POST /auth/logout
export async function cikisYap(refreshToken) {
    await authClient.post('/auth/logout', { refresh_token: refreshToken });
}
