export const categories = [
  { key: 'is',       label: 'İş Hukuku',        count: 1284 },
  { key: 'medeni',   label: 'Medeni Hukuk',      count: 942  },
  { key: 'ceza',     label: 'Ceza Hukuku',       count: 611  },
  { key: 'ticaret',  label: 'Ticaret Hukuku',    count: 438  },
  { key: 'tuketici', label: 'Tüketici Hukuku',   count: 389  },
  { key: 'tasinmaz', label: 'Taşınmaz Mülk',     count: 356  },
  { key: 'idare',    label: 'İdare Hukuku',       count: 241  },
  { key: 'vergi',    label: 'Vergi Hukuku',       count: 198  },
  { key: 'sgk',      label: 'Sosyal Güvenlik',    count: 187  },
  { key: 'fikri',    label: 'Fikri Mülkiyet',     count: 112  },
  { key: 'bilisim',  label: 'Bilişim Hukuku',     count: 98   },
  { key: 'anayasa',  label: 'Anayasa Hukuku',     count: 74   },
  { key: 'usul',     label: 'Usul Hukuku',        count: 256  },
  { key: 'genel',    label: 'Genel',              count: 521  },
];

export const conversations = [
  { id: 'c1', title: 'Kiracım 2 aydır kira ödemiyor, ne yapabilirim?', date: 'Bugün',      cat: 'tasinmaz', pinned: true },
  { id: 'c2', title: 'İşten çıkarıldım, kıdem tazminatı hesabı',       date: 'Dün',        cat: 'is'        },
  { id: 'c3', title: 'Evlilik sözleşmesi (mal ayrılığı) örneği',        date: 'Dün',        cat: 'medeni'    },
  { id: 'c4', title: 'Sigortasız çalıştırma şikayeti nereye',           date: '3 gün önce', cat: 'sgk'       },
  { id: 'c5', title: 'Tüketici Hakem Heyeti başvuru süresi',            date: '5 gün önce', cat: 'tuketici'  },
  { id: 'c6', title: 'Trafik cezası itirazı usulü',                     date: '1 hafta önce', cat: 'idare'  },
  { id: 'c7', title: 'Marka tescili reddedilirse ne yapılır?',           date: '2 hafta önce', cat: 'fikri'  },
  { id: 'c8', title: 'E-ticarette cayma hakkı süresi',                  date: '3 hafta önce', cat: 'bilisim' },
];

export const suggestedQuestions = [
  { cat: 'İş Hukuku',  q: 'İşten çıkarılırken haklarım nelerdir?' },
  { cat: 'Taşınmaz',   q: 'Kiracım kira ödemediğinde ne yapabilirim?' },
  { cat: 'Medeni',     q: 'Boşanma davasında nafaka nasıl belirlenir?' },
  { cat: 'Tüketici',   q: 'Ayıplı ürün iadesi için süre ne kadar?' },
  { cat: 'Trafik',     q: 'Trafik cezasına itiraz nasıl yapılır?' },
  { cat: 'Sözleşme',   q: 'İhtarname örneğini nasıl hazırlarım?' },
];

export const sampleThread = [
  {
    role: 'user',
    text: 'Kiracım 2 aydır kira ödemiyor. Tahliye için izlemem gereken yasal süreç nedir ve ne kadar sürer?',
    time: '14:02',
  },
  {
    role: 'assistant',
    alert: true,
    time: '14:02',
    body: [
      { type: 'p', text: 'Kira alacağı ve tahliye sürecinde **iki temel yol** izlenebilir. Hangisinin sizin için uygun olduğu, kira sözleşmesinin türüne ve temerrüde düşen ay sayısına göre değişir.' },
      { type: 'h', text: '1) İcra yoluyla tahliye (30 günlük ihtar)' },
      { type: 'ul', items: [
        'İcra Müdürlüğü aracılığıyla **örnek 13 ödeme emri** gönderilir.',
        'Kiracıya **30 gün** içinde kirayı ödeme seçeneği tanınır.',
        'Süre sonunda ödeme yapılmazsa **tahliye davası** açılır.',
      ]},
      { type: 'p', text: 'TBK md. 315 uyarınca iki haklı **ihtar** koşulu sağlandığında temerrüt davası açılabilir. Ortalama süre **6–10 ay** arasıdır.' },
      { type: 'callout', text: 'Kiracıyla yazılı iletişime geçmek ve ihtarname göndermek, ileride delil olarak kullanılacaktır.' },
    ],
    sources: [
      { kind: 'law',  code: 'TBK md. 315',        title: 'Kiracının temerrüdü',       snippet: 'Kiracı, kiralananın tesliminden sonra muaccel olan kira bedelini veya yan gideri ödeme borcunu ifa etmezse…' },
      { kind: 'law',  code: 'İİK md. 269',         title: 'Tahliye emri ile takip',    snippet: 'Kiralayan, kira bedelinin ödenmediği iddiasıyla icra dairesine başvurabilir…' },
      { kind: 'case', code: 'Y. 6. HD. 2022/4123', title: 'İki haklı ihtar – tahliye', snippet: 'Davacının göndermiş olduğu iki haklı ihtar şartı gerçekleşmiş bulunmakla…' },
    ],
  },
];

