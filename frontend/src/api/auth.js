import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authClient = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,  // Required for httpOnly cookie-based refresh token
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

// POST /auth/refresh — uses httpOnly cookie automatically (withCredentials: true)
export async function tokenYenile() {
    const { data } = await authClient.post('/auth/refresh');
    return data; // { access_token, token_type, role }
}

export async function oturumProfiliGetir(accessToken) {
    const { data } = await authClient.get('/auth/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
}

// POST /auth/logout — uses httpOnly cookie automatically
export async function cikisYap() {
    await authClient.post('/auth/logout');
}
