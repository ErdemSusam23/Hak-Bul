const LOGIN_MODE = 'login';
const REGISTER_MODE = 'register';

export async function submitAuthModal({
    mode,
    email,
    password,
    confirm,
    giris,
    kayit,
}) {
    if (!email || !password) {
        return {
            shouldClose: false,
            error: 'E-posta ve şifre zorunludur.',
            success: '',
            nextMode: mode === REGISTER_MODE ? REGISTER_MODE : LOGIN_MODE,
        };
    }

    if (mode === REGISTER_MODE && password !== confirm) {
        return {
            shouldClose: false,
            error: 'Şifreler eşleşmiyor.',
            success: '',
            nextMode: REGISTER_MODE,
        };
    }

    if (mode === LOGIN_MODE) {
        const result = await giris(email, password);
        return {
            shouldClose: !!result?.basarili,
            error: result?.basarili ? '' : (result?.mesaj || 'İşlem başarısız. Lütfen tekrar deneyin.'),
            success: '',
            nextMode: LOGIN_MODE,
        };
    }

    const result = await kayit(email, password);
    return {
        shouldClose: false,
        error: result?.basarili ? '' : (result?.mesaj || 'İşlem başarısız. Lütfen tekrar deneyin.'),
        success: result?.basarili ? 'Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.' : '',
        nextMode: result?.basarili ? LOGIN_MODE : REGISTER_MODE,
    };
}