export const templates = [
  { id: 't1', name: 'Kira Sözleşmesi',    desc: 'Konut ve iş yeri için standart kira sözleşmesi',  icon: 'file-text',   fields: 12, popular: true },
  { id: 't2', name: 'İş Sözleşmesi',      desc: 'Belirli/belirsiz süreli iş sözleşmesi şablonu',   icon: 'briefcase',   fields: 14 },
  { id: 't3', name: 'İhtarname',          desc: 'Noter onaylı ihtarname taslağı',                   icon: 'mail',        fields: 7  },
  { id: 't4', name: 'Taahhütname',        desc: 'Mali/hukuki taahhüt belgesi',                      icon: 'book-open',   fields: 5  },
  { id: 't5', name: 'Vekaletname Talebi', desc: 'Noterden vekalet talebi örneği',                   icon: 'key-round',   fields: 6  },
  { id: 't6', name: 'Dilekçe — Genel',    desc: 'Resmi kurumlara genel başvuru dilekçesi',          icon: 'pen-line',    fields: 4  },
];

export const forumThreads = [
  { id: 'f1', title: 'Kiracım depozitomu iade etmiyor, hangi yolu izlemeliyim?', cat: 'Taşınmaz',  votes: 42, replies: 8,  author: 'Mehmet Yılmaz', time: '2 saat önce',  verified: true,  answered: true  },
  { id: 'f2', title: 'İşveren maaşı 15 gün geciktirdi, haklı fesih olur mu?',   cat: 'İş Hukuku', votes: 28, replies: 5,  author: 'Ayşe Kaya',    time: '5 saat önce',  verified: true                  },
  { id: 'f3', title: 'E-ticaret sitesinden aldığım ürün hiç gelmedi',           cat: 'Tüketici',  votes: 19, replies: 12, author: 'Burak Demir',  time: 'Dün'                                           },
  { id: 'f4', title: 'Komşumun gürültüsü için ne yapabilirim?',                 cat: 'Genel',     votes: 14, replies: 3,  author: 'Elif Şahin',   time: 'Dün'                                           },
  { id: 'f5', title: 'Trafik kazasında araç değer kaybı davası',                cat: 'Tazminat',  votes: 33, replies: 7,  author: 'Can Arslan',   time: '3 gün önce',  verified: true,  answered: true  },
  { id: 'f6', title: 'Kat malikleri kurulu toplantısı nasıl yapılır?',          cat: 'Taşınmaz',  votes: 8,  replies: 2,  author: 'Zeynep Öztürk',time: '4 gün önce'                                   },
  { id: 'f7', title: 'Miras paylaşımında saklı pay nedir?',                     cat: 'Medeni',    votes: 51, replies: 14, author: 'Murat Aydın',  time: '1 hafta önce', verified: true,  answered: true  },
];

export const forumReplies = [
  { author: 'Av. Selim Aksoy', role: 'lawyer', time: '1 saat önce',  votes: 24, verified: true,  text: 'Depozito iadesinde temel dayanağınız **TBK md. 342**. Kiracı kiralananı sözleşmede belirtilen şekilde teslim ettiyse ve ev sahibi 30 gün içinde bir itirazda bulunmadıysa depozito iade edilmelidir. İlk adım olarak **noterden ihtarname** çekmenizi öneririm.' },
  { author: 'Ayşe Kaya',       role: 'user',   time: '45 dk önce',   votes: 6,                   text: 'Bende de aynı durum oldu, ihtarnameden sonra 2 hafta içinde iade etti. Kesinlikle yazılı yoldan gidin.' },
  { author: 'Burak Demir',     role: 'user',   time: '30 dk önce',   votes: 2,                   text: 'Depozitonun faizini de isteyebiliyor musunuz? Bu konuda detay var mı?' },
];

export const adminStats = {
  cards: [
    { label: 'Toplam Kullanıcı', value: '24,318',  delta: '+12.4%', up: true  },
    { label: 'Toplam Mesaj',     value: '187,205', delta: '+8.1%',  up: true  },
    { label: 'Memnuniyet',       value: '%92.3',   delta: '+1.2 pt', up: true },
    { label: 'Aktif Oturum',     value: '1,248',   delta: '−3.4%',  up: false },
  ],
  daily: [42, 55, 48, 72, 81, 66, 93],
  dailyLabels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
  feedback: { up: 18214, down: 1506 },
  weak: [
    { q: 'Ev sahibim kapıyı çilingirle açarsa ne yapabilirim?',        score: 0.42, cat: 'Ceza'    },
    { q: 'Boşanma davasında TikTok yazışmaları delil olur mu?',        score: 0.51, cat: 'Usul'    },
    { q: 'Dolandırıcıya ödediğim kripto parayı geri alabilir miyim?',  score: 0.38, cat: 'Bilişim' },
    { q: 'Yurt dışından gelen kargoya gümrük vergisi hesabı',          score: 0.55, cat: 'Vergi'   },
  ],
  users: [
    { email: 'mehmet.yilmaz@example.com', role: 'USER',   joined: '12 Oca 2025', active: true  },
    { email: 'av.kaya@buro.com',          role: 'LAWYER', joined: '04 Şub 2025', active: true  },
    { email: 'admin@hak-bul.com',         role: 'ADMIN',  joined: '01 Oca 2025', active: true  },
    { email: 'elif.sahin@example.com',    role: 'USER',   joined: '22 Şub 2025', active: false },
    { email: 'av.ozturk@hukuk.com',       role: 'LAWYER', joined: '17 Mar 2025', active: true  },
    { email: 'burak.demir@example.com',   role: 'USER',   joined: '08 Nis 2025', active: true  },
  ],
};
