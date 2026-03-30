export const destekSoruBankasi = {
    tr: [
        {
            id: 'quick-search',
            question: 'Kanun maddesi veya dava numarası nasıl ararım?',
            answer:
                '**Hızlı Ara** alanını kullanın. Sağ üstte yer alan arama kutusuna örneğin `4857 Md.17` veya bir dava numarası yazabilirsiniz. Sistem eşleşen kanun ve karar sonuçlarını listeler.',
            keywords: ['hızlı ara', 'madde ara', 'dava no', 'arama', 'kanun maddesi', 'karar ara'],
        },
        {
            id: 'sources',
            question: 'Yanıtlardaki kanun ve Yargıtay kartları neyi gösterir?',
            answer:
                'Yanıtların altındaki kaynak kartları, cevabın dayandığı mevzuat veya karar özetlerini gösterir. **Mavi tonlar** kanun kaynaklarını, **amber tonlar** Yargıtay kararlarını ayırt etmek için kullanılır.',
            keywords: ['kaynak kartı', 'yargıtay kartı', 'kanun kartı', 'kaynaklar', 'renkler'],
        },
        {
            id: 'templates',
            question: 'Belge taslağı nasıl oluştururum?',
            answer:
                'Sol menüden **Belge Taslakları** bölümüne girin. Bir şablon seçip alanları doldurduğunuzda sistem belgeyi sizin için hazırlar. Uygun hesap yetkisiyle PDF olarak da indirebilirsiniz.',
            keywords: ['belge taslağı', 'taslak', 'pdf', 'dilekçe', 'şablon'],
        },
        {
            id: 'compare',
            question: 'İki belgeyi nasıl karşılaştırırım?',
            answer:
                'Sol menüdeki **Belge Karşılaştır** ekranına gidin. İki dosyayı yükleyip isterseniz özel bir karşılaştırma sorusu ekleyebilirsiniz. Sistem farkları ve önemli noktaları tek ekranda gösterir.',
            keywords: ['karşılaştır', 'iki belge', 'pdf karşılaştır', 'fark'],
        },
        {
            id: 'history-actions',
            question: 'Eski sohbetleri nasıl silebilir veya paylaşabilirim?',
            answer:
                'Sol taraftaki sohbet geçmişinde her konuşmanın yanında hızlı **silme** ikonu bulunur. Ek işlemler için yanındaki menüden paylaşma, yeniden adlandırma ve PDF indirme seçeneklerine ulaşabilirsiniz.',
            keywords: ['sohbet sil', 'sohbet paylaş', 'eski sohbet', 'pdf indir', 'yeniden adlandır'],
        },
        {
            id: 'profile',
            question: 'Profil ve şifre bilgilerimi nereden güncellerim?',
            answer:
                '**Profilim** sayfasından e-posta ve şifre ayarlarınızı güncelleyebilirsiniz. Şifre değiştirirken mevcut şifrenizi doğrulamanız gerekir.',
            keywords: ['profil', 'şifre', 'hesap', 'e-posta', 'ayarlar'],
        },
        {
            id: 'forum',
            question: 'Forum bölümü ne işe yarar?',
            answer:
                'Forum, kullanıcıların başlık açıp deneyim paylaşabildiği topluluk alanıdır. Burada soru sorabilir, yanıtları okuyabilir ve doğrulanmış içerikleri takip edebilirsiniz.',
            keywords: ['forum', 'topluluk', 'başlık', 'yanıt', 'paylaşım'],
        },
        {
            id: 'admin',
            question: 'Admin paneline kimler erişebilir?',
            answer:
                'Admin ekranı yalnızca **admin rolüne** sahip hesaplarda görünür. Normal kullanıcılar bu alanı göremez ve ilgili endpointlere erişemez.',
            keywords: ['admin', 'rol', 'yetki', 'panel', 'erişim'],
        },
        {
            id: 'scope',
            question: 'Bu sağ alttaki destek botu neye cevap verir?',
            answer:
                'Bu widget artık genel hukuki danışmanlık vermez. Sadece ürün kullanımı ve önceden tanımlanmış yardım sorularına yanıt verir. Uygun soru bulunamazsa sizi çevrim içi desteğe yönlendirir.',
            keywords: ['bu bot', 'destek botu', 'neye cevap verir', 'hukuki danışmanlık', 'yardım'],
        },
    ],
    en: [
        {
            id: 'quick-search',
            question: 'How do I search by law article or case number?',
            answer:
                'Use the **Quick Search** field in the top-right area. You can type something like `Labor Law Art.17` or a case number, and the system will list matching laws and decisions.',
            keywords: ['quick search', 'article search', 'case number', 'law search', 'search'],
        },
        {
            id: 'sources',
            question: 'What do the law and Supreme Court source cards mean?',
            answer:
                'The source cards below answers show the legal materials behind the response. **Blue cards** represent laws, while **amber cards** help distinguish Supreme Court decisions.',
            keywords: ['source cards', 'supreme court', 'law cards', 'sources', 'colors'],
        },
        {
            id: 'templates',
            question: 'How do I create a document draft?',
            answer:
                'Open **Document Templates** from the sidebar. Choose a template, fill in the fields, and the system will prepare the document for you. With the proper access, you can also download it as PDF.',
            keywords: ['document template', 'draft', 'pdf', 'petition', 'template'],
        },
        {
            id: 'compare',
            question: 'How do I compare two documents?',
            answer:
                'Go to **Compare Documents** from the sidebar. Upload two files and optionally add a custom comparison question. The system will show the main differences in one place.',
            keywords: ['compare', 'two documents', 'pdf compare', 'difference'],
        },
        {
            id: 'history-actions',
            question: 'How can I delete or share old chats?',
            answer:
                'Each conversation in the left sidebar now has a quick **delete** icon. For more actions, use the nearby menu to share, rename, or export the chat as PDF.',
            keywords: ['delete chat', 'share chat', 'old chats', 'pdf export', 'rename'],
        },
        {
            id: 'profile',
            question: 'Where can I update my profile and password?',
            answer:
                'You can manage your email and password from the **My Profile** page. Changing the password requires confirming your current password.',
            keywords: ['profile', 'password', 'account', 'email', 'settings'],
        },
        {
            id: 'forum',
            question: 'What is the forum section for?',
            answer:
                'The forum is the community area where users can open topics and share experiences. You can read replies, ask questions, and follow verified content there.',
            keywords: ['forum', 'community', 'topic', 'reply', 'sharing'],
        },
        {
            id: 'admin',
            question: 'Who can access the admin panel?',
            answer:
                'The admin screen is visible only to accounts with the **admin** role. Regular users cannot open it or access the related endpoints.',
            keywords: ['admin', 'role', 'permission', 'panel', 'access'],
        },
        {
            id: 'scope',
            question: 'What does this support bot answer?',
            answer:
                'This widget no longer provides open-ended legal guidance. It only answers product-help questions from the approved support bank. If nothing matches, it sends you to online support.',
            keywords: ['support bot', 'what can it answer', 'legal advice', 'help', 'scope'],
        },
    ],
};
